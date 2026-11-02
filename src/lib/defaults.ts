import type { AffordabilityInput } from './affordability';
import type { LoanConfig } from './credit';

export const APP_NAME = 'Analizador de Crédito';
export const APP_VERSION = '1.0.0';
export const REPOSITORY_URL = 'https://github.com/Macorreag/analizador-credito';
export const PAGES_URL = 'https://macorreag.github.io/analizador-credito/';

/**
 * Referencia pública de la tasa de usura para crédito de consumo en Colombia.
 * Es editable en la app: las tasas cambian cada mes y la fuente oficial manda.
 */
export const USURY_REFERENCE = {
  ratePct: 28.34,
  periodLabel: 'noviembre de 2026',
  updatedAt: '2026-11-01',
  sourceLabel: 'Superfinanciera de Colombia',
  sourceUrl:
    'https://www.superfinanciera.gov.co/publicaciones/10116173/superfinanciera-certifica-el-interes-bancario-corriente/',
} as const;

export const DEFAULT_CONFIG: LoanConfig = {
  principal: 50_000_000,
  annualRatePct: 18,
  termMonths: 60,
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
};

export const DEFAULT_AFFORDABILITY: AffordabilityInput = {
  monthlyIncome: 0,
  otherMonthlyDebt: 0,
  maxDtiPct: 40,
  stressBps: 200,
  investmentEaPct: 0,
};

export const DEFAULT_USURY_EA_PCT = USURY_REFERENCE.ratePct;
