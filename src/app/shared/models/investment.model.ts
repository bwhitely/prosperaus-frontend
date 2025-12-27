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
  geographyAllocation: Record<string, AllocationBreakdown>;
  assetClassAllocation: Record<string, AllocationBreakdown>;
  categoryAllocation: Record<string, AllocationBreakdown>;
  weightedAverageMer: number;
  estimatedAnnualFees: number;
  estimatedAnnualFrankingCredits: number;
  estimatedDividendYield: number;
  overlapWarnings: OverlapWarning[];
  holdings: HoldingAnalysis[];
}

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
  geography: string | null;
  assetClass: string | null;
  units: number;
  currentPrice: number | null;
  value: number | null;
  portfolioPercentage: number;
  costBase: number | null;
  unrealisedGainLoss: number | null;
  unrealisedGainLossPercent: number | null;
  mer: number | null;
  estimatedFrankingPercentage: number | null;
  hasMetadata: boolean;
}
