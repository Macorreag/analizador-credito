import { describe, expect, it } from 'vitest';
import {
  analyzeAffordability,
  maxAffordablePrincipal,
  type AffordabilityInput,
} from './affordability';
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

function input(overrides: Partial<AffordabilityInput> = {}): AffordabilityInput {
  return {
    monthlyIncome: 5_000_000,
    otherMonthlyDebt: 0,
    maxDtiPct: 40,
    stressBps: 200,
    investmentEaPct: 0,
    ...overrides,
  };
}

describe('capacidad de pago', () => {
  it('calcula DTI, holgura y estrés', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    const result = analyzeAffordability(loan, analysis, input({ monthlyIncome: 6_000_000 }));

    expect(result.ok).toBe(true);
    expect(result.basePayment).toBeCloseTo(analysis.maxPayment, 6);
    expect(result.dtiPct).toBeCloseTo((analysis.maxPayment / 6_000_000) * 100, 6);
    expect(result.capacity).toBeCloseTo(2_400_000, 6);
    expect(result.headroom).toBeCloseTo(2_400_000 - analysis.maxPayment, 6);
    expect(result.stressPayment).toBeGreaterThan(analysis.maxPayment);
    expect(result.stressDtiPct ?? 0).toBeGreaterThan(result.dtiPct ?? 0);
    expect(result.status).toBe('tight');
  });

  it('marca cómodo cuando la cuota es baja frente al ingreso', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    const result = analyzeAffordability(loan, analysis, input({ monthlyIncome: 12_000_000 }));
    expect(result.status).toBe('comfortable');
    expect(result.headroom).toBeGreaterThan(0);
  });

  it('marca en riesgo cuando la deuda supera el límite', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    const result = analyzeAffordability(loan, analysis, input({ monthlyIncome: 3_000_000 }));
    expect(result.status).toBe('risky');
    expect(result.headroom).toBeLessThan(0);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('incluye otras deudas en el DTI', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    const result = analyzeAffordability(loan, analysis, input({ otherMonthlyDebt: 500_000 }));
    expect(result.totalDebtPayment).toBeCloseTo(analysis.maxPayment + 500_000, 6);
    expect(result.capacity).toBeCloseTo(1_500_000, 6);
  });

  it('devuelve estado desconocido sin ingreso', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    const result = analyzeAffordability(loan, analysis, input({ monthlyIncome: 0 }));
    expect(result.ok).toBe(false);
    expect(result.status).toBe('unknown');
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('recomienda abonar o invertir según el umbral de tasa', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    expect(analyzeAffordability(loan, analysis, input({ investmentEaPct: 10 })).investAdvice).toBe(
      'prepay',
    );
    expect(analyzeAffordability(loan, analysis, input({ investmentEaPct: 30 })).investAdvice).toBe(
      'invest',
    );
    expect(
      analyzeAffordability(loan, analysis, input({ investmentEaPct: 22.2 })).investAdvice,
    ).toBe('similar');
  });
});

describe('capital máximo financiable', () => {
  it('encuentra un capital cuya cuota cabe en la capacidad', () => {
    const loan = config();
    const analysis = computeLoan(loan);
    const result = analyzeAffordability(loan, analysis, input());
    expect(result.maxPrincipal).toBeGreaterThan(0);

    const maxLoan = computeLoan({ ...loan, principal: result.maxPrincipal, extras: [] });
    expect(maxLoan.ok).toBe(true);
    expect(maxLoan.maxPayment).toBeLessThanOrEqual(result.capacity + 1);
  });

  it('crece con la capacidad y con el plazo', () => {
    const loan = config();
    const low = maxAffordablePrincipal(loan, 1_000_000);
    const high = maxAffordablePrincipal(loan, 2_000_000);
    expect(high).toBeGreaterThan(low);

    const longLoan = config({ termMonths: 120 });
    expect(maxAffordablePrincipal(longLoan, 1_000_000)).toBeGreaterThan(low);
  });

  it('devuelve cero sin capacidad', () => {
    expect(maxAffordablePrincipal(config(), 0)).toBe(0);
    expect(maxAffordablePrincipal(config(), -10)).toBe(0);
  });
});
