/**
 * Motor de amortización de Crédito.
 *
 * Única fuente de verdad para la matemática del proyecto: no depende de React,
 * del DOM ni de ninguna API. Todas las tasas internas son periódicas mensuales
 * y todas las cifras se calculan sin redondear; el redondeo es solo de pantalla.
 */

export type AmortizationSystem = 'french' | 'german' | 'american';
export type ExtraStrategy = 'reduce-term' | 'reduce-payment';
export type GraceType = 'none' | 'interest-only' | 'total';
export type ExtraFrequency = 'once' | 'monthly' | 'annual';

export interface ExtraPayment {
  id: string;
  amount: number;
  fromMonth: number;
  frequency: ExtraFrequency;
  /** Último mes en el que aplica. `null`/`undefined` = hasta el final. */
  toMonth?: number | null;
}

export interface CostConfig {
  /** Seguro de vida deudor, % mensual sobre el saldo al inicio del mes. */
  insuranceMonthlyPct: number;
  /** Cuota de manejo o administración, valor fijo mensual. */
  monthlyFee: number;
  /** Comisión de apertura/estudio, % del capital. Se paga al desembolsar. */
  originationPct: number;
  /** GMF (4 x 1.000) sobre desembolso y pagos. */
  gmf: boolean;
}

export interface LoanConfig {
  principal: number;
  /** Tasa efectiva anual, en porcentaje (ej. 22.09). */
  annualRatePct: number;
  termMonths: number;
  graceMonths: number;
  graceType: GraceType;
  system: AmortizationSystem;
  strategy: ExtraStrategy;
  extras: ExtraPayment[];
  costs: CostConfig;
  /** Fecha del primer pago, ISO `YYYY-MM-DD`. Solo afecta etiquetas. */
  startDate: string | null;
}

export type IssueSeverity = 'error' | 'warning';

export interface ValidationIssue {
  field: keyof LoanConfig | 'costs' | 'extras';
  severity: IssueSeverity;
  message: string;
}

export interface PaymentRow {
  month: number;
  openingBalance: number;
  interest: number;
  /** Interés que no se paga en el mes y se capitaliza (gracia total). */
  capitalizedInterest: number;
  principal: number;
  insurance: number;
  fee: number;
  gmf: number;
  extra: number;
  /** Cuota regular del mes: interés + capital + seguro + comisión. */
  payment: number;
  /** Salida total de caja del mes: cuota + abono + GMF. */
  total: number;
  balance: number;
  /** `true` si el crédito quedó saldado este mes. */
  paidOff: boolean;
}

export interface CostBreakdown {
  interest: number;
  insurance: number;
  fees: number;
  gmf: number;
}

export interface LoanAnalysis {
  ok: boolean;
  issues: ValidationIssue[];
  monthlyRate: number;
  annualRatePct: number;
  nominalAnnualPct: number;
  scheduledMonths: number;
  rows: PaymentRow[];
  months: number;
  fullyAmortized: boolean;
  negativeAmortization: boolean;
  principal: number;
  totalInterest: number;
  totalInsurance: number;
  totalMonthlyFees: number;
  originationFee: number;
  disbursementGmf: number;
  totalGmf: number;
  totalExtras: number;
  totalCost: number;
  totalPaid: number;
  totalPayments: number;
  costBreakdown: CostBreakdown;
  costRatioPct: number;
  netDisbursed: number;
  /** TIR mensual del flujo real (desembolso neto vs. pagos). */
  monthlyIrr: number | null;
  /** TIR anualizada: costo efectivo anual del crédito. */
  effectiveCostEaPct: number | null;
  firstPayment: number;
  lastPayment: number;
  maxPayment: number;
  maxTotalOutflow: number;
  scheduledPayment: number;
  totalPrincipalPaid: number;
  totalCapitalizedInterest: number;
  totalRegularPayments: number;
}

