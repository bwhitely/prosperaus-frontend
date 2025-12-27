export interface FireProjectionRequest {
  currentAge: number;
  targetRetirementAge?: number;
  currentSuperBalance: number;
  currentNonSuperInvestments: number;
  annualGrossIncome: number;
  annualExpenses: number;
  annualSavings?: number;
  preRetirementReturnRate?: number;
  postRetirementReturnRate?: number;
  superGuaranteeRate?: number;
  annualSalarySacrifice?: number;
  inflationRate?: number;
  safeWithdrawalRate?: number;
  includeAgePension?: boolean;
}

export interface YearProjection {
  year: number;
  age: number;
  superBalance: number;
  nonSuperBalance: number;
  totalAssets: number;
  superContributions: number;
  nonSuperContributions: number;
  investmentReturns: number;
  annualExpenses: number;
  superWithdrawal: number;
  nonSuperWithdrawal: number;
  agePensionIncome: number;
  hasFired: boolean;
  canAccessSuper: boolean;
  receivingAgePension: boolean;
  surplusOrDeficit: number;
}

export interface FireProjectionResponse {
  canAchieveFire: boolean;
  fireAge: number | null;
  yearsToFire: number | null;
  fireNumber: number;
  safeWithdrawalAmount: number;
  superBalanceAtFire: number;
  nonSuperBalanceAtFire: number;
  totalAssetsAtFire: number;
  superBalanceAtPreservation: number;
  nonSuperBalanceAtPreservation: number;
  agePensionEligibilityAge: number;
  estimatedAgePensionPerYear: number;
  projections: YearProjection[];
  insights: string[];
}

export interface FirePrefillData {
  currentAge?: number;
  targetRetirementAge?: number;
  currentSuperBalance?: number;
  currentNonSuperInvestments?: number;
  annualGrossIncome?: number;
  annualExpenses?: number;
  annualSavings?: number;
  annualSalarySacrifice?: number;
}
