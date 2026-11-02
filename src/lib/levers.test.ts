import { describe, expect, it } from 'vitest';
import { buildLevers } from './levers';
import { computeLoan, type LoanConfig } from './credit';

function config(overrides: Partial<LoanConfig> = {}): LoanConfig {
  return {
    principal: 60_000_000,
    annualRatePct: 19.5,
    termMonths: 72,
    graceMonths: 0,
    graceType: 'none',
    system: 'french',
    strategy: 'reduce-term',
    extras: [],
    costs: { insuranceMonthlyPct: 0, monthlyFee: 0, originationPct: 0, gmf: false },
    startDate: null,
    ...overrides,
  };
}

describe('palancas de mejora', () => {
  it('propone tasa, abono mensual, sistema y plazo', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    const levers = buildLevers(loan, analysis);
    const ids = levers.map((lever) => lever.id);
    expect(ids).toContain('rate-1pp');
    expect(ids).toContain('monthly-extra-1pct');
    expect(ids).toContain('system-german');
    expect(ids).toContain('term-plus-12');
    expect(ids).not.toContain('remove-costs');
  });

  it('ordena primero las palancas de ahorro', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    const levers = buildLevers(loan, analysis);
    const firstTradeoff = levers.findIndex((lever) => lever.tone === 'tradeoff');
    if (firstTradeoff >= 0) {
      for (const lever of levers.slice(firstTradeoff)) {
        expect(lever.tone).toBe('tradeoff');
      }
    }
  });

  it('estima ahorros positivos y parches aplicables', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    const levers = buildLevers(loan, analysis);
    const rate = levers.find((lever) => lever.id === 'rate-1pp')!;
    expect(rate.savings).toBeGreaterThan(0);
    expect(rate.patch.annualRatePct).toBeCloseTo(18.5, 6);

    const extra = levers.find((lever) => lever.id === 'monthly-extra-1pct')!;
    expect(extra.savings).toBeGreaterThan(0);
    const modified = computeLoan({ ...loan, ...extra.patch });
    expect(modified.totalInterest).toBeLessThan(analysis.totalInterest);
    expect(modified.totalInterest).toBeCloseTo(analysis.totalInterest - extra.savings, 2);
  });

  it('incluye quitar costos cuando existen', () => {
    const loan = config({
      costs: { insuranceMonthlyPct: 0.05, monthlyFee: 10_000, originationPct: 2, gmf: true },
    });
    const levers = buildLevers(loan, computeLoan(loan));
    const removeCosts = levers.find((lever) => lever.id === 'remove-costs');
    expect(removeCosts).toBeDefined();
    expect(removeCosts!.savings).toBeGreaterThan(0);
    const modified = computeLoan({ ...loan, ...removeCosts!.patch });
    expect(modified.totalCost).toBeLessThan(computeLoan(loan).totalCost);
  });

  it('no propone alargar el plazo si ya está en el máximo', () => {
    const loan = config({ termMonths: 600 });
    const levers = buildLevers(loan, computeLoan(loan));
    expect(levers.some((lever) => lever.id === 'term-plus-12')).toBe(false);
  });
});
