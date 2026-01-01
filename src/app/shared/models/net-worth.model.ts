export interface AssetBreakdown {
  propertyValue: number;
  superBalance: number;
  investmentValue: number;
  cashBalance: number;
}

export interface LiabilityBreakdown {
  mortgageBalance: number;
  creditCardBalance: number;
  personalLoans: number;
  carLoans: number;
  hecsHelp: number;
  otherLiabilities: number;
}

export interface AssetAllocation {
  category: string;
  value: number;
  percentage: number;
}

export interface NetWorthResponse {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetBreakdown: AssetBreakdown;
  liabilityBreakdown: LiabilityBreakdown;
  assetAllocation: AssetAllocation[];
  calculatedAt: string;
}

export interface NetWorthHistoryDataPoint {
  date: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface NetWorthHistorySummary {
  startValue: number;
  endValue: number;
  change: number;
  changePercent: number;
  startDate: string;
  endDate: string;
  dataPointCount: number;
}

export interface NetWorthHistoryResponse {
  dataPoints: NetWorthHistoryDataPoint[];
  summary: NetWorthHistorySummary;
}
