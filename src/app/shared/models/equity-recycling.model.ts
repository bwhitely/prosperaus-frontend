export interface EquityRecyclingRequest {
  propertyValue: number;
  mortgageBalance: number;
  interestRate: number;
  offsetBalance?: number;
  amountToRecycle: number;
  expectedReturn: number;
  marginalTaxRate: number;
  projectionYears: number;
  dividendYield?: number;
  frankingRate?: number;
}

export interface EquityRecyclingResponse {
  availableEquity: number;
  amountRecycled: number;
  annualInterestCost: number;
  annualTaxDeduction: number;
  netAnnualCost: number;
  baselineWealth: number;
  recyclingWealth: number;
  totalBenefit: number;
  percentageBenefit: number;
  yearlyProjections: YearlyProjection[];
  taxBenefits: TaxBenefitBreakdown;
  breakEvenReturn: number;
  riskAssessment: string;
}

export interface YearlyProjection {
  year: number;
  baselineValue: number;
  recyclingValue: number;
  cumulativeTaxBenefit: number;
  cumulativeInterestCost: number;
  netBenefit: number;
}

export interface TaxBenefitBreakdown {
  interestDeduction: number;
  frankingCredits: number;
  totalAnnualBenefit: number;
  effectiveReturnBoost: number;
}
