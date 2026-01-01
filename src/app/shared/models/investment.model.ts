export interface InvestmentHoldingRequest {
  ticker: string;
  securityName?: string;
  securityType?: string;
  units: number;
  costBase: number;
  acquisitionDate?: string;
  currentPrice?: number;
}

export interface InvestmentHoldingResponse {
  id: string;
  ticker: string;
  securityName?: string;
  securityType: string;
  units: number;
  costBase: number;
  acquisitionDate?: string;
  currentPrice?: number;
  priceUpdatedAt?: string;
  averageCostPerUnit: number;
  currentValue: number;
  unrealisedGainLoss: number;
  createdAt: string;
  updatedAt: string;
  // ETF metadata fields (nullable for non-ETFs or unknown ETFs)
  mer?: number;
  estimatedFrankingPercentage?: number;
  estimatedDividendYield?: number;
  category?: string;
  issuer?: string;
}

export interface StockQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  lastUpdated: string;
}

// Security search
export interface SecuritySearchResult {
  ticker: string;
  name: string;
  type: string;
}

// ETF Metadata
export interface EtfMetadata {
  ticker: string;
  name: string;
  category: string;
  assetClass: string;
  geography: string;
  issuer: string;
  mer: number;
  distributionFrequency: string;
  estimatedFrankingPercentage: number;
  estimatedDividendYield?: number;
}

// Portfolio Analysis
export interface PortfolioAnalysisRequest {
  holdings: HoldingInput[];
}

export interface HoldingInput {
  ticker: string;
  units: number;
  costBase: number;
  currentPrice: number;
}

export interface PortfolioAnalysisResponse {
  totalValue: number;
  totalCostBase: number;
  unrealisedGainLoss: number;
  unrealisedGainLossPercent: number;

  // New weighted allocations
  countryAllocation: CountryAllocation[];
  gicsSectorAllocation: GicsSectorAllocation[];
  assetTypeAllocation: AssetTypeAllocation[];

  // Legacy allocation (for category breakdown)
  categoryAllocation: Record<string, AllocationBreakdown>;

  weightedAverageMer: number;
  estimatedAnnualFees: number;
  estimatedAnnualFrankingCredits: number;
  estimatedDividendYield: number;
  overlapWarnings: OverlapWarning[];
  holdings: HoldingAnalysis[];
}

// Country allocation with code and display name
export interface CountryAllocation {
  code: string;        // ISO 2-letter code: AU, US, GB, JP, etc.
  name: string;        // Display name: Australia, United States, etc.
  region: string | null; // Optional region grouping
  value: number;
  percentage: number;
}

// GICS sector allocation (equity sectors only)
export interface GicsSectorAllocation {
  code: string;        // GICS code: 10, 15, 20, etc.
  name: string;        // Sector name: Energy, Materials, etc.
  value: number;
  percentage: number;
}

// Asset type allocation (high-level breakdown)
export interface AssetTypeAllocation {
  type: string;        // EQUITIES, BONDS, CASH, GOLD, PROPERTY
  displayName: string; // Equities, Bonds, Cash, Gold, Property
  value: number;
  percentage: number;
}

// Legacy allocation breakdown (for category)
export interface AllocationBreakdown {
  value: number;
  percentage: number;
}

export interface OverlapWarning {
  tickers: string[];
  description: string;
  severity: 'low' | 'medium' | 'high';
  overlapPercentage: number;
}

export interface HoldingAnalysis {
  ticker: string;
  name: string | null;
  category: string | null;
  geography: string | null;      // Legacy field - kept for compatibility
  assetClass: string | null;     // Legacy field - kept for compatibility
  units: number;
  currentPrice: number | null;
  value: number | null;
  portfolioPercentage: number;
  costBase: number | null;
  unrealisedGainLoss: number | null;
  unrealisedGainLossPercent: number | null;
  mer: number | null;
  estimatedFrankingPercentage: number | null;
  estimatedDividendYield: number | null;
  hasMetadata: boolean;
}