export const GMF_RATE = 0.004;
export const MAX_TERM_MONTHS = 600;
export const MAX_ANNUAL_RATE_PCT = 1000;

const BALANCE_EPSILON = 0.005;
const SCHEDULE_GUARD_MONTHS = 24;

export function monthlyRateFromEA(annualEffectivePct: number): number {
  const ea = annualEffectivePct / 100;
  if (!Number.isFinite(ea) || ea < 0) return 0;
  return Math.pow(1 + ea, 1 / 12) - 1;
}

export function eaFromMonthly(monthlyRate: number): number {
  if (!Number.isFinite(monthlyRate) || monthlyRate <= -1) return 0;
  return (Math.pow(1 + monthlyRate, 12) - 1) * 100;
}

export function monthlyFromNominal(nominalAnnualPct: number): number {
  if (!Number.isFinite(nominalAnnualPct) || nominalAnnualPct < 0) return 0;
  return nominalAnnualPct / 100 / 12;
}

export function nominalFromMonthly(monthlyRate: number): number {
  return monthlyRate * 12 * 100;
}

/** Pago uniforme (sistema francés) que amortiza `balance` en `months`. */
export function monthlyPayment(balance: number, monthlyRate: number, months: number): number {
  if (!(balance > 0) || !(months > 0)) return 0;
  if (Math.abs(monthlyRate) < 1e-12) return balance / months;
  const factor = Math.pow(1 + monthlyRate, -months);
  if (!Number.isFinite(factor) || factor >= 1) return balance;
  return (balance * monthlyRate) / (1 - factor);
}

export function extraAmountForMonth(extras: readonly ExtraPayment[], month: number): number {
  let total = 0;
  for (const extra of extras) {
    const amount = Number.isFinite(extra.amount) ? Math.max(0, extra.amount) : 0;
    if (amount === 0) continue;
    const from = Math.max(1, Math.round(extra.fromMonth));
    const to =
      extra.toMonth == null || !Number.isFinite(extra.toMonth)
        ? Number.POSITIVE_INFINITY
        : Math.max(from, Math.round(extra.toMonth));
    if (month < from || month > to) continue;

    if (extra.frequency === 'once') {
      if (month === from) total += amount;
    } else if (extra.frequency === 'monthly') {
      total += amount;
    } else if (extra.frequency === 'annual') {
      if ((month - from) % 12 === 0) total += amount;
    }
  }
  return total;
}

function pushIssue(
  issues: ValidationIssue[],
  field: ValidationIssue['field'],
  severity: IssueSeverity,
  message: string,
): void {
  issues.push({ field, severity, message });
}

