/**
 * Australian Tax Constants - FY 2025-26
 *
 * HECS/HELP repayment thresholds and rates.
 * From 2025-26, compulsory repayments use MARGINAL rates.
 *
 * @see https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds
 */

export interface HecsRepaymentBracket {
  lowerBound: number;
  upperBound: number;
  rate: number;
  baseAmount: number;
  isMarginal: boolean;
}

/**
 * FY 2025-26 HECS/HELP Repayment Brackets (Marginal System)
 *
 * $0 – $67,000: Nil
 * $67,001 – $125,000: 15¢ per $1 over $67,000
 * $125,001 – $179,285: $8,700 plus 17¢ per $1 over $125,000
 * $179,286+: 10% of total repayment income
 */
export const HECS_REPAYMENT_BRACKETS: HecsRepaymentBracket[] = [
  { lowerBound: 0, upperBound: 67000, rate: 0, baseAmount: 0, isMarginal: false },
  { lowerBound: 67001, upperBound: 125000, rate: 0.15, baseAmount: 0, isMarginal: true },
  { lowerBound: 125001, upperBound: 179285, rate: 0.17, baseAmount: 8700, isMarginal: true },
  { lowerBound: 179286, upperBound: Infinity, rate: 0.10, baseAmount: 0, isMarginal: false }
];

/** Default CPI rate for HECS indexation (historical average ~3%) */
export const DEFAULT_CPI_RATE = 0.03;

/** HECS repayment threshold - no repayment below this income */
export const HECS_REPAYMENT_THRESHOLD = 67000;

/**
 * Calculate annual HECS/HELP repayment based on repayment income.
 * Uses FY 2025-26 marginal rate system.
 *
 * @param annualIncome Total repayment income (taxable income + fringe benefits + etc.)
 * @returns Annual HECS repayment amount (rounded to nearest dollar)
 */
export function calculateHecsRepayment(annualIncome: number): number {
  if (annualIncome <= 0 || annualIncome <= HECS_REPAYMENT_THRESHOLD) {
    return 0;
  }

  for (const bracket of HECS_REPAYMENT_BRACKETS) {
    if (annualIncome >= bracket.lowerBound && annualIncome <= bracket.upperBound) {
      if (bracket.rate === 0) {
        return 0;
      }

      if (bracket.isMarginal) {
        // Marginal rate: base amount + rate on income over threshold
        const thresholdBase = bracket.lowerBound - 1;
        const incomeOverThreshold = annualIncome - thresholdBase;
        return Math.round(bracket.baseAmount + (incomeOverThreshold * bracket.rate));
      } else {
        // Flat rate on total income (top bracket)
        return Math.round(annualIncome * bracket.rate);
      }
    }
  }

  // Fallback for income above all brackets (shouldn't happen with Infinity upper bound)
  return Math.round(annualIncome * 0.10);
}

/**
 * Calculate HECS repayment capped at remaining balance.
 * Prevents repayment exceeding debt owed.
 *
 * @param annualIncome Total repayment income
 * @param hecsBalance Current HECS debt balance
 * @returns Actual repayment (min of calculated repayment and balance)
 */
export function calculateCappedHecsRepayment(annualIncome: number, hecsBalance: number): number {
  if (hecsBalance <= 0) {
    return 0;
  }
  const calculatedRepayment = calculateHecsRepayment(annualIncome);
  return Math.min(calculatedRepayment, hecsBalance);
}
