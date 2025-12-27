// Cash Account types
export type CashAccountType = 'transaction' | 'savings' | 'term_deposit' | 'offset' | 'other';
export type InterestPaymentFrequency = 'monthly' | 'quarterly' | 'annually' | 'at_maturity';

export interface CashAccountRequest {
  accountName: string;
  institution?: string;
  accountType?: CashAccountType;
  balance: number;
  balanceDate?: string;
  interestRate?: number;
  maturityDate?: string;
  linkedMortgageId?: string;

  // Enhanced fields for savings accounts
  bonusRate?: number;
  bonusConditions?: string;

  // Enhanced fields for term deposits
  interestPaymentFrequency?: InterestPaymentFrequency;
  principal?: number;
  startDate?: string;
}

export interface CashAccountResponse {
  id: string;
  accountName: string;
  institution?: string;
  accountType: CashAccountType;
  balance: number;
  balanceDate?: string;
  interestRate?: number;
  maturityDate?: string;
  linkedMortgageId?: string;

  // Enhanced fields for savings accounts
  bonusRate?: number;
  bonusConditions?: string;
  totalInterestRate?: number;

  // Enhanced fields for term deposits
  interestPaymentFrequency?: InterestPaymentFrequency;
  principal?: number;
  startDate?: string;

  createdAt: string;
  updatedAt: string;
}

// Liability types
export type LiabilityType = 'credit_card' | 'personal_loan' | 'car_loan' | 'hecs_help' | 'margin_loan' | 'other';
export type PaymentFrequency = 'weekly' | 'fortnightly' | 'monthly';

export interface LiabilityRequest {
  name: string;
  liabilityType: LiabilityType;
  balance: number;
  balanceDate?: string;
  interestRate?: number;
  minimumRepayment?: number;

  // Credit card fields
  creditLimit?: number;
  availableCredit?: number;
  dueDate?: number;
  statementDate?: number;
  annualFee?: number;

  // Loan fields
  originalAmount?: number;
  termMonths?: number;
  startDate?: string;
  paymentFrequency?: PaymentFrequency;
  institution?: string;
}

export interface LiabilityResponse {
  id: string;
  name: string;
  liabilityType: LiabilityType;
  balance: number;
  balanceDate?: string;
  interestRate?: number;
  minimumRepayment?: number;

  // Credit card fields
  creditLimit?: number;
  availableCredit?: number;
  dueDate?: number;
  statementDate?: number;
  annualFee?: number;

  // Loan fields
  originalAmount?: number;
  termMonths?: number;
  startDate?: string;
  paymentFrequency?: PaymentFrequency;
  institution?: string;

  // Helper fields
  isCreditCard: boolean;
  isLoan: boolean;

  createdAt: string;
  updatedAt: string;
}

// Convenience groupings for display
export interface CashAccountsByType {
  transaction: CashAccountResponse[];
  savings: CashAccountResponse[];
  termDeposits: CashAccountResponse[];
  offset: CashAccountResponse[];
  other: CashAccountResponse[];
}

export interface LiabilitiesByType {
  creditCards: LiabilityResponse[];
  personalLoans: LiabilityResponse[];
  carLoans: LiabilityResponse[];
  hecsHelp: LiabilityResponse[];
  marginLoans: LiabilityResponse[];
  other: LiabilityResponse[];
}
