/**
 * Models for Investment Property Analysis.
 */

export interface PropertyAnalysisRequest {
  // Purchase Details
  purchasePrice: number;
  depositAmount: number;
  stampDuty?: number;
  otherPurchaseCosts?: number;

  // Loan Details
  interestRate: number;
  loanTermYears: number;
  isInterestOnly?: boolean;
  interestOnlyPeriodYears?: number;

  // Rental Income
  weeklyRent: number;
  vacancyRate?: number;
  rentGrowthRate?: number;

  // Annual Expenses
  councilRates?: number;
  waterRates?: number;
  strataFees?: number;
  insurance?: number;
  maintenance?: number;
  managementFeeRate?: number;
  otherExpenses?: number;

  // Growth Assumptions
  capitalGrowthRate?: number;

  // Tax Details
  marginalTaxRate: number;
  annualDepreciation?: number;

  // Comparison Settings
  etfReturnRate?: number;
  projectionYears?: number;
}

export interface PropertyAnalysisResponse {
  // Summary Metrics
  grossYield: number;
  netYield: number;
  cashOnCashReturn: number;
  isNegativelyGeared: boolean;

  // Year 1 Cash Flow Breakdown
  year1CashFlow: AnnualCashFlow;

  // Tax Analysis
  totalDeductions: number;
  taxBenefit: number;
  netPositionAfterTax: number;
  weeklyNetCost: number;

  // Loan Details
  loanAmount: number;
  monthlyRepayment: number;
  annualInterest: number;
  lvr: number;

  // Year-by-Year Projections
  projections: YearProjection[];

  // ETF Comparison
  etfComparison: EtfComparison;

  // CGT Scenarios
  cgtScenarios: CgtScenario[];

  // Key Insights
  insights: string[];

  // Input Echo
  totalUpfrontCosts: number;
}

export interface AnnualCashFlow {
  grossRent: number;
  vacancyAllowance: number;
  netRent: number;
  councilRates: number;
  waterRates: number;
  strataFees: number;
  insurance: number;
  maintenance: number;
  managementFees: number;
  otherExpenses: number;
  totalExpenses: number;
  interestPayments: number;
  depreciation: number;
  totalDeductions: number;
  netCashFlow: number;
  taxableIncome: number;
}

export interface YearProjection {
  year: number;
  propertyValue: number;
  loanBalance: number;
  equity: number;
  annualRent: number;
  annualExpenses: number;
  annualInterest: number;
  netCashFlow: number;
  taxBenefit: number;
  netPositionAfterTax: number;
  cumulativeEquityGrowth: number;
  cumulativeCashFlow: number;
}

export interface EtfComparison {
  initialInvestment: number;
  returnRate: number;
  yearlyValues: EtfYear[];
  propertyTotalReturn: number;
  etfTotalReturn: number;
  propertyAnnualisedReturn: number;
  winner: string;
  difference: number;
}

export interface EtfYear {
  year: number;
  value: number;
  totalContributions: number;
  totalGrowth: number;
}

export interface CgtScenario {
  yearsHeld: number;
  salePrice: number;
  capitalGain: number;
  discountedGain: number;
  cgtPayable: number;
  netProceeds: number;
  totalReturn: number;
  annualisedReturn: number;
}
