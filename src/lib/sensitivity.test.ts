import { describe, expect, it } from 'vitest';
import { abonoLadder, compareStrategies, compareSystems, rateTermGrid } from './sensitivity';
import { computeLoan, type LoanConfig } from './credit';

function config(overrides: Partial<LoanConfig> = {}): LoanConfig {
  return {
    principal: 90_000_000,
    annualRatePct: 22.09,
    termMonths: 84,
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

describe('grilla tasa × plazo', () => {
  it('incluye la celda base y coincide con el cálculo sin abonos', () => {
    const loan = config();
    const base = computeLoan({ ...loan, extras: [] });
    const grid = rateTermGrid(loan);
    expect(grid.rates.length).toBeGreaterThanOrEqual(3);
    expect(grid.terms.length).toBeGreaterThanOrEqual(3);
    expect(grid.cells).toHaveLength(grid.rates.length * grid.terms.length);

    const baseCell = grid.cells.find((cell) => cell.isBase);
    expect(baseCell).toBeDefined();
    expect(baseCell?.analysis?.totalInterest).toBeCloseTo(base.totalInterest, 6);
    expect(grid.minInterest).toBeLessThanOrEqual(base.totalInterest);
    expect(grid.maxInterest).toBeGreaterThanOrEqual(base.totalInterest);
  });

  it('no usa abonos en la grilla para aislar tasa y plazo', () => {
    const withExtras = config({
      extras: [{ id: 'e1', amount: 5_000_000, fromMonth: 4, frequency: 'once' }],
    });
    const grid = rateTermGrid(withExtras);
    for (const cell of grid.cells) {
      expect(cell.analysis?.totalExtras ?? 0).toBe(0);
    }
  });

  it('maneja tasas y plazos extremos sin romper', () => {
    const grid = rateTermGrid(config({ annualRatePct: 0, termMonths: 600 }));
    for (const cell of grid.cells) {
      if (cell.analysis) {
        expect(cell.analysis.ok).toBe(true);
        expect(cell.analysis.fullyAmortized).toBe(true);
      }
    }
  });
});

describe('escalera de abonos', () => {
  it('parte del plan sin abonos y mejora de forma monótona', () => {
    const ladder = abonoLadder(config());
    expect(ladder.base).not.toBeNull();
    expect(ladder.rows[0].monthlyExtra).toBe(0);
    expect(ladder.rows[0].interestSaved).toBeCloseTo(0, 6);

    for (let index = 1; index < ladder.rows.length; index += 1) {
      expect(ladder.rows[index].monthlyExtra).toBeGreaterThan(ladder.rows[index - 1].monthlyExtra);
      expect(ladder.rows[index].interestSaved).toBeGreaterThanOrEqual(
        ladder.rows[index - 1].interestSaved,
      );
      expect(ladder.rows[index].monthsSaved).toBeGreaterThanOrEqual(
        ladder.rows[index - 1].monthsSaved,
      );
    }
  });

  it('calcula el ahorro por peso abonado', () => {
    const ladder = abonoLadder(config());
    const row = ladder.rows[2];
    expect(row.totalExtra).toBeGreaterThan(0);
    expect(row.savedPerExtra).toBeGreaterThan(0);
    expect(row.savedPerExtra).toBeLessThan(5);
  });
});

describe('comparación de sistemas y estrategias', () => {
  it('compara francés, alemán y americano sin abonos', () => {
    const rows = compareSystems(config());
    expect(rows).toHaveLength(3);
    for (const row of rows) {
      expect(row.analysis.ok).toBe(true);
      expect(row.analysis.totalExtras).toBe(0);
    }
    const french = rows.find((row) => row.system === 'french')!.analysis;
    const german = rows.find((row) => row.system === 'german')!.analysis;
    const american = rows.find((row) => row.system === 'american')!.analysis;
    expect(german.totalInterest).toBeLessThan(french.totalInterest);
    expect(american.totalInterest).toBeGreaterThan(french.totalInterest);
  });

  it('compara reducir plazo vs reducir cuota', () => {
    const loan = config({
      extras: [{ id: 'e1', amount: 5_000_000, fromMonth: 6, frequency: 'once' }],
    });
    const comparison = compareStrategies(loan);
    expect(comparison).not.toBeNull();
    expect(comparison!.reduceTerm.months).toBeLessThan(comparison!.reducePayment.months);
    expect(comparison!.extraInterestSaved).toBeGreaterThan(0);
    expect(comparison!.monthlyPaymentRelief).toBeGreaterThan(0);
  });

  it('devuelve null sin abonos', () => {
    expect(compareStrategies(config())).toBeNull();
  });
});