export function validateConfig(config: LoanConfig): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const {
    principal,
    annualRatePct,
    termMonths,
    graceMonths,
    graceType,
    system,
    strategy,
    extras,
    costs,
  } = config;

  if (!Number.isFinite(principal)) {
    pushIssue(issues, 'principal', 'error', 'El monto del crédito debe ser un número.');
  } else if (principal <= 0) {
    pushIssue(issues, 'principal', 'error', 'El monto del crédito debe ser mayor que cero.');
  } else if (principal < 100_000) {
    pushIssue(
      issues,
      'principal',
      'warning',
      'Un monto tan bajo puede ser un error de digitación.',
    );
  }

  if (!Number.isFinite(annualRatePct)) {
    pushIssue(issues, 'annualRatePct', 'error', 'La tasa debe ser un número.');
  } else if (annualRatePct < 0) {
    pushIssue(issues, 'annualRatePct', 'error', 'La tasa no puede ser negativa.');
  } else if (annualRatePct > MAX_ANNUAL_RATE_PCT) {
    pushIssue(issues, 'annualRatePct', 'error', 'La tasa efectiva anual no puede superar 1000%.');
  } else if (annualRatePct > 200) {
    pushIssue(
      issues,
      'annualRatePct',
      'warning',
      'Una tasa efectiva anual mayor a 200% es inusual; revisa si la ingresaste en otra unidad.',
    );
  }

  if (!Number.isFinite(termMonths)) {
    pushIssue(issues, 'termMonths', 'error', 'El plazo debe ser un número de meses.');
  } else if (termMonths < 1) {
    pushIssue(issues, 'termMonths', 'error', 'El plazo debe ser de al menos 1 mes.');
  } else if (termMonths > MAX_TERM_MONTHS) {
    pushIssue(issues, 'termMonths', 'error', `El plazo no puede superar ${MAX_TERM_MONTHS} meses.`);
  } else if (!Number.isInteger(termMonths)) {
    pushIssue(issues, 'termMonths', 'warning', 'El plazo se ajustará al mes entero más cercano.');
  }

  if (!Number.isFinite(graceMonths)) {
    pushIssue(issues, 'graceMonths', 'error', 'Los meses de gracia deben ser un número.');
  } else if (graceMonths < 0) {
    pushIssue(issues, 'graceMonths', 'error', 'Los meses de gracia no pueden ser negativos.');
  } else if (Number.isFinite(termMonths) && graceMonths >= termMonths) {
    pushIssue(issues, 'graceMonths', 'error', 'La gracia debe ser menor que el plazo total.');
  } else if (!Number.isInteger(graceMonths)) {
    pushIssue(issues, 'graceMonths', 'warning', 'La gracia se ajustará al mes entero más cercano.');
  }

  if (graceMonths > 0 && graceType === 'none') {
    pushIssue(
      issues,
      'graceType',
      'warning',
      'Hay meses de gracia configurados, pero el tipo es “sin gracia”: no se aplicarán.',
    );
  }

  if (!['french', 'german', 'american'].includes(system)) {
    pushIssue(issues, 'system', 'error', 'Sistema de amortización no reconocido.');
  }
  if (!['reduce-term', 'reduce-payment'].includes(strategy)) {
    pushIssue(issues, 'strategy', 'error', 'Estrategia de abonos no reconocida.');
  }

  if (!costs || typeof costs !== 'object') {
    pushIssue(issues, 'costs', 'error', 'La configuración de costos no es válida.');
  } else {
    if (!Number.isFinite(costs.insuranceMonthlyPct) || costs.insuranceMonthlyPct < 0) {
      pushIssue(issues, 'costs', 'error', 'El seguro mensual no puede ser negativo.');
    } else if (costs.insuranceMonthlyPct > 5) {
      pushIssue(issues, 'costs', 'error', 'El seguro mensual no puede superar 5% del saldo.');
    } else if (costs.insuranceMonthlyPct > 1) {
      pushIssue(issues, 'costs', 'warning', 'Un seguro mensual mayor a 1% del saldo es inusual.');
    }
    if (!Number.isFinite(costs.monthlyFee) || costs.monthlyFee < 0) {
      pushIssue(issues, 'costs', 'error', 'La cuota de manejo no puede ser negativa.');
    }
    if (!Number.isFinite(costs.originationPct) || costs.originationPct < 0) {
      pushIssue(issues, 'costs', 'error', 'La comisión de apertura no puede ser negativa.');
    } else if (costs.originationPct > 50) {
      pushIssue(issues, 'costs', 'error', 'La comisión de apertura no puede superar 50%.');
    } else if (costs.originationPct > 10) {
      pushIssue(issues, 'costs', 'warning', 'Una comisión de apertura mayor a 10% es inusual.');
    }
    if (typeof costs.gmf !== 'boolean') {
      pushIssue(issues, 'costs', 'error', 'La opción de GMF no es válida.');
    }
  }

  if (!Array.isArray(extras)) {
    pushIssue(issues, 'extras', 'error', 'La lista de abonos no es válida.');
  } else {
    if (extras.length > 60) {
      pushIssue(issues, 'extras', 'error', 'Hay demasiados abonos configurados (máximo 60).');
    }
    const maxMonth = Number.isFinite(termMonths) ? Math.round(termMonths) : 0;
    extras.forEach((extra, index) => {
      const label = `Abono ${index + 1}`;
      if (!extra || typeof extra !== 'object') {
        pushIssue(issues, 'extras', 'error', `${label}: datos inválidos.`);
        return;
      }
      if (!Number.isFinite(extra.amount) || extra.amount < 0) {
        pushIssue(issues, 'extras', 'error', `${label}: el monto no puede ser negativo.`);
      }
      if (!Number.isFinite(extra.fromMonth) || extra.fromMonth < 1) {
        pushIssue(issues, 'extras', 'error', `${label}: el mes debe ser 1 o mayor.`);
      } else if (maxMonth > 0 && Math.round(extra.fromMonth) > maxMonth) {
        pushIssue(issues, 'extras', 'error', `${label}: el mes supera el plazo del crédito.`);
      } else if (!Number.isInteger(extra.fromMonth)) {
        pushIssue(
          issues,
          'extras',
          'warning',
          `${label}: el mes se ajustará al entero más cercano.`,
        );
      }
      if (extra.toMonth != null) {
        if (!Number.isFinite(extra.toMonth) || extra.toMonth < extra.fromMonth) {
          pushIssue(
            issues,
            'extras',
            'error',
            `${label}: el mes final debe ser mayor o igual al inicial.`,
          );
        } else if (maxMonth > 0 && Math.round(extra.toMonth) > maxMonth) {
          pushIssue(
            issues,
            'extras',
            'error',
            `${label}: el mes final supera el plazo del crédito.`,
          );
        }
      }
      if (!['once', 'monthly', 'annual'].includes(extra.frequency)) {
        pushIssue(issues, 'extras', 'error', `${label}: frecuencia no reconocida.`);
      }
    });
  }

  return issues;
}

