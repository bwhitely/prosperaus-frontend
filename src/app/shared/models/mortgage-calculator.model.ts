/**
 * Request interface for mortgage calculator.
 */
export interface MortgageCalculatorRequest {
  // Loan Details
  loanAmount: number;
  interestRate: number; // Annual rate as decimal (e.g., 0.065 for 6.5%)
  loanTermYears: number;
  repaymentFrequency: 'weekly' | 'fortnightly' | 'monthly';

  // Offset Account (optional)
  offsetStartBalance?: number;
  offsetContribution?: number;
  offsetContributionFrequency?: 'weekly' | 'fortnightly' | 'monthly';

  // Extra Repayments (optional)
  extraRepaymentAmount?: number;
  extraRepaymentFrequency?: 'weekly' | 'fortnightly' | 'monthly';

  // Lump Sum Payment (optional)
  lumpSumAmount?: number;
  lumpSumMonth?: number;
}

/**
 * Response interface for mortgage calculator.
 */
export interface MortgageCalculatorResponse {
  // Loan Summary
  regularRepayment: number;
  repaymentFrequency: string;
  totalRepayments: number;
  totalInterest: number;
  totalPrincipal: number;

  // Payoff Analysis
  originalPayoffDate: string;
  optimisedPayoffDate: string;
  originalTermMonths: number;
  optimisedTermMonths: number;
  monthsSaved: number;
  interestSaved: number;

  // Comparison
  comparison: ComparisonSummary;

  // Breakdowns
  yearlyBreakdown: YearBreakdown[];
  monthlySchedule: MonthlyPayment[];

  // Insights
  insights: string[];
}

/**
 * Comparison between base and optimised scenarios.
 */
export interface ComparisonSummary {
  baseTotalRepayments: number;
  baseTotalInterest: number;
  baseTermMonths: number;
  optimisedTotalRepayments: number;
  optimisedTotalInterest: number;
  optimisedTermMonths: number;
  interestSaved: number;
  monthsSaved: number;
  percentageInterestSaved: number;
}

/**
 * Yearly breakdown for charting.
 */
export interface YearBreakdown {
  year: number;
  startingBalance: number;
  endingBalance: number;
  principalPaid: number;
  interestPaid: number;
  offsetBalance: number;
  cumulativePrincipal: number;
  cumulativeInterest: number;
  cumulativeTotal: number;
}

/**
 * Monthly payment breakdown for amortisation table.
 */
export interface MonthlyPayment {
  month: number;
  year: number;
  payment: number;
  principal: number;
  interest: number;
  extraPayment: number;
  balance: number;
  offsetBalance: number;
  effectiveBalance: number;
}
