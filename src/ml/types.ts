import { FlatType } from '../types/hdb';
import { QuarterlyDataPoint } from '../data/historicalData';

export interface MLFeatures {
  floorAreaSqm: number;
  remainingLease: number;
  distanceToCbd: number;
  isMature: number; // 1 or 0
  storeyLevelNum: number; // 1: Low, 2: Mid, 3: High, 4: Penthouse
  flatTypeNum: number; // 2 to 6
  soraRate: number;
  macroRpi: number;
  yearIndex: number; // year - 2006 (0 to 20)
}

export interface TrainingSample {
  id: string;
  features: MLFeatures;
  rawPoint: QuarterlyDataPoint;
  targetPrice: number;
}

export interface ModelHyperparams {
  // XGBoost
  xgboost: {
    nEstimators: number; // e.g. 35
    maxDepth: number; // e.g. 4
    learningRate: number; // e.g. 0.1
    regLambda: number; // e.g. 1.0
  };
  // Random Forest
  randomForest: {
    nEstimators: number; // e.g. 30
    maxDepth: number; // e.g. 6
    minSamplesSplit: number; // e.g. 4
    featureFraction: number; // e.g. 0.75
  };
  // Neural Network
  neuralNet: {
    epochs: number; // e.g. 60
    learningRate: number; // e.g. 0.015
    hiddenDim1: number; // e.g. 16
    hiddenDim2: number; // e.g. 8
  };
}

export const DEFAULT_HYPERPARAMS: ModelHyperparams = {
  xgboost: {
    nEstimators: 35,
    maxDepth: 4,
    learningRate: 0.12,
    regLambda: 1.0
  },
  randomForest: {
    nEstimators: 30,
    maxDepth: 6,
    minSamplesSplit: 4,
    featureFraction: 0.75
  },
  neuralNet: {
    epochs: 75,
    learningRate: 0.012,
    hiddenDim1: 16,
    hiddenDim2: 8
  }
};

export const FEATURE_KEYS: (keyof MLFeatures)[] = [
  'floorAreaSqm',
  'remainingLease',
  'distanceToCbd',
  'isMature',
  'storeyLevelNum',
  'flatTypeNum',
  'soraRate',
  'macroRpi',
  'yearIndex'
];

export const FEATURE_DISPLAY_NAMES: Record<keyof MLFeatures, string> = {
  floorAreaSqm: 'Floor Area (sqm)',
  remainingLease: 'Remaining Lease (Years)',
  distanceToCbd: 'Distance to CBD (km)',
  isMature: 'Mature Estate Status',
  storeyLevelNum: 'Storey Level',
  flatTypeNum: 'Flat Room Count',
  soraRate: 'SORA / Mortgage Rate',
  macroRpi: 'Macro Resale Price Index',
  yearIndex: 'Historical Time Trend'
};

export function flatTypeToNum(flatType: FlatType): number {
  switch (flatType) {
    case '2 ROOM': return 2;
    case '3 ROOM': return 3;
    case '4 ROOM': return 4;
    case '5 ROOM': return 5;
    case 'EXECUTIVE': return 6;
  }
}

export function storeyToNum(storey: string): number {
  const upper = storey.toUpperCase();
  if (upper.includes('HIGH') || upper.includes('16') || upper.includes('2')) return 3;
  if (upper.includes('MID') || upper.includes('07') || upper.includes('08')) return 2;
  if (upper.includes('PENTHOUSE') || upper.includes('30')) return 4;
  return 1; // LOW
}

export function pointToFeatures(point: QuarterlyDataPoint, isMatureTown: boolean): MLFeatures {
  return {
    floorAreaSqm: point.floorAreaSqm,
    remainingLease: point.remainingLease,
    distanceToCbd: point.distanceToCbd,
    isMature: isMatureTown ? 1 : 0,
    storeyLevelNum: storeyToNum(point.storeyLevel),
    flatTypeNum: flatTypeToNum(point.flatType),
    soraRate: point.soraRate,
    macroRpi: point.macroRpi,
    yearIndex: point.year - 2006 + (point.quarter - 1) * 0.25
  };
}

export function featuresToArray(feat: MLFeatures): number[] {
  return [
    feat.floorAreaSqm,
    feat.remainingLease,
    feat.distanceToCbd,
    feat.isMature,
    feat.storeyLevelNum,
    feat.flatTypeNum,
    feat.soraRate,
    feat.macroRpi,
    feat.yearIndex
  ];
}