function emptyAnalysis(
  config: LoanConfig,
  issues: ValidationIssue[],
  monthlyRate: number,
): LoanAnalysis {
  return {
    ok: false,
    issues,
    monthlyRate,
    annualRatePct: config.annualRatePct,
    nominalAnnualPct: nominalFromMonthly(monthlyRate),
    scheduledMonths: Math.max(0, Math.round(config.termMonths) || 0),
    rows: [],
    months: 0,
    fullyAmortized: false,
    negativeAmortization: false,
    principal: Number.isFinite(config.principal) ? config.principal : 0,
    totalInterest: 0,
    totalInsurance: 0,
    totalMonthlyFees: 0,
    originationFee: 0,
    disbursementGmf: 0,
    totalGmf: 0,
    totalExtras: 0,
    totalCost: 0,
    totalPaid: 0,
    totalPayments: 0,
    costBreakdown: { interest: 0, insurance: 0, fees: 0, gmf: 0 },
    costRatioPct: 0,
    netDisbursed: 0,
    monthlyIrr: null,
    effectiveCostEaPct: null,
    firstPayment: 0,
    lastPayment: 0,
    maxPayment: 0,
    maxTotalOutflow: 0,
    scheduledPayment: 0,
    totalPrincipalPaid: 0,
    totalCapitalizedInterest: 0,
    totalRegularPayments: 0,
  };
}

/**
 * Construye la tabla de amortización y todos los agregados.
 *
 * - `termMonths` incluye los meses de gracia.
 * - Los abonos se aplican después de la cuota regular del mes.
 * - `reduce-term` mantiene la cuota y acorta el plazo; `reduce-payment`
 *   mantiene el plazo y recalcula la cuota.
 */
