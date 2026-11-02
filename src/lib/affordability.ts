import { computeLoan, type LoanAnalysis, type LoanConfig } from './credit';

export interface AffordabilityInput {
  monthlyIncome: number;
  otherMonthlyDebt: number;
  /** Porcentaje máximo del ingreso que puede ir a deuda. */
  maxDtiPct: number;
  /** Puntos básicos de estrés sobre la tasa EA (200 = +2 pp). */
  stressBps: number;
  /** Rentabilidad alternativa esperada, EA %. */
  investmentEaPct: number;
}

export type AffordabilityStatus = 'unknown' | 'comfortable' | 'tight' | 'risky';

export interface AffordabilityResult {
  ok: boolean;
  monthlyIncome: number;
  otherMonthlyDebt: number;
  maxDtiPct: number;
  basePayment: number;
  totalDebtPayment: number;
  dtiPct: number | null;
  paymentSharePct: number | null;
  capacity: number;
  headroom: number;
  maxPrincipal: number;
  stressRatePct: number;
  stressPayment: number;
  stressDtiPct: number | null;
  stressHeadroom: number;
  status: AffordabilityStatus;
  annualDebtToIncomePct: number | null;
  surplusAfterDebt: number | null;
  prepaymentReturnEaPct: number;
  investAdvice: 'prepay' | 'invest' | 'similar' | 'unknown';
  issues: string[];
}

const UNKNOWN_RESULT: AffordabilityResult = {
  ok: false,
  monthlyIncome: 0,
  otherMonthlyDebt: 0,
  maxDtiPct: 40,
  basePayment: 0,
  totalDebtPayment: 0,
  dtiPct: null,
  paymentSharePct: null,
  capacity: 0,
  headroom: 0,
  maxPrincipal: 0,
  stressRatePct: 0,
  stressPayment: 0,
  stressDtiPct: null,
  stressHeadroom: 0,
  status: 'unknown',
  annualDebtToIncomePct: null,
  surplusAfterDebt: null,
  prepaymentReturnEaPct: 0,
  investAdvice: 'unknown',
  issues: [],
};

export function sanitizeAffordabilityInput(input: AffordabilityInput): AffordabilityInput {
  return {
    monthlyIncome: Number.isFinite(input.monthlyIncome) ? Math.max(0, input.monthlyIncome) : 0,
    otherMonthlyDebt: Number.isFinite(input.otherMonthlyDebt)
      ? Math.max(0, input.otherMonthlyDebt)
      : 0,
    maxDtiPct: Number.isFinite(input.maxDtiPct) ? Math.min(100, Math.max(1, input.maxDtiPct)) : 40,
    stressBps: Number.isFinite(input.stressBps)
      ? Math.min(2000, Math.max(0, input.stressBps))
      : 200,
    investmentEaPct: Number.isFinite(input.investmentEaPct)
      ? Math.max(0, input.investmentEaPct)
      : 0,
  };
}

/**
 * Capital máximo que cabe en una cuota disponible, resolviendo por bisección.
 * Se calcula sin abonos voluntarios: la entidad evalúa la cuota contractual.
 */
export function maxAffordablePrincipal(config: LoanConfig, capacity: number): number {
  if (!(capacity > 0)) return 0;
  if (!Number.isFinite(config.termMonths) || config.termMonths < 1) return 0;

  const paymentAt = (principal: number): number => {
    const analysis = computeLoan({
      ...config,
      principal,
      extras: [],
    });
    if (!analysis.ok) return Number.POSITIVE_INFINITY;
    return analysis.maxPayment;
  };

  let high = Math.max(config.principal * 2, capacity * config.termMonths * 2, 1_000_000);
  let highPayment = paymentAt(high);
  let attempts = 0;
  while (highPayment <= capacity && attempts < 20) {
    high *= 2;
    highPayment = paymentAt(high);
    attempts += 1;
  }
  if (highPayment <= capacity) return Math.floor(high);

  let low = 0;
  for (let iteration = 0; iteration < 70; iteration += 1) {
    const mid = (low + high) / 2;
    if (paymentAt(mid) <= capacity) low = mid;
    else high = mid;
  }

  if (low < 10_000) return Math.floor(low / 1_000) * 1_000;
  return Math.floor(low / 10_000) * 10_000;
}

