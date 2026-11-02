import {
  MAX_TERM_MONTHS,
  computeLoan,
  type AmortizationSystem,
  type LoanAnalysis,
  type LoanConfig,
} from './credit';

export interface GridCell {
  ratePct: number;
  termMonths: number;
  analysis: LoanAnalysis | null;
  isBase: boolean;
}

export interface RateTermGrid {
  rates: number[];
  terms: number[];
  cells: GridCell[];
  minInterest: number;
  maxInterest: number;
}

function clampTerm(term: number, config: LoanConfig): number {
  const grace = config.graceType === 'none' ? 0 : Math.round(config.graceMonths);
  return Math.min(MAX_TERM_MONTHS, Math.max(1, grace + 1, Math.round(term)));
}

export function rateTermGrid(config: LoanConfig): RateTermGrid {
  const baseTerm = Math.max(1, Math.round(config.termMonths));
  if (!Number.isFinite(baseTerm) || baseTerm < 1) {
    return { rates: [], terms: [], cells: [], minInterest: 0, maxInterest: 0 };
  }

  const rateCandidates = [
    config.annualRatePct - 4,
    config.annualRatePct - 2,
    config.annualRatePct,
    config.annualRatePct + 2,
    config.annualRatePct + 4,
  ]
    .map((rate) => Math.max(0, Math.round(rate * 100) / 100))
    .filter((rate, index, all) => all.indexOf(rate) === index)
    .sort((a, b) => a - b);

  const termCandidates = [baseTerm - 24, baseTerm - 12, baseTerm, baseTerm + 12, baseTerm + 24]
    .map((term) => clampTerm(term, config))
    .filter((term, index, all) => all.indexOf(term) === index)
    .sort((a, b) => a - b);

  const cells: GridCell[] = [];
  let minInterest = Number.POSITIVE_INFINITY;
  let maxInterest = 0;

  for (const ratePct of rateCandidates) {
    for (const termMonths of termCandidates) {
      const analysis = computeLoan({
        ...config,
        annualRatePct: ratePct,
        termMonths,
        extras: [],
      });
      const cell: GridCell = {
        ratePct,
        termMonths,
        analysis: analysis.ok ? analysis : null,
        isBase: Math.abs(ratePct - config.annualRatePct) < 0.0001 && termMonths === baseTerm,
      };
      if (cell.analysis) {
        minInterest = Math.min(minInterest, cell.analysis.totalInterest);
        maxInterest = Math.max(maxInterest, cell.analysis.totalInterest);
      }
      cells.push(cell);
    }
  }

  return {
    rates: rateCandidates,
    terms: termCandidates,
    cells,
    minInterest: Number.isFinite(minInterest) ? minInterest : 0,
    maxInterest,
  };
}

export interface LadderRow {
  fraction: number;
  monthlyExtra: number;
  analysis: LoanAnalysis;
  interestSaved: number;
  monthsSaved: number;
  totalExtra: number;
  savedPerExtra: number;
}

export interface AbonoLadder {
  rows: LadderRow[];
  base: LoanAnalysis | null;
  fractions: number[];
}

const LADDER_FRACTIONS = [0, 0.0025, 0.005, 0.01, 0.02];

export function abonoLadder(config: LoanConfig): AbonoLadder {
  const base = computeLoan({ ...config, extras: [] });
  if (!base.ok) {
    return { rows: [], base: null, fractions: LADDER_FRACTIONS };
  }

  const rows: LadderRow[] = [];
  const seen = new Set<number>();
  for (const fraction of LADDER_FRACTIONS) {
    const rawAmount = config.principal * fraction;
    const monthlyExtra =
      fraction === 0 ? 0 : Math.max(10_000, Math.round(rawAmount / 10_000) * 10_000);
    if (seen.has(monthlyExtra)) continue;
    seen.add(monthlyExtra);

    const analysis = computeLoan({
      ...config,
      extras:
        monthlyExtra > 0
          ? [
              {
                id: `ladder-${monthlyExtra}`,
                amount: monthlyExtra,
                fromMonth: 1,
                frequency: 'monthly',
              },
            ]
          : [],
    });

    if (!analysis.ok) continue;
    const interestSaved = base.totalInterest - analysis.totalInterest;
    rows.push({
      fraction,
      monthlyExtra,
      analysis,
      interestSaved,
      monthsSaved: base.months - analysis.months,
      totalExtra: analysis.totalExtras,
      savedPerExtra: analysis.totalExtras > 0 ? interestSaved / analysis.totalExtras : 0,
    });
  }

  return { rows, base, fractions: LADDER_FRACTIONS };
}

export type SystemLabel = 'Francés' | 'Alemán' | 'Americano';

export interface SystemComparisonRow {
  system: AmortizationSystem;
  label: SystemLabel;
  analysis: LoanAnalysis;
}

const SYSTEM_LABELS: Record<AmortizationSystem, SystemLabel> = {
  french: 'Francés',
  german: 'Alemán',
  american: 'Americano',
};

const SYSTEMS: AmortizationSystem[] = ['french', 'german', 'american'];

/** Compara estructuras sin abonos, para aislar el efecto del sistema. */
export function compareSystems(config: LoanConfig): SystemComparisonRow[] {
  return SYSTEMS.map((system) => ({
    system,
    label: SYSTEM_LABELS[system],
    analysis: computeLoan({ ...config, system, extras: [] }),
  }));
}

export interface StrategyComparison {
  reduceTerm: LoanAnalysis;
  reducePayment: LoanAnalysis;
  extraInterestSaved: number;
  monthlyPaymentRelief: number;
}

export function compareStrategies(config: LoanConfig): StrategyComparison | null {
  if (!config.extras.some((extra) => extra.amount > 0)) return null;
  const reduceTerm = computeLoan({ ...config, strategy: 'reduce-term' });
  const reducePayment = computeLoan({ ...config, strategy: 'reduce-payment' });
  if (!reduceTerm.ok || !reducePayment.ok) return null;

  const firstExtraIndex = reducePayment.rows.findIndex((row) => row.extra > 0);
  const comparisonIndex = Math.min(reducePayment.rows.length - 1, Math.max(0, firstExtraIndex + 1));
  const termPayment = reduceTerm.rows[comparisonIndex]?.payment ?? 0;
  const reducedPayment = reducePayment.rows[comparisonIndex]?.payment ?? 0;

  return {
    reduceTerm,
    reducePayment,
    extraInterestSaved: reducePayment.totalInterest - reduceTerm.totalInterest,
    monthlyPaymentRelief: Math.max(0, termPayment - reducedPayment),
  };
}