export function computeLoan(config: LoanConfig): LoanAnalysis {
  const monthlyRate = monthlyRateFromEA(config.annualRatePct);
  const issues = validateConfig(config);
  const errors = issues.filter((issue) => issue.severity === 'error');

  if (errors.length > 0) {
    return emptyAnalysis(config, issues, monthlyRate);
  }

  const principal = Math.max(0, config.principal);
  const scheduledMonths = Math.max(1, Math.round(config.termMonths));
  const graceMonths =
    config.graceType === 'none'
      ? 0
      : Math.min(Math.max(0, Math.round(config.graceMonths)), scheduledMonths - 1);
  const insuranceRate = Math.max(0, config.costs.insuranceMonthlyPct) / 100;
  const monthlyFee = Math.max(0, config.costs.monthlyFee);
  const originationFee = principal * (Math.max(0, config.costs.originationPct) / 100);
  const disbursementGmf = config.costs.gmf ? principal * GMF_RATE : 0;
  const netDisbursed = principal - originationFee - disbursementGmf;

  const extras = config.extras
    .filter((extra) => Number.isFinite(extra.amount) && extra.amount > 0)
    .map((extra) => ({
      ...extra,
      fromMonth: Math.max(1, Math.min(scheduledMonths, Math.round(extra.fromMonth))),
      toMonth:
        extra.toMonth == null
          ? null
          : Math.max(1, Math.min(scheduledMonths, Math.round(extra.toMonth))),
    }));

  const rows: PaymentRow[] = [];
  let balance = principal;
  let totalInterest = 0;
  let totalInsurance = 0;
  let totalMonthlyFees = 0;
  let totalGmf = 0;
  let totalExtras = 0;
  let totalPayments = 0;
  let totalRegularPayments = 0;
  let totalPrincipalPaid = 0;
  let totalCapitalizedInterest = 0;
  let negativeAmortization = false;

  let scheduledPayment = 0;
  let scheduledCapital = 0;
  let month = 0;
  const guardMonths = scheduledMonths + SCHEDULE_GUARD_MONTHS;

  while (balance > BALANCE_EPSILON && month < guardMonths) {
    month += 1;
    const opening = balance;
    const inGrace = month <= graceMonths;
    const interest = opening * monthlyRate;
    let principalPayment = 0;
    let capitalizedInterest = 0;
    let regularPayment: number;

    if (inGrace && config.graceType === 'total') {
      capitalizedInterest = interest;
      balance = opening + interest;
      regularPayment = 0;
    } else if (inGrace) {
      // Gracia con pago de intereses: el capital no se mueve.
      regularPayment = interest;
      principalPayment = 0;
    } else {
      const remaining = scheduledMonths - month + 1;

      if (config.system === 'french') {
        if (month === graceMonths + 1 || config.strategy === 'reduce-payment') {
          scheduledPayment = monthlyPayment(balance, monthlyRate, remaining);
        }
        const principalRoom = Math.max(0, scheduledPayment - interest);
        principalPayment = Math.min(balance, principalRoom);
        regularPayment = interest + principalPayment;
      } else if (config.system === 'german') {
        if (month === graceMonths + 1 || config.strategy === 'reduce-payment') {
          scheduledCapital = balance / remaining;
        }
        principalPayment = Math.min(balance, Math.max(0, scheduledCapital));
        regularPayment = interest + principalPayment;
      } else {
        // Americano: intereses periódicos y capital al vencimiento.
        principalPayment = month === scheduledMonths ? balance : 0;
        regularPayment = interest + principalPayment;
      }

      if (config.system !== 'american' && principalPayment <= 0 && monthlyRate > 0) {
        negativeAmortization = true;
      }

      balance = Math.max(0, balance - principalPayment);
      totalPrincipalPaid += principalPayment;
    }

    const insurance = opening * insuranceRate;
    const fee = monthlyFee;
    const extraRequested = extraAmountForMonth(extras, month);
    const extra = Math.min(extraRequested, balance);
    balance = Math.max(0, balance - extra);

    const payment = regularPayment + insurance + fee;
    const gmf = config.costs.gmf ? (payment + extra) * GMF_RATE : 0;

    totalInterest += interest;
    totalCapitalizedInterest += capitalizedInterest;
    totalInsurance += insurance;
    totalMonthlyFees += fee;
    totalGmf += gmf;
    totalExtras += extra;
    totalPayments += payment + extra + gmf;
    totalRegularPayments += payment;

    rows.push({
      month,
      openingBalance: opening,
      interest,
      capitalizedInterest,
      principal: principalPayment,
      insurance,
      fee,
      gmf,
      extra,
      payment,
      total: payment + extra + gmf,
      balance,
      paidOff: balance <= BALANCE_EPSILON,
    });
  }

  const fullyAmortized = balance <= BALANCE_EPSILON;
  const totalFees = totalMonthlyFees + originationFee;
  const totalGmfAll = totalGmf + disbursementGmf;
  const totalCost = totalInterest + totalInsurance + totalFees + totalGmfAll;
  const totalPaid = totalPayments + originationFee + disbursementGmf;

  const cashFlows = [netDisbursed, ...rows.map((row) => -row.total)];
  const monthlyIrr = solveIrr(cashFlows);
  const effectiveCostEaPct =
    monthlyIrr != null && monthlyIrr > -1 ? (Math.pow(1 + monthlyIrr, 12) - 1) * 100 : null;

  const firstPayment = rows[0]?.payment ?? 0;
  const lastPayment = rows[rows.length - 1]?.payment ?? 0;
  const maxPayment = rows.reduce((max, row) => Math.max(max, row.payment), 0);
  const maxTotalOutflow = rows.reduce((max, row) => Math.max(max, row.total), 0);

  return {
    ok: true,
    issues,
    monthlyRate,
    annualRatePct: config.annualRatePct,
    nominalAnnualPct: nominalFromMonthly(monthlyRate),
    scheduledMonths,
    rows,
    months: rows.length,
    fullyAmortized,
    negativeAmortization,
    principal,
    totalInterest,
    totalInsurance,
    totalMonthlyFees,
    originationFee,
    disbursementGmf,
    totalGmf: totalGmfAll,
    totalExtras,
    totalCost,
    totalPaid,
    totalPayments,
    costBreakdown: {
      interest: totalInterest,
      insurance: totalInsurance,
      fees: totalFees,
      gmf: totalGmfAll,
    },
    costRatioPct: principal > 0 ? (totalCost / principal) * 100 : 0,
    netDisbursed,
    monthlyIrr,
    effectiveCostEaPct,
    firstPayment,
    lastPayment,
    maxPayment,
    maxTotalOutflow,
    scheduledPayment,
    totalPrincipalPaid,
    totalCapitalizedInterest,
    totalRegularPayments,
  };
}

