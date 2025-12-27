// Net Worth Projection Request

export interface NetWorthProjectionRequest {
  personal: PersonalDetails;
  superannuation?: SuperDetails;
  incomeSources?: IncomeSourceInput[];
  ppor?: PporDetails;
  investmentProperties?: InvestmentPropertyInput[];
  shares?: SharesDetails;
  cash?: CashDetails;
  expenses?: ExpensesDetails;
  tax?: TaxDetails;
  projectionYears: number;
}

export interface PersonalDetails {
  currentAge: number;
  targetRetirementAge?: number;
  stateOfResidence?: string;
}

export interface SuperDetails {
  currentBalance?: number;
  growthRate?: number;
  sgRate?: number;
  salarySacrifice?: number;
  employerMatch?: number;
  preservationAge?: number;
}

export interface IncomeSourceInput {
  name?: string;
  sourceType: string;
  amount: number;
  frequency: 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';
  annualGrowthRate?: number;
}

export interface PporDetails {
  currentValue?: number;
  mortgageBalance?: number;
  interestRate?: number;
  offsetBalance?: number;
  growthRate?: number;
  extraRepayments?: number;
  remainingTermYears?: number;
}

export interface InvestmentPropertyInput {
  name?: string;
  currentValue: number;
  mortgageBalance?: number;
  interestRate?: number;
  weeklyRent?: number;
  annualExpenses?: number;
  growthRate?: number;
}

export interface SharesDetails {
  currentValue?: number;
  annualContributions?: number;
  growthRate?: number;
  weightedMer?: number;
  dividendYield?: number;
  frankingRate?: number;
}

export interface CashDetails {
  currentBalance?: number;
  monthlySavings?: number;
  interestRate?: number;
}

export interface ExpensesDetails {
  annualAmount?: number;
  inflationRate?: number;
}

export interface TaxDetails {
  marginalTaxRate?: number;
  includeFrankingCredits?: boolean;
}

// Net Worth Projection Response

export interface NetWorthProjectionResponse {
  summary: SummaryMetrics;
  milestones: Milestones;
  yearlyBreakdown: YearlyBreakdown[];
  currentAllocation: AssetAllocation;
  retirementAllocation: AssetAllocation;
  endAllocation: AssetAllocation;
  insights: string[];
}

export interface SummaryMetrics {
  currentNetWorth: number;
  projectedNetWorth: number;
  netWorthIn1Year: number | null;
  netWorthIn5Years: number | null;
  netWorthIn10Years: number | null;
  netWorthIn20Years: number | null;
  netWorthIn30Years: number | null;
  totalGrowth: number;
  percentageGrowth: number;
  averageAnnualGrowthRate: number;
  peakSavingsRate: number;
  yearsToFirstMillion: number | null;
  yearsToFire: number | null;
}

export interface Milestones {
  superAccessAge: number;
  yearsToSuperAccess: number;
  superBalanceAtAccess: number;
  mortgagePayoffAge: number | null;
  yearsToMortgagePayoff: number | null;
  fireAge: number | null;
  yearsToFire: number | null;
  netWorthAtFire: number | null;
  fireAchievable: boolean;
  fireStatus: string;
  pensionEligibilityAge: number;
  netWorthAtPensionAge: number | null;
  likelyPensionEligible: boolean;
  firstMillionAge: number | null;
  yearsToFirstMillion: number | null;
}

export interface YearlyBreakdown {
  year: number;
  age: number;
  superBalance: number;
  pporValue: number;
  pporEquity: number;
  investmentPropertiesValue: number;
  investmentPropertiesEquity: number;
  sharesValue: number;
  cashBalance: number;
  totalAssets: number;
  pporMortgage: number;
  investmentMortgages: number;
  totalLiabilities: number;
  netWorth: number;
  netWorthChange: number;
  netWorthChangePercent: number;
  grossIncome: number;
  netIncome: number;
  rentalIncome: number;
  dividendIncome: number;
  totalExpenses: number;
  annualSavings: number;
  savingsRate: number;
  superContributions: number;
  employerContributions: number;
  salarySacrifice: number;
  estimatedTax: number;
  frankingCreditsReceived: number;
  negativeGearingBenefit: number;
  isSuperAccessible: boolean;
  isMortgagePaidOff: boolean;
  isRetired: boolean;
}

export interface AssetAllocation {
  year: number;
  age: number;
  totalNetWorth: number;
  superAmount: number;
  propertyEquityAmount: number;
  sharesAmount: number;
  cashAmount: number;
  superPercent: number;
  propertyEquityPercent: number;
  sharesPercent: number;
  cashPercent: number;
}
