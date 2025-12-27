export interface PropertyRequest {
  name: string;
  currentValue: number;
  propertyType?: string;
  address?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  lastValuationDate?: string;
  isInvestment?: boolean;
  weeklyRent?: number;
  annualExpenses?: number;
}

export interface PropertyResponse {
  id: string;
  name: string;
  currentValue: number;
  propertyType: string;
  address?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  lastValuationDate?: string;
  isInvestment: boolean;
  weeklyRent?: number;
  annualExpenses?: number;
  equity: number;
  createdAt: string;
  updatedAt: string;
}

export interface MortgageRequest {
  propertyId: string;
  lender?: string;
  loanName?: string;
  originalAmount?: number;
  currentBalance: number;
  offsetBalance?: number;
  redrawAvailable?: number;
  interestRate: number;
  isFixed?: boolean;
  fixedRateExpiry?: string;
  loanTermMonths?: number;
  remainingTermMonths?: number;
  repaymentType?: string;
  isDeductible?: boolean;
  deductiblePortion?: number;
}

export interface MortgageResponse {
  id: string;
  propertyId: string;
  lender?: string;
  loanName?: string;
  originalAmount?: number;
  currentBalance: number;
  offsetBalance: number;
  redrawAvailable: number;
  effectiveBalance: number;
  interestRate: number;
  isFixed: boolean;
  fixedRateExpiry?: string;
  loanTermMonths?: number;
  remainingTermMonths?: number;
  repaymentType: string;
  isDeductible: boolean;
  deductiblePortion: number;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyWithMortgages extends PropertyResponse {
  mortgages: MortgageResponse[];
}