/**
 * TIR mensual por bisección. El flujo 0 es positivo (desembolso neto) y los
 * siguientes son negativos (pagos). Devuelve `null` si no hay raíz válida.
 */
export function solveIrr(cashFlows: readonly number[]): number | null {
  if (cashFlows.length < 2 || !(cashFlows[0] > 0)) return null;
  if (!cashFlows.some((flow) => flow < 0)) return null;

  const npv = (rate: number): number => {
    let value = 0;
    for (let index = 0; index < cashFlows.length; index += 1) {
      value += cashFlows[index] / Math.pow(1 + rate, index);
    }
    return value;
  };

  let low = -0.9;
  let high = 10;
  let lowValue = npv(low);
  const highValue = npv(high);

  if (!Number.isFinite(lowValue) || !Number.isFinite(highValue)) return null;
  if (lowValue * highValue > 0) return null;

  for (let iteration = 0; iteration < 240; iteration += 1) {
    const mid = (low + high) / 2;
    const value = npv(mid);
    if (!Number.isFinite(value)) return null;
    if (Math.abs(value) < 1e-9) return mid;
    if (lowValue * value <= 0) {
      high = mid;
    } else {
      low = mid;
      lowValue = value;
    }
    if (high - low < 1e-12) break;
  }

  const result = (low + high) / 2;
  return Number.isFinite(result) ? result : null;
}
