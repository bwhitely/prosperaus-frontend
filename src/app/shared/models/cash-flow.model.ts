// Income

export type IncomeFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually';

export interface IncomeSourceRequest {
  name: string;
  sourceType: string;
  grossAmount: number;
  frequency: IncomeFrequency;
  taxWithheld?: number;
  isActive?: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface IncomeSourceResponse {
  id: string;
  name: string;
  sourceType: string;
  grossAmount: number;
  frequency: IncomeFrequency;
  taxWithheld?: number;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
  annualisedAmount: number;
  monthlyAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Expense Categories

export interface ExpenseCategoryRequest {
  name: string;
  icon?: string;
  color?: string;
  displayOrder?: number;
}

export interface ExpenseCategoryResponse {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  isDefault: boolean;
  displayOrder: number;
  isSystemDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// User Expenses

export type ExpenseFrequency = 'weekly' | 'fortnightly' | 'monthly' | 'quarterly' | 'annually' | 'one_off';

export interface UserExpenseRequest {
  categoryId?: string;
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
  isRecurring?: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

export interface UserExpenseResponse {
  id: string;
  categoryId?: string;
  categoryName?: string;
  name: string;
  amount: number;
  frequency: ExpenseFrequency;
  isRecurring: boolean;
  startDate?: string;
  endDate?: string;
  notes?: string;
  annualisedAmount: number;
  monthlyAmount: number;
  createdAt: string;
  updatedAt: string;
}

// Bank Statements

export type UploadStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'awaiting_analysis';

export type BankFormat = 'CBA' | 'WESTPAC' | 'ANZ' | 'NAB' | 'GENERIC';

export const BANK_FORMAT_OPTIONS: { value: BankFormat; label: string }[] = [
  { value: 'CBA', label: 'Commonwealth Bank' },
  { value: 'WESTPAC', label: 'Westpac' },
  { value: 'ANZ', label: 'ANZ' },
  { value: 'NAB', label: 'NAB' },
  { value: 'GENERIC', label: 'Other Bank' }
];

export interface BankStatementUploadRequest {
  accountName?: string;
  institution?: string;
  periodStart?: string;
  periodEnd?: string;
  bankFormat?: BankFormat;
  password?: string;
}

export interface BankStatementUploadResponse {
  id: string;
  filename: string;
  fileType: 'csv' | 'pdf';
  fileSizeBytes?: number;
  accountName?: string;
  institution?: string;
  periodStart?: string;
  periodEnd?: string;
  status: UploadStatus;
  errorMessage?: string;
  transactionCount: number;
  totalInflow: number;
  totalOutflow: number;
  categorisedCount: number;
  pendingReviewCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BankTransactionResponse {
  id: string;
  uploadId: string;
  transactionDate: string;
  description: string;
  amount: number;
  categoryId?: string;
  categoryName?: string;
  isExpense: boolean;
  confidenceScore?: number;
  isManuallyCategorised: boolean;
  originalCategory?: string;
  notes?: string;
  createdAt: string;
}

export interface BankTransactionCategoriseRequest {
  categoryId: string;
}

// Cash Flow Summary

export interface IncomeBreakdown {
  sourceType: string;
  monthlyAmount: number;
}

export interface ExpenseBreakdown {
  categoryName: string;
  monthlyAmount: number;
}

export interface CashFlowSummaryResponse {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  monthlySavings: number;
  savingsRate: number;
  incomeBreakdown: IncomeBreakdown[];
  expenseBreakdown: ExpenseBreakdown[];
}

// Statement Analysis (LLM-powered)

export interface AnalysisSummary {
  totalTransactions: number;
  categorisedTransactions: number;
  uncategorisedTransactions: number;
  totalSpending: number;
  totalIncome: number;
  netFlow: number;
}

export interface CategorySuggestion {
  transactionId: string;
  categoryId: string;
  categoryName: string;
  confidenceScore: number;
  reason: string;
}

export interface SpendingSummary {
  totalSpending: number;
  totalIncome: number;
  spendingByCategory: Record<string, number>;
  topMerchants: string[];
  averageTransactionSize: number;
}

export interface StatementAnalysisResponse {
  uploadId: string | null;
  status: string;
  summary: AnalysisSummary;
  categorySuggestions: CategorySuggestion[];
  insights: string[];
  spendingSummary: SpendingSummary;
}

// Migration (convert bank transactions to income/expenses)

export interface MigrationPreviewRequest {
  startDate?: string;
  endDate?: string;
}

export interface DetectedIncome {
  id: string;
  name: string;
  sourceType: string;
  amount: number;
  frequency: IncomeFrequency;
  transactionCount: number;
  sampleDescriptions: string[];
  confidence: number;
}

export interface DetectedExpense {
  id: string;
  name: string;
  categoryId?: string;
  categoryName?: string;
  amount: number;
  frequency: ExpenseFrequency;
  isRecurring: boolean;
  transactionCount: number;
  sampleDescriptions: string[];
  confidence: number;
}

export interface MigrationSummary {
  incomeSourceCount: number;
  expenseCount: number;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  monthlySurplus: number;
  existingIncomeCount: number;
  existingExpenseCount: number;
}

export interface MigrationPreviewResponse {
  detectedIncome: DetectedIncome[];
  detectedExpenses: DetectedExpense[];
  summary: MigrationSummary;
  warnings: string[];
}

export interface IncomeToCreate {
  name: string;
  sourceType: string;
  grossAmount: number;
  frequency: IncomeFrequency;
  notes?: string;
}

export interface ExpenseToCreate {
  name: string;
  categoryId?: string;
  amount: number;
  frequency: ExpenseFrequency;
  isRecurring: boolean;
  notes?: string;
}

export interface MigrationApplyRequest {
  incomeSources: IncomeToCreate[];
  expenses: ExpenseToCreate[];
  confirmReplace: boolean;
}

export interface MigrationApplyResponse {
  status: string;
  incomeSourcesCreated: number;
  expensesCreated: number;
  incomeSourcesDeleted: number;
  expensesDeleted: number;
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  message: string;
}
