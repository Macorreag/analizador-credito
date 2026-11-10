import { MAX_TERM_MONTHS, computeLoan, type LoanAnalysis, type LoanConfig } from './credit';

export type LeverTone = 'save' | 'tradeoff';

export interface Lever {
  id: string;
  title: string;
  description: string;
  /** Interés ahorrado (positivo) o costo adicional (negativo). */
  savings: number;
  /** Meses menos (positivo) o meses más (negativo). */
  monthsDelta: number;
  /** Aumento de la cuota máxima (positivo = más exigente). */
  paymentIncrease: number;
  tone: LeverTone;
  patch: Partial<LoanConfig>;
  applyLabel: string;
}

export function buildLevers(config: LoanConfig, analysis: LoanAnalysis): Lever[] {
  if (!analysis.ok || !(config.principal > 0)) return [];

  const levers: Lever[] = [];
  const roundTo10k = (value: number): number =>
    Math.max(10_000, Math.round(value / 10_000) * 10_000);

  if (config.annualRatePct > 0.25) {
    const newRate = Math.max(0, Math.round((config.annualRatePct - 1) * 100) / 100);
    const modified = computeLoan({ ...config, annualRatePct: newRate });
    if (modified.ok) {
      levers.push({
        id: 'rate-1pp',
        title: 'Negocia 1 punto de tasa',
        description:
          'Cada punto porcentual de tasa que bajes se ahorra directamente en intereses. Es la palanca con mejor relación esfuerzo/beneficio.',
        savings: analysis.totalInterest - modified.totalInterest,
        monthsDelta: analysis.months - modified.months,
        paymentIncrease: modified.maxPayment - analysis.maxPayment,
        tone: 'save',
        patch: { annualRatePct: newRate },
        applyLabel: 'Simular tasa',
      });
    }
  }

  const monthlyExtra = roundTo10k(config.principal * 0.01);
  const extraAnalysis = computeLoan({
    ...config,
    extras: [
      ...config.extras,
      {
        id: `lever-extra-${Date.now()}`,
        amount: monthlyExtra,
        fromMonth: 1,
        frequency: 'monthly',
      },
    ],
  });
  if (extraAnalysis.ok) {
    levers.push({
      id: 'monthly-extra-1pct',
      title: `Abona ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(monthlyExtra)} al mes`,
      description:
        'Un abono mensual del 1% del capital, desde el primer mes, ataca el interés compuesto y suele ser la mejora más potente después de la tasa.',
      savings: analysis.totalInterest - extraAnalysis.totalInterest,
      monthsDelta: analysis.months - extraAnalysis.months,
      paymentIncrease: monthlyExtra,
      tone: 'save',
      patch: {
        extras: [
          ...config.extras,
          {
            id: `lever-extra-${Date.now()}`,
            amount: monthlyExtra,
            fromMonth: 1,
            frequency: 'monthly',
          },
        ],
      },
      applyLabel: 'Simular abono',
    });
  }

  if (config.system !== 'german') {
    const german = computeLoan({ ...config, system: 'german' });
    if (german.ok) {
      levers.push({
        id: 'system-german',
        title: 'Pasa al sistema alemán',
        description:
          'Amortizas más capital al inicio: pagas menos intereses totales, pero la primera cuota sube. Útil si tu flujo aguanta el arranque.',
        savings: analysis.totalInterest - german.totalInterest,
        monthsDelta: analysis.months - german.months,
        paymentIncrease: german.maxPayment - analysis.maxPayment,
        tone: 'tradeoff',
        patch: { system: 'german' },
        applyLabel: 'Simular alemán',
      });
    }
  }

  const hasCosts =
    config.costs.insuranceMonthlyPct > 0 ||
    config.costs.monthlyFee > 0 ||
    config.costs.originationPct > 0 ||
    config.costs.gmf ||
    (config.costs.charges?.length ?? 0) > 0;
  if (hasCosts) {
    const withoutCosts = computeLoan({
      ...config,
      costs: { insuranceMonthlyPct: 0, monthlyFee: 0, originationPct: 0, gmf: false, charges: [] },
    });
    if (withoutCosts.ok) {
      levers.push({
        id: 'remove-costs',
        title: 'Quita seguros, comisiones y cargos',
        description:
          'Si el seguro no es obligatorio o puedes negociar la comisión, el cargo fijo y los cargos adicionales, ese dinero deja de costar interés.',
        savings: analysis.totalCost - withoutCosts.totalCost,
        monthsDelta: analysis.months - withoutCosts.months,
        paymentIncrease: withoutCosts.maxPayment - analysis.maxPayment,
        tone: 'save',
        patch: {
          costs: {
            insuranceMonthlyPct: 0,
            monthlyFee: 0,
            originationPct: 0,
            gmf: false,
            charges: [],
          },
        },
        applyLabel: 'Simular sin costos',
      });
    }
  }

  if (config.termMonths < MAX_TERM_MONTHS - 12) {
    const longer = computeLoan({ ...config, termMonths: Math.round(config.termMonths) + 12 });
    if (longer.ok) {
      levers.push({
        id: 'term-plus-12',
        title: 'Alarga el plazo 12 meses',
        description:
          'Baja la cuota y libera flujo, pero pagas más intereses. Solo tiene sentido si hoy la cuota no cabe en tu presupuesto.',
        savings: analysis.totalInterest - longer.totalInterest,
        monthsDelta: analysis.months - longer.months,
        paymentIncrease: longer.maxPayment - analysis.maxPayment,
        tone: 'tradeoff',
        patch: { termMonths: Math.round(config.termMonths) + 12 },
        applyLabel: 'Simular plazo',
      });
    }
  }

  return levers.sort((a, b) => {
    if (a.tone !== b.tone) return a.tone === 'save' ? -1 : 1;
    return b.savings - a.savings;
  });
}