export function analyzeAffordability(
  config: LoanConfig,
  analysis: LoanAnalysis,
  input: AffordabilityInput,
): AffordabilityResult {
  const safe = sanitizeAffordabilityInput(input);
  const issues: string[] = [];

  if (!analysis.ok) {
    return { ...UNKNOWN_RESULT, issues: ['El crédito aún no tiene una configuración válida.'] };
  }
  if (safe.monthlyIncome <= 0) {
    return {
      ...UNKNOWN_RESULT,
      basePayment: analysis.maxPayment,
      totalDebtPayment: analysis.maxPayment + safe.otherMonthlyDebt,
      prepaymentReturnEaPct: analysis.annualRatePct,
      issues: ['Ingresa tu ingreso neto mensual para evaluar la capacidad de pago.'],
    };
  }

  const basePayment = analysis.maxPayment;
  const totalDebtPayment = basePayment + safe.otherMonthlyDebt;
  const dtiPct = (totalDebtPayment / safe.monthlyIncome) * 100;
  const paymentSharePct = (basePayment / safe.monthlyIncome) * 100;
  const capacity = Math.max(0, (safe.monthlyIncome * safe.maxDtiPct) / 100 - safe.otherMonthlyDebt);
  const headroom = capacity - basePayment;
  const annualDebtToIncomePct = (analysis.principal / (safe.monthlyIncome * 12)) * 100;
  const surplusAfterDebt = safe.monthlyIncome - totalDebtPayment;

  const stressRatePct = config.annualRatePct + safe.stressBps / 100;
  const stressLoan = computeLoan({
    ...config,
    annualRatePct: stressRatePct,
  });
  const stressPayment = stressLoan.ok ? stressLoan.maxPayment : 0;
  const stressDtiPct =
    safe.monthlyIncome > 0
      ? ((stressPayment + safe.otherMonthlyDebt) / safe.monthlyIncome) * 100
      : null;
  const stressHeadroom = capacity - stressPayment;

  let status: AffordabilityStatus = 'comfortable';
  if (dtiPct > safe.maxDtiPct) status = 'risky';
  else if (dtiPct > safe.maxDtiPct * 0.75) status = 'tight';

  if (safe.otherMonthlyDebt >= safe.monthlyIncome) {
    issues.push(
      'Tus otras deudas ya consumen todo el ingreso: cualquier cuota nueva es insostenible.',
    );
  }
  if (headroom < 0) {
    issues.push(
      'La cuota supera el espacio disponible con el DTI que elegiste. Considera un plazo mayor, un abono inicial o un monto menor.',
    );
  }
  if (stressDtiPct != null && stressDtiPct > safe.maxDtiPct) {
    issues.push(
      `Con una tasa ${safe.stressBps / 100 >= 0 ? '+' : ''}${(safe.stressBps / 100).toFixed(2)} pp, el DTI llegaría a ${stressDtiPct.toFixed(1)}% y superaría tu límite.`,
    );
  }

  const prepaymentReturnEaPct = analysis.annualRatePct;
  let investAdvice: AffordabilityResult['investAdvice'] = 'unknown';
  if (safe.investmentEaPct > 0) {
    const difference = safe.investmentEaPct - prepaymentReturnEaPct;
    if (difference > 0.5) investAdvice = 'invest';
    else if (difference < -0.5) investAdvice = 'prepay';
    else investAdvice = 'similar';
  }

  const maxPrincipal = capacity > 0 ? maxAffordablePrincipal(config, capacity) : 0;

  return {
    ok: true,
    monthlyIncome: safe.monthlyIncome,
    otherMonthlyDebt: safe.otherMonthlyDebt,
    maxDtiPct: safe.maxDtiPct,
    basePayment,
    totalDebtPayment,
    dtiPct,
    paymentSharePct,
    capacity,
    headroom,
    maxPrincipal,
    stressRatePct,
    stressPayment,
    stressDtiPct,
    stressHeadroom,
    status,
    annualDebtToIncomePct,
    surplusAfterDebt,
    prepaymentReturnEaPct,
    investAdvice,
    issues,
  };
}
