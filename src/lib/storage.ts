import { DEFAULT_AFFORDABILITY, DEFAULT_CONFIG, DEFAULT_USURY_EA_PCT } from './defaults';
import { sanitizeAffordabilityInput, type AffordabilityInput } from './affordability';
import type { LoanConfig } from './credit';
import { MAX_SCENARIOS, type SavedScenario } from './scenarios';

export const STORAGE_KEY = 'analizador-credito:v1';
const STORAGE_VERSION = 1;

export interface PersistedState {
  version: number;
  config: LoanConfig;
  affordability: AffordabilityInput;
  usuryEaPct: number;
  scenarios: SavedScenario[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  return Math.round(finiteNumber(value, fallback, min, max));
}

export function sanitizeConfig(value: unknown): LoanConfig {
  if (!isRecord(value)) return { ...DEFAULT_CONFIG, costs: { ...DEFAULT_CONFIG.costs } };

  const costs = isRecord(value.costs) ? value.costs : {};
  const rawExtras = Array.isArray(value.extras) ? value.extras.slice(0, 60) : [];
  const extras = rawExtras.flatMap((item): LoanConfig['extras'] => {
    if (!isRecord(item)) return [];
    const frequency =
      item.frequency === 'once' || item.frequency === 'monthly' || item.frequency === 'annual'
        ? item.frequency
        : null;
    if (!frequency) return [];
    const amount = finiteNumber(item.amount, 0, 0, 1e15);
    if (amount <= 0) return [];
    const fromMonth = clampInt(item.fromMonth, 1, 1, 600);
    const toMonth =
      typeof item.toMonth === 'number' && Number.isFinite(item.toMonth)
        ? clampInt(item.toMonth, fromMonth, fromMonth, 600)
        : null;
    return [
      {
        id:
          typeof item.id === 'string' && item.id.length > 0
            ? item.id.slice(0, 64)
            : `extra-${fromMonth}-${amount}`,
        amount,
        fromMonth,
        frequency,
        toMonth,
      },
    ];
  });

  const system =
    value.system === 'french' || value.system === 'german' || value.system === 'american'
      ? value.system
      : DEFAULT_CONFIG.system;
  const strategy =
    value.strategy === 'reduce-term' || value.strategy === 'reduce-payment'
      ? value.strategy
      : DEFAULT_CONFIG.strategy;
  const graceType =
    value.graceType === 'none' || value.graceType === 'interest-only' || value.graceType === 'total'
      ? value.graceType
      : DEFAULT_CONFIG.graceType;
  const startDate =
    typeof value.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.startDate)
      ? value.startDate
      : null;

  return {
    principal: finiteNumber(value.principal, DEFAULT_CONFIG.principal, 0, 1e15),
    annualRatePct: finiteNumber(value.annualRatePct, DEFAULT_CONFIG.annualRatePct, 0, 1000),
    termMonths: clampInt(value.termMonths, DEFAULT_CONFIG.termMonths, 1, 600),
    graceMonths: clampInt(value.graceMonths, DEFAULT_CONFIG.graceMonths, 0, 599),
    graceType,
    system,
    strategy,
    extras,
    costs: {
      insuranceMonthlyPct: finiteNumber(
        costs.insuranceMonthlyPct,
        DEFAULT_CONFIG.costs.insuranceMonthlyPct,
        0,
        5,
      ),
      monthlyFee: finiteNumber(costs.monthlyFee, DEFAULT_CONFIG.costs.monthlyFee, 0, 1e12),
      originationPct: finiteNumber(
        costs.originationPct,
        DEFAULT_CONFIG.costs.originationPct,
        0,
        50,
      ),
      gmf: costs.gmf === true,
    },
    startDate,
  };
}

function sanitizeAffordability(value: unknown): AffordabilityInput {
  if (!isRecord(value)) return { ...DEFAULT_AFFORDABILITY };
  return sanitizeAffordabilityInput({
    monthlyIncome: finiteNumber(value.monthlyIncome, 0, 0, 1e15),
    otherMonthlyDebt: finiteNumber(value.otherMonthlyDebt, 0, 0, 1e15),
    maxDtiPct: finiteNumber(value.maxDtiPct, DEFAULT_AFFORDABILITY.maxDtiPct, 1, 100),
    stressBps: finiteNumber(value.stressBps, DEFAULT_AFFORDABILITY.stressBps, 0, 2000),
    investmentEaPct: finiteNumber(value.investmentEaPct, 0, 0, 1000),
  });
}

export function sanitizeState(value: unknown): PersistedState {
  if (!isRecord(value)) {
    return {
      version: STORAGE_VERSION,
      config: { ...DEFAULT_CONFIG, costs: { ...DEFAULT_CONFIG.costs } },
      affordability: { ...DEFAULT_AFFORDABILITY },
      usuryEaPct: DEFAULT_USURY_EA_PCT,
      scenarios: [],
    };
  }

  const scenarios = Array.isArray(value.scenarios)
    ? value.scenarios.slice(0, MAX_SCENARIOS).flatMap((item, index) => {
        if (!isRecord(item)) return [];
        const name =
          typeof item.name === 'string' && item.name.trim().length > 0
            ? item.name.trim().slice(0, 60)
            : `Escenario ${index + 1}`;
        return [
          {
            id:
              typeof item.id === 'string' && item.id.length > 0
                ? item.id.slice(0, 64)
                : `scenario-${index}-${name}`,
            name,
            createdAt:
              typeof item.createdAt === 'string'
                ? item.createdAt.slice(0, 40)
                : new Date().toISOString(),
            config: sanitizeConfig(item.config),
          },
        ];
      })
    : [];

  return {
    version: STORAGE_VERSION,
    config: sanitizeConfig(value.config),
    affordability: sanitizeAffordability(value.affordability),
    usuryEaPct: finiteNumber(value.usuryEaPct, DEFAULT_USURY_EA_PCT, 0, 1000),
    scenarios,
  };
}

export function loadState(): PersistedState | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed) || parsed.version !== STORAGE_VERSION) return null;
    return sanitizeState(parsed);
  } catch {
    return null;
  }
}

export function saveState(state: PersistedState): boolean {
  try {
    if (typeof localStorage === 'undefined') return false;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function clearState(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Navegación privada o almacenamiento bloqueado: no hay nada que borrar.
  }
}

export function createInitialState(): PersistedState {
  return {
    version: STORAGE_VERSION,
    config: { ...DEFAULT_CONFIG, costs: { ...DEFAULT_CONFIG.costs } },
    affordability: { ...DEFAULT_AFFORDABILITY },
    usuryEaPct: DEFAULT_USURY_EA_PCT,
    scenarios: [],
  };
}
