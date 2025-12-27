export interface ScenarioRequest {
  name: string;
  scenarioType: 'equity_recycling' | 'fire' | 'fire_calculator' | 'property_analysis' | 'super_optimisation';
  inputData: Record<string, unknown>;
  resultData?: Record<string, unknown>;
  isFavourite?: boolean;
  notes?: string;
}

export interface ScenarioResponse {
  id: string;
  name: string;
  scenarioType: string;
  inputData: Record<string, unknown>;
  resultData?: Record<string, unknown>;
  isFavourite: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
