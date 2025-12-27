/**
 * Request DTO for super optimisation calculations.
 */
export interface SuperOptimisationRequest {
  annualGrossIncome: number;
  currentSuperBalance: number;
  totalSuperBalancePrevFy?: number;
  employerContributionsYtd?: number;
  salarySacrificeYtd?: number;
  personalConcessionalYtd?: number;
  nonConcessionalYtd?: number;
  marginalTaxRate?: number;
  spouseIncome?: number;
  spouseSuperBalance?: number;
  spouseAssessableIncome?: number;
  age?: number;
  unusedConcessionalCaps?: number[];
  wantsToMaximiseContributions?: boolean;
}

/**
 * A single recommendation from the super optimiser.
 */
export interface Recommendation {
  title: string;
  description: string;
  action: string;
  estimatedBenefit: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Response DTO from super optimisation analysis.
 */
export interface SuperOptimisationResponse {
  // Current Status
  totalConcessionalYtd: number;
  remainingConcessionalCap: number;
  concessionalCap: number;
  eligibleForCarryForward: boolean;
  carryForwardAvailable: number;
  totalContributionRoom: number;

  // Recommendations
  suggestedSalarySacrifice: number;
  estimatedTaxSaving: number;
  effectiveSuperTaxRate: number;
  netBenefitFromContributing: number;

  // Division 293
  subjectToDiv293: boolean;
  div293TaxLiability: number;
  div293ContributionsAmount: number;

  // Spouse Contributions
  spouseContributionRecommended: boolean;
  maxSpouseContribution: number;
  spouseContributionTaxOffset: number;
  spouseContributionExplanation?: string;

  // Government Co-contribution
  eligibleForCoContribution: boolean;
  maxCoContribution: number;
  requiredNonConcessionalForMaxCoContribution: number;
  coContributionExplanation?: string;

  // Non-Concessional
  remainingNonConcessionalCap: number;
  bringForwardAvailable: boolean;
  maxNonConcessionalWithBringForward: number;

  // Tax Rate
  marginalTaxRate: number;
  assessableIncome: number;

  // Recommendations
  recommendations: Recommendation[];
  warnings: string[];
  strategySummary: string;
}

/**
 * Prefill data for the super optimiser form.
 */
export interface SuperOptimisationPrefillData {
  age?: number;
  marginalTaxRate?: number;
  currentSuperBalance?: number;
  employerContributionsYtd?: number;
  salarySacrificeYtd?: number;
  personalConcessionalYtd?: number;
  nonConcessionalYtd?: number;
  totalSuperBalancePrevFy?: number;
  annualGrossIncome?: number;
}
