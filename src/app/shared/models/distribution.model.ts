// Distribution types
export type DistributionType = 'dividend' | 'distribution' | 'drp' | 'special';

export interface DistributionRequest {
  holdingId: string;
  distributionType?: DistributionType;
  distributionDate: string;
  paymentDate?: string;
  exDate?: string;
  recordDate?: string;
  amountPerUnit: number;
  unitsHeld: number;
  frankingPercentage?: number;
  isDrp?: boolean;
  drpUnits?: number;
  drpPrice?: number;
  notes?: string;
}

export interface DistributionResponse {
  id: string;
  holdingId: string;
  ticker: string;
  securityName?: string;

  distributionType: DistributionType;
  distributionDate: string;
  paymentDate?: string;
  exDate?: string;
  recordDate?: string;

  amountPerUnit: number;
  unitsHeld: number;
  grossAmount: number;

  frankingPercentage: number;
  frankingCredits: number;
  grossedUpAmount: number;

  financialYear: string;

  isDrp: boolean;
  drpUnits?: number;
  drpPrice?: number;

  notes?: string;
  createdAt: string;
}

// Summary types
export interface HoldingDistributionSummary {
  holdingId: string;
  ticker: string;
  securityName?: string;
  totalDividends: number;
  totalFrankingCredits: number;
  distributionCount: number;
  averageFrankingPercentage: number;
}

export interface YearSummary {
  financialYear: string;
  totalDividends: number;
  totalFrankingCredits: number;
  distributionCount: number;
}

export interface DistributionSummaryResponse {
  financialYear: string;
  financialYearDisplay: string;

  totalDividends: number;
  totalFrankingCredits: number;
  totalGrossedUp: number;
  distributionCount: number;

  holdingSummaries: HoldingDistributionSummary[];
  historicalYears: YearSummary[];
}

// Projection types
export interface HoldingProjection {
  holdingId: string;
  ticker: string;
  securityName?: string;
  currentValue: number;
  dividendYield: number;
  projectedDividend: number;
  estimatedFrankingPercentage: number;
  estimatedFrankingCredits: number;
  grossedUpProjected: number;
  distributionFrequency?: string;
}

export interface DividendProjectionResponse {
  totalProjectedDividends: number;
  totalEstimatedFrankingCredits: number;
  totalGrossedUpProjected: number;
  holdingProjections: HoldingProjection[];
}
