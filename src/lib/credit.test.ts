import { describe, expect, it } from 'vitest';
import {
  computeLoan,
  eaFromMonthly,
  extraAmountForMonth,
  monthlyFromNominal,
  monthlyPayment,
  monthlyRateFromEA,
  nominalFromMonthly,
  solveIrr,
  validateConfig,
  type LoanAnalysis,
  type LoanConfig,
} from './credit';

const PRINCIPAL = 60_000_000;
const EA = 19.5;
const TERM = 72;

function makeConfig(overrides: Partial<LoanConfig> = {}): LoanConfig {
  return {
    principal: PRINCIPAL,
    annualRatePct: EA,
    termMonths: TERM,
    graceMonths: 0,
    graceType: 'none',
    system: 'french',
    strategy: 'reduce-term',
    extras: [],
    costs: {
      insuranceMonthlyPct: 0,
      monthlyFee: 0,
      originationPct: 0,
      gmf: false,
    },
    startDate: null,
    ...overrides,
  };
}

function sumRows(analysis: LoanAnalysis, key: keyof LoanAnalysis['rows'][number]): number {
  return analysis.rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

function expectFinancialIdentities(analysis: LoanAnalysis): void {
  expect(analysis.ok).toBe(true);
  expect(analysis.fullyAmortized).toBe(true);
  expect(analysis.rows.at(-1)?.balance ?? 0).toBeLessThan(0.01);

  expect(analysis.totalPrincipalPaid + analysis.totalExtras).toBeCloseTo(
    analysis.principal + analysis.totalCapitalizedInterest,
    2,
  );
  expect(analysis.totalCost).toBeCloseTo(analysis.totalPaid - analysis.principal, 2);
  expect(analysis.totalCost).toBeCloseTo(
    analysis.costBreakdown.interest +
      analysis.costBreakdown.insurance +
      analysis.costBreakdown.fees +
      analysis.costBreakdown.gmf +
      analysis.costBreakdown.charges,
    2,
  );
  expect(analysis.totalPayments).toBeCloseTo(sumRows(analysis, 'total'), 2);
  expect(analysis.totalInterest).toBeCloseTo(sumRows(analysis, 'interest'), 2);
  expect(analysis.totalExtras).toBeCloseTo(sumRows(analysis, 'extra'), 2);
  expect(analysis.totalCharges).toBeCloseTo(sumRows(analysis, 'charges'), 2);
  expect(analysis.totalGmf).toBeCloseTo(analysis.disbursementGmf + sumRows(analysis, 'gmf'), 2);
}

describe('conversión de tasas', () => {
  it('convierte una EA a tasa periódica mensual y de vuelta', () => {
    const monthly = monthlyRateFromEA(19.5);
    expect(monthly).toBeCloseTo(0.0149563, 6);
    expect(eaFromMonthly(monthly)).toBeCloseTo(19.5, 8);
  });

  it('convierte nominal anual mes vencido (NAMV) a mensual', () => {
    const monthly = monthlyFromNominal(24);
    expect(monthly).toBeCloseTo(0.02, 12);
    expect(nominalFromMonthly(monthly)).toBeCloseTo(24, 10);
  });

  it('maneja tasa cero sin dividir por cero', () => {
    expect(monthlyRateFromEA(0)).toBe(0);
    expect(eaFromMonthly(0)).toBe(0);
    expect(monthlyPayment(1_200_000, 0, 12)).toBeCloseTo(100_000, 8);
  });

  it('calcula la cuota francesa como anualidad con valor presente igual al capital', () => {
    const i = monthlyRateFromEA(EA);
    const cuota = monthlyPayment(PRINCIPAL, i, TERM);
    const presentValue = cuota * ((1 - Math.pow(1 + i, -TERM)) / i);
    expect(presentValue).toBeCloseTo(PRINCIPAL, 4);
    expect(cuota).toBeGreaterThan(PRINCIPAL / TERM);
  });
});

describe('sistema francés', () => {
  it('amortiza exactamente en el plazo y cumple las identidades contables', () => {
    const analysis = computeLoan(makeConfig());
    expect(analysis.rows).toHaveLength(TERM);
    expect(analysis.months).toBe(TERM);
    expect(analysis.rows[0].payment).toBeCloseTo(analysis.scheduledPayment, 6);
    expect(analysis.rows[TERM - 1].balance).toBeCloseTo(0, 6);
    expect(analysis.totalInterest).toBeGreaterThan(0);
    expectFinancialIdentities(analysis);
  });

  it('la cuota es constante cuando no hay abonos', () => {
    const analysis = computeLoan(makeConfig());
    const payments = analysis.rows.map((row) => row.payment);
    const first = payments[0];
    for (const payment of payments.slice(0, -1)) {
      expect(payment).toBeCloseTo(first, 6);
    }
  });

  it('con tasa cero el costo es cero y el capital se reparte en partes iguales', () => {
    const analysis = computeLoan(makeConfig({ annualRatePct: 0 }));
    expect(analysis.totalInterest).toBe(0);
    expect(analysis.totalCost).toBe(0);
    expect(analysis.rows[0].principal).toBeCloseTo(PRINCIPAL / TERM, 6);
    expectFinancialIdentities(analysis);
  });
});

describe('abonos a capital', () => {
  it('un abono único reduce el plazo y los intereses', () => {
    const base = computeLoan(makeConfig());
    const withExtra = computeLoan(
      makeConfig({
        extras: [{ id: 'e1', amount: 10_000_000, fromMonth: 12, frequency: 'once' }],
      }),
    );

    expect(withExtra.months).toBeLessThan(base.months);
    expect(withExtra.totalInterest).toBeLessThan(base.totalInterest);
    expect(withExtra.rows[11].extra).toBeCloseTo(10_000_000, 6);
    expectFinancialIdentities(withExtra);
  });

  it('reduce-payment conserva el plazo y baja la cuota', () => {
    const base = computeLoan(makeConfig());
    const reducePayment = computeLoan(
      makeConfig({
        strategy: 'reduce-payment',
        extras: [{ id: 'e1', amount: 5_000_000, fromMonth: 6, frequency: 'once' }],
      }),
    );
    const reduceTerm = computeLoan(
      makeConfig({
        strategy: 'reduce-term',
        extras: [{ id: 'e1', amount: 5_000_000, fromMonth: 6, frequency: 'once' }],
      }),
    );

    expect(reducePayment.months).toBe(base.months);
    expect(reducePayment.rows[6].payment).toBeLessThan(base.rows[6].payment);
    expect(reduceTerm.months).toBeLessThan(base.months);
    expect(reduceTerm.totalInterest).toBeLessThan(reducePayment.totalInterest);
    expectFinancialIdentities(reducePayment);
    expectFinancialIdentities(reduceTerm);
  });

  it('aplica abonos recurrentes mensuales desde el mes indicado', () => {
    const analysis = computeLoan(
      makeConfig({
        extras: [{ id: 'e1', amount: 500_000, fromMonth: 4, frequency: 'monthly' }],
      }),
    );
    expect(analysis.rows[2].extra).toBe(0);
    expect(analysis.rows[3].extra).toBeCloseTo(500_000, 6);
    expect(analysis.rows[10].extra).toBeCloseTo(500_000, 6);
    expectFinancialIdentities(analysis);
  });

  it('aplica abonos anuales en el mes inicial y cada 12 meses', () => {
    const analysis = computeLoan(
      makeConfig({
        termMonths: 60,
        extras: [{ id: 'e1', amount: 1_000_000, fromMonth: 3, frequency: 'annual' }],
      }),
    );
    expect(analysis.rows[2].extra).toBeCloseTo(1_000_000, 6);
    expect(analysis.rows[14].extra).toBeCloseTo(1_000_000, 6);
    expect(analysis.rows[26].extra).toBeCloseTo(1_000_000, 6);
    expect(analysis.rows[3].extra).toBe(0);
    expectFinancialIdentities(analysis);
  });

  it('respeta el límite del mes final de un abono recurrente', () => {
    const analysis = computeLoan(
      makeConfig({
        extras: [{ id: 'e1', amount: 400_000, fromMonth: 3, toMonth: 5, frequency: 'monthly' }],
      }),
    );
    expect(analysis.rows[2].extra).toBeCloseTo(400_000, 6);
    expect(analysis.rows[4].extra).toBeCloseTo(400_000, 6);
    expect(analysis.rows[5].extra).toBe(0);
    expectFinancialIdentities(analysis);
  });

  it('un abono que cubre el saldo termina el crédito y no genera saldo negativo', () => {
    const analysis = computeLoan(
      makeConfig({
        extras: [{ id: 'e1', amount: 500_000_000, fromMonth: 2, frequency: 'once' }],
      }),
    );
    expect(analysis.months).toBe(2);
    expect(analysis.rows[1].balance).toBe(0);
    expect(analysis.rows[1].extra).toBeCloseTo(
      analysis.rows[1].openingBalance - analysis.rows[1].principal,
      6,
    );
    expectFinancialIdentities(analysis);
  });
});

describe('cargos y notas opcionales', () => {
  it('suma cargos mensuales, uniques y notas crédito al pago y al costo', () => {
    const base = computeLoan(makeConfig());
    const charges = [
      {
        id: 'honorarios',
        label: 'Honorarios',
        amount: 50_000,
        frequency: 'monthly' as const,
        fromMonth: 1,
        toMonth: null,
      },
      {
        id: 'mora',
        label: 'Interés de mora',
        amount: 20_000,
        frequency: 'monthly' as const,
        fromMonth: 3,
        toMonth: 5,
      },
      {
        id: 'nota',
        label: 'Nota crédito',
        amount: -100_000,
        frequency: 'once' as const,
        fromMonth: 2,
      },
    ];
    const withCharges = computeLoan(makeConfig({ costs: { ...makeConfig().costs, charges } }));

    expect(withCharges.rows[0].charges).toBeCloseTo(50_000, 6);
    expect(withCharges.rows[1].charges).toBeCloseTo(-50_000, 6);
    expect(withCharges.rows[2].charges).toBeCloseTo(70_000, 6);
    expect(withCharges.rows[5].charges).toBeCloseTo(50_000, 6);
    expect(withCharges.totalCharges).toBeCloseTo(
      50_000 * withCharges.months + 20_000 * 3 - 100_000,
      6,
    );
    expect(withCharges.totalCost).toBeCloseTo(base.totalCost + withCharges.totalCharges, 6);
    expect(withCharges.maxPayment).toBeGreaterThan(base.maxPayment);
    expectFinancialIdentities(withCharges);
  });

  it('no aplica GMF sobre un pago neto negativo', () => {
    const withGmfAndCredit = computeLoan(
      makeConfig({
        costs: {
          ...makeConfig().costs,
          gmf: true,
          charges: [
            {
              id: 'credit',
              label: 'Nota crédito',
              amount: -10_000_000,
              frequency: 'once' as const,
              fromMonth: 1,
            },
          ],
        },
      }),
    );
    expect(withGmfAndCredit.rows[0].gmf).toBe(0);
    expectFinancialIdentities(withGmfAndCredit);
  });

  it('rechaza cargos fuera del plazo', () => {
    const analysis = computeLoan(
      makeConfig({
        costs: {
          ...makeConfig().costs,
          charges: [
            {
              id: 'late',
              label: 'Honorarios',
              amount: 50_000,
              frequency: 'monthly' as const,
              fromMonth: TERM + 1,
            },
          ],
        },
      }),
    );
    expect(analysis.ok).toBe(false);
    expect(analysis.issues.some((issue) => issue.field === 'costs')).toBe(true);
  });
});

describe('sistemas alemán y americano', () => {
  it('alemán amortiza capital constante y paga menos intereses que el francés', () => {
    const french = computeLoan(makeConfig());
    const german = computeLoan(makeConfig({ system: 'german' }));

    expect(german.rows[0].principal).toBeCloseTo(PRINCIPAL / TERM, 6);
    expect(german.rows[0].payment).toBeGreaterThan(german.rows[TERM - 1].payment);
    expect(german.totalInterest).toBeLessThan(french.totalInterest);
    expectFinancialIdentities(german);
  });

  it('americano paga solo intereses y el capital al vencimiento', () => {
    const analysis = computeLoan(makeConfig({ system: 'american' }));
    expect(analysis.rows[0].principal).toBe(0);
    expect(analysis.rows[0].payment).toBeCloseTo(PRINCIPAL * monthlyRateFromEA(EA), 6);
    expect(analysis.rows[TERM - 1].principal).toBeCloseTo(PRINCIPAL, 6);
    expect(analysis.totalInterest).toBeGreaterThan(0);
    expectFinancialIdentities(analysis);
  });

  it('en alemán con abonos se puede conservar el plazo bajando la cuota', () => {
    const analysis = computeLoan(
      makeConfig({
        system: 'german',
        strategy: 'reduce-payment',
        extras: [{ id: 'e1', amount: 5_000_000, fromMonth: 8, frequency: 'once' }],
      }),
    );
    expect(analysis.months).toBe(TERM);
    expect(analysis.rows[9].principal).toBeLessThan(analysis.rows[7].principal);
    expectFinancialIdentities(analysis);
  });
});

describe('periodos de gracia', () => {
  it('gracia con pago de intereses mantiene el capital y no amortiza', () => {
    const analysis = computeLoan(makeConfig({ graceMonths: 6, graceType: 'interest-only' }));
    expect(analysis.rows).toHaveLength(TERM);
    for (let index = 0; index < 6; index += 1) {
      expect(analysis.rows[index].principal).toBe(0);
      expect(analysis.rows[index].balance).toBeCloseTo(PRINCIPAL, 6);
      expect(analysis.rows[index].interest).toBeGreaterThan(0);
    }
    expect(analysis.rows[6].principal).toBeGreaterThan(0);
    expectFinancialIdentities(analysis);
  });

  it('gracia total capitaliza intereses y aumenta el saldo', () => {
    const analysis = computeLoan(makeConfig({ graceMonths: 6, graceType: 'total' }));
    expect(analysis.rows[5].balance).toBeGreaterThan(PRINCIPAL);
    expect(analysis.totalCapitalizedInterest).toBeGreaterThan(0);
    expect(analysis.rows[0].total).toBe(0);
    expect(analysis.rows[5].capitalizedInterest).toBeGreaterThan(0);
    expectFinancialIdentities(analysis);
  });

  it('la gracia total cuesta más intereses que la gracia con pago de intereses', () => {
    const interestOnly = computeLoan(makeConfig({ graceMonths: 6, graceType: 'interest-only' }));
    const total = computeLoan(makeConfig({ graceMonths: 6, graceType: 'total' }));
    expect(total.totalInterest).toBeGreaterThan(interestOnly.totalInterest);
    expect(total.maxPayment).toBeGreaterThan(interestOnly.maxPayment);
  });

  it('no aplica gracia si el tipo es none', () => {
    const analysis = computeLoan(makeConfig({ graceMonths: 6, graceType: 'none' }));
    expect(analysis.rows[0].principal).toBeGreaterThan(0);
    expect(analysis.months).toBe(TERM);
  });
});

describe('seguros, comisiones y GMF', () => {
  it('incluye seguro y cargo fijo en la cuota y en el costo', () => {
    const clean = computeLoan(makeConfig());
    const withCosts = computeLoan(
      makeConfig({
        costs: {
          insuranceMonthlyPct: 0.05,
          monthlyFee: 12_000,
          originationPct: 0,
          gmf: false,
        },
      }),
    );

    expect(withCosts.rows[0].insurance).toBeCloseTo(PRINCIPAL * 0.0005, 6);
    expect(withCosts.rows[0].payment).toBeGreaterThan(clean.rows[0].payment);
    expect(withCosts.totalCost).toBeGreaterThan(clean.totalCost);
    expect(withCosts.totalInsurance).toBeGreaterThan(0);
    expect(withCosts.totalMonthlyFees).toBeCloseTo(12_000 * TERM, 6);
    expectFinancialIdentities(withCosts);
  });

  it('la comisión de apertura encarece el costo efectivo (TIR)', () => {
    const clean = computeLoan(makeConfig());
    const withOrigination = computeLoan(
      makeConfig({
        costs: {
          insuranceMonthlyPct: 0,
          monthlyFee: 0,
          originationPct: 3,
          gmf: false,
        },
      }),
    );

    expect(withOrigination.originationFee).toBeCloseTo(PRINCIPAL * 0.03, 6);
    expect(withOrigination.effectiveCostEaPct).not.toBeNull();
    expect(withOrigination.effectiveCostEaPct ?? 0).toBeGreaterThan(clean.effectiveCostEaPct ?? 0);
    expectFinancialIdentities(withOrigination);
  });

  it('sin costos, el costo efectivo anual coincide con la tasa EA', () => {
    const analysis = computeLoan(makeConfig());
    expect(analysis.effectiveCostEaPct).not.toBeNull();
    expect(analysis.effectiveCostEaPct ?? 0).toBeCloseTo(EA, 5);
  });

  it('el GMF suma 4 x 1.000 sobre desembolso y pagos', () => {
    const analysis = computeLoan(
      makeConfig({
        costs: { insuranceMonthlyPct: 0, monthlyFee: 0, originationPct: 0, gmf: true },
      }),
    );
    expect(analysis.disbursementGmf).toBeCloseTo(PRINCIPAL * 0.004, 6);
    expect(analysis.totalGmf).toBeGreaterThan(analysis.disbursementGmf);
    expectFinancialIdentities(analysis);
  });
});

describe('validación', () => {
  it('rechaza montos y plazos inválidos', () => {
    const noPrincipal = computeLoan(makeConfig({ principal: 0 }));
    expect(noPrincipal.ok).toBe(false);
    expect(noPrincipal.issues.some((issue) => issue.field === 'principal')).toBe(true);

    const noTerm = computeLoan(makeConfig({ termMonths: 0 }));
    expect(noTerm.ok).toBe(false);

    const longTerm = computeLoan(makeConfig({ termMonths: 601 }));
    expect(longTerm.ok).toBe(false);
  });

  it('rechaza una gracia igual o mayor al plazo', () => {
    const analysis = computeLoan(makeConfig({ graceMonths: TERM, graceType: 'total' }));
    expect(analysis.ok).toBe(false);
    expect(analysis.issues.some((issue) => issue.field === 'graceMonths')).toBe(true);
  });

  it('rechaza abonos fuera del plazo', () => {
    const analysis = computeLoan(
      makeConfig({
        extras: [{ id: 'e1', amount: 1_000_000, fromMonth: TERM + 1, frequency: 'once' }],
      }),
    );
    expect(analysis.ok).toBe(false);
    expect(analysis.issues.some((issue) => issue.field === 'extras')).toBe(true);
  });

  it('advierte cuando la gracia no tiene tipo', () => {
    const issues = validateConfig(makeConfig({ graceMonths: 3, graceType: 'none' }));
    expect(issues.some((issue) => issue.severity === 'warning')).toBe(true);
  });

  it('acepta una configuración razonable sin errores', () => {
    const analysis = computeLoan(makeConfig());
    expect(analysis.issues.filter((issue) => issue.severity === 'error')).toHaveLength(0);
  });
});

describe('TIR', () => {
  it('resuelve una TIR simple', () => {
    expect(solveIrr([1000, -1100])).toBeCloseTo(0.1, 10);
  });

  it('devuelve null cuando no hay cambio de signo', () => {
    expect(solveIrr([100, 10, 10])).toBeNull();
  });

  it('devuelve null sin desembolso positivo', () => {
    expect(solveIrr([0, -10])).toBeNull();
  });
});

describe('frecuencias de abono', () => {
  it('calcula el monto de cada frecuencia en un mes dado', () => {
    const extras = [
      { id: 'once', amount: 100, fromMonth: 2, frequency: 'once' as const },
      { id: 'monthly', amount: 10, fromMonth: 2, frequency: 'monthly' as const },
      { id: 'annual', amount: 1000, fromMonth: 2, frequency: 'annual' as const },
    ];
    expect(extraAmountForMonth(extras, 1)).toBe(0);
    expect(extraAmountForMonth(extras, 2)).toBe(1110);
    expect(extraAmountForMonth(extras, 3)).toBe(10);
    expect(extraAmountForMonth(extras, 14)).toBe(1010);
  });

  it('ignora montos no finitos o negativos', () => {
    const extras = [
      { id: 'bad', amount: Number.NaN, fromMonth: 1, frequency: 'monthly' as const },
      { id: 'neg', amount: -10, fromMonth: 1, frequency: 'monthly' as const },
    ];
    expect(extraAmountForMonth(extras, 1)).toBe(0);
  });
});

describe('invariantes en una muestra representativa', () => {
  const systems = ['french', 'german', 'american'] as const;
  const strategies = ['reduce-term', 'reduce-payment'] as const;
  const graces = [
    { graceMonths: 0, graceType: 'none' as const },
    { graceMonths: 6, graceType: 'total' as const },
  ];
  const rateTerm: Array<[number, number]> = [
    [0, 12],
    [19.5, 84],
  ];

  it('mantiene las identidades contables en 24 combinaciones', () => {
    let checked = 0;
    for (const system of systems) {
      for (const strategy of strategies) {
        for (const grace of graces) {
          for (const [rate, term] of rateTerm) {
            const analysis = computeLoan(
              makeConfig({
                system,
                strategy,
                ...grace,
                annualRatePct: rate,
                termMonths: term,
                costs: {
                  insuranceMonthlyPct: 0.04,
                  monthlyFee: 8_000,
                  originationPct: 1.5,
                  gmf: true,
                },
                extras: [
                  { id: 'once', amount: 2_000_000, fromMonth: 5, frequency: 'once' },
                  { id: 'monthly', amount: 150_000, fromMonth: 3, frequency: 'monthly' },
                ],
              }),
            );
            expectFinancialIdentities(analysis);
            checked += 1;
          }
        }
      }
    }
    expect(checked).toBe(24);
  });
});
