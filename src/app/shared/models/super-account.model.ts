export interface SuperAccountRequest {
  fundName: string;
  balance: number;
  balanceDate?: string;
  employerContributionsYtd?: number;
  salarySacrificeYtd?: number;
  personalConcessionalYtd?: number;
  nonConcessionalYtd?: number;
  totalSuperBalancePrevFy?: number;
  hasInsurance?: boolean;
  insurancePremiumPa?: number;
}

export interface SuperAccountResponse {
  id: string;
  fundName: string;
  balance: number;
  balanceDate?: string;
  employerContributionsYtd: number;
  salarySacrificeYtd: number;
  personalConcessionalYtd: number;
  nonConcessionalYtd: number;
  totalConcessionalYtd: number;
  totalSuperBalancePrevFy?: number;
  hasInsurance: boolean;
  insurancePremiumPa?: number;
  createdAt: string;
  updatedAt: string;
}
