export type FlatType = '2 ROOM' | '3 ROOM' | '4 ROOM' | '5 ROOM' | 'EXECUTIVE';

export interface TownInfo {
  id: string;
  name: string;
  postalSectors: string[]; // e.g. ["56", "57"]
  region: 'Central' | 'East' | 'North' | 'North-East' | 'West';
  isMature: boolean;
  distanceToCbdKm: number; // km from Raffles Place / Downtown
  avgLeaseCommenceYear: number;
  description: string;
}

export interface HistoricalYearSummary {
  year: number;
  quarter?: number;
  town: string;
  medianPrice: number;
  avgPrice: number;
  avgPsm: number;
  avgPsf: number;
  transactionCount: number;
  byFlatType: Record<FlatType, {
    medianPrice: number;
    avgPrice: number;
    avgPsf: number;
    count: number;
  }>;
  resalePriceIndex: number; // National HDB RPI (Base 2009 Q1 = 100 or current official base)
  soraRate: number; // Benchmark interest rate %
  remainingLeaseAvg: number; // Years
}

export interface MilestoneEvent {
  year: number;
  title: string;
  description: string;
  impact: 'cool' | 'boost' | 'neutral';
}

export interface MLModelType {
  id: 'xgboost' | 'random_forest' | 'neural_network';
  name: string;
  shortName: string;
  tagline: string;
  description: string;
}

export interface ModelValidationMetrics {
  modelId: 'xgboost' | 'random_forest' | 'neural_network';
  modelName: string;
  r2Score: number;
  mae: number;
  rmse: number;
  mape: number; // %
  directionalAccuracy: number; // %
  trainingTimeMs: number;
  inferenceLatencyMs: number;
}

export interface BacktestDataPoint {
  dateLabel: string; // e.g. "2023 Q1"
  year: number;
  quarter: number;
  town: string;
  actualPrice: number;
  xgboostPred: number;
  rfPred: number;
  annPred: number;
  actualPsf: number;
  xgboostPsf: number;
  rfPsf: number;
  annPsf: number;
}

export interface FeatureImportanceItem {
  feature: string;
  label: string;
  xgboostScore: number;
  rfScore: number;
  annScore: number;
}

export interface ForecastRequest {
  town: string;
  flatType: FlatType;
  floorAreaSqm: number;
  storeyLevel: 'LOW' | 'MID' | 'HIGH' | 'PENTHOUSE'; // 01-06, 07-15, 16-25, 26+
  remainingLeaseYears: number;
  horizonYears: number; // 1 to 5 years (2027 to 2031)
  macroScenario: 'conservative' | 'baseline' | 'bullish';
}

export interface ForecastResult {
  horizonYears: number;
  targetYear: number;
  currentEstimatedPrice: number;
  xgboostForecast: number;
  rfForecast: number;
  annForecast: number;
  ensembleForecast: number;
  lowerBound90: number;
  upperBound90: number;
  lowerBound95: number;
  upperBound95: number;
  annualizedGrowthPct: number;
  monthlyMortgageEst: number;
  featureContributions: Array<{
    feature: string;
    label: string;
    impactAmount: number;
    impactPercent: number;
    type: 'positive' | 'negative' | 'neutral';
  }>;
}
