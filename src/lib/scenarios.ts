import type { LoanConfig } from './credit';

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  config: LoanConfig;
}

export const MAX_SCENARIOS = 8;
