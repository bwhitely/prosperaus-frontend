// CGT Parcel models
export interface ParcelRequest {
  purchaseDate: string;
  units: number;
  pricePerUnit: number;
  brokerage?: number;
  notes?: string;
}

export interface ParcelResponse {
  id: string;
  holdingId: string;
  purchaseDate: string;
  units: number;
  pricePerUnit: number;
  brokerage: number;
  totalCost: number;
  remainingUnits: number;
  remainingCostBase: number;
  costBasePerUnit: number;
  daysHeld: number;
  cgtDiscountEligible: boolean;
  notes?: string;
  createdAt: string;
}

// CGT Holding Response
export interface ParcelBreakdown {
  parcelId: string;
  purchaseDate: string;
  units: number;
  costBase: number;
  currentValue: number;
  unrealisedGain: number;
  daysHeld: number;
  cgtDiscountEligible: boolean;
  estimatedTaxableGain: number;
}

export interface CgtHoldingResponse {
  holdingId: string;
  ticker: string;
  securityName?: string;

  // Current position
  totalUnits: number;
  totalCostBase: number;
  currentValue: number;
  currentPrice: number;

  // Unrealised gains
  unrealisedGain: number;
  discountableGain: number;
  nonDiscountableGain: number;
  estimatedTaxableGain: number;
  hasLoss: boolean;

  // Estimated tax impact
  estimatedCgtPayable: number;
  marginalTaxRateUsed: number;

  // Parcel breakdown
  parcels: ParcelBreakdown[];

  // Realised gains
  totalRealisedGains: number;
  totalRealisedLosses: number;
  salesCount: number;
}

// CGT Summary Response
export interface HoldingCgtSummary {
  holdingId: string;
  ticker: string;
  securityName?: string;
  unrealisedGain: number;
  estimatedTaxableGain: number;
  hasLoss: boolean;
  parcelsCount: number;
  discountEligibleParcels: number;
}

export interface FinancialYearSummary {
  financialYear: string;
  totalGains: number;
  totalLosses: number;
  netPosition: number;
  discountApplied: number;
  taxableGains: number;
  transactionCount: number;
}

export interface CgtSummaryResponse {
  currentFinancialYear: string;
  financialYearDisplay: string;

  // Unrealised position
  totalUnrealisedGains: number;
  totalUnrealisedLosses: number;
  netUnrealisedPosition: number;
  estimatedTaxableUnrealisedGains: number;

  // Realised position
  totalRealisedGains: number;
  totalRealisedLosses: number;
  netRealisedPosition: number;
  cgtDiscountApplied: number;
  taxableRealisedGains: number;

  // Tax estimates
  estimatedCgtPayable: number;
  marginalTaxRateUsed: number;

  // Breakdowns
  holdingSummaries: HoldingCgtSummary[];
  historicalYears: FinancialYearSummary[];
}

// CGT Optimisation Response
export interface TaxLossHarvestingOpportunity {
  holdingId: string;
  ticker: string;
  currentLoss: number;
  estimatedTaxSavings: number;
  recommendation: string;
}

export interface ApproachingDiscountEligibility {
  holdingId: string;
  parcelId: string;
  ticker: string;
  purchaseDate: string;
  discountEligibleDate: string;
  daysUntilEligible: number;
  units: number;
  unrealisedGain: number;
  potentialTaxSavings: number;
}

export interface DeferralOpportunity {
  holdingId: string;
  ticker: string;
  currentTaxableGain: number;
  potentialTaxSavingsIfDeferred: number;
  reason: string;
}

export interface CgtOptimisationResponse {
  financialYear: string;

  // Current position
  currentTaxableGains: number;
  currentLosses: number;
  netPosition: number;
  estimatedCgtPayable: number;

  // Opportunities
  lossHarvestingOpportunities: TaxLossHarvestingOpportunity[];
  approachingDiscountEligibility: ApproachingDiscountEligibility[];
  deferralOpportunities: DeferralOpportunity[];

  // Recommendations
  recommendations: string[];
}
