import { ForecastRequest, ForecastResult, FlatType } from '../types/hdb';
import { HDB_TOWNS } from '../data/hdbTowns';
import { NATIONAL_RPI, HISTORICAL_SORA_RATES } from '../data/historicalData';
import { 
  MLFeatures, 
  flatTypeToNum, 
  storeyToNum 
} from './types';
import { XGBoostModel } from './xgboost';
import { RandomForestModel } from './randomForest';
import { NeuralNetModel } from './neuralNet';

export function runFutureForecast(
  request: ForecastRequest,
  models: {
    xgboost: XGBoostModel;
    randomForest: RandomForestModel;
    neuralNet: NeuralNetModel;
  },
  valRmse: number
): ForecastResult {
  const town = HDB_TOWNS.find(t => t.id === request.town) || HDB_TOWNS[0];
  const targetYear = 2026 + request.horizonYears;

  // Macro scenarios: annual RPI growth rate
  const annualGrowthRates = {
    conservative: 0.014, // 1.4% p.a.
    baseline: 0.032,     // 3.2% p.a.
    bullish: 0.058       // 5.8% p.a.
  };

  const assumedRate = annualGrowthRates[request.macroScenario];
  const compoundedMacroFactor = Math.pow(1 + assumedRate, request.horizonYears);

  const base2026Rpi = NATIONAL_RPI[2026] || 198.8;
  const projectedRpi = base2026Rpi * compoundedMacroFactor;

  // Simulated SORA rate based on scenario
  let projectedSora = 3.0;
  if (request.macroScenario === 'conservative') projectedSora = 3.8;
  if (request.macroScenario === 'bullish') projectedSora = 2.2;

  // Remaining lease decreases by horizonYears
  const projectedLease = Math.max(30, request.remainingLeaseYears - request.horizonYears);

  // Build input features for future target year
  const futureFeatures: MLFeatures = {
    floorAreaSqm: request.floorAreaSqm,
    remainingLease: projectedLease,
    distanceToCbd: town.distanceToCbdKm,
    isMature: town.isMature ? 1 : 0,
    storeyLevelNum: storeyToNum(request.storeyLevel),
    flatTypeNum: flatTypeToNum(request.flatType),
    soraRate: projectedSora,
    macroRpi: projectedRpi,
    yearIndex: (targetYear - 2006)
  };

  // Build input features for current 2026 reference
  const currentFeatures: MLFeatures = {
    floorAreaSqm: request.floorAreaSqm,
    remainingLease: request.remainingLeaseYears,
    distanceToCbd: town.distanceToCbdKm,
    isMature: town.isMature ? 1 : 0,
    storeyLevelNum: storeyToNum(request.storeyLevel),
    flatTypeNum: flatTypeToNum(request.flatType),
    soraRate: HISTORICAL_SORA_RATES[2026] || 2.95,
    macroRpi: base2026Rpi,
    yearIndex: 20
  };

  // Run model predictions
  const curXgb = models.xgboost.predict(currentFeatures);
  const curRf = models.randomForest.predict(currentFeatures);
  const curAnn = models.neuralNet.predict(currentFeatures);
  const currentEstimatedPrice = Math.round((curXgb + curRf + curAnn) / 3);

  const futXgb = models.xgboost.predict(futureFeatures);
  const futRf = models.randomForest.predict(futureFeatures);
  const futAnn = models.neuralNet.predict(futureFeatures);

  // Ensemble prediction (weighted by backtest accuracy)
  const ensembleForecast = Math.round(futXgb * 0.45 + futRf * 0.35 + futAnn * 0.20);

  // Prediction Intervals based on validation RMSE and horizon uncertainty
  const horizonErrorMultiplier = Math.sqrt(request.horizonYears);
  const effectiveSigma = valRmse * horizonErrorMultiplier;

  // 90% CI: z = 1.645
  const lowerBound90 = Math.max(150000, Math.round(ensembleForecast - 1.645 * effectiveSigma));
  const upperBound90 = Math.round(ensembleForecast + 1.645 * effectiveSigma);

  // 95% CI: z = 1.960
  const lowerBound95 = Math.max(150000, Math.round(ensembleForecast - 1.960 * effectiveSigma));
  const upperBound95 = Math.round(ensembleForecast + 1.960 * effectiveSigma);

  // Annualized expected growth
  const totalGrowth = ensembleForecast / (currentEstimatedPrice || 1);
  const annualizedGrowthPct = Math.round((Math.pow(totalGrowth, 1 / request.horizonYears) - 1) * 1000) / 10;

  // Monthly mortgage calculation (75% LTV, 25-year tenure, 3.2% interest rate)
  const loanPrincipal = ensembleForecast * 0.75;
  const monthlyRate = 0.032 / 12;
  const numMonths = 25 * 12;
  const monthlyMortgageEst = Math.round(
    (loanPrincipal * (monthlyRate * Math.pow(1 + monthlyRate, numMonths))) /
    (Math.pow(1 + monthlyRate, numMonths) - 1)
  );

  // Feature contribution breakdown (waterfall analysis)
  const baseNationalPrice = 520000;
  const townContribution = Math.round((town.distanceToCbdKm < 8 ? 140000 : town.distanceToCbdKm < 14 ? 60000 : -25000) + (town.isMature ? 45000 : 0));
  const areaContribution = Math.round((request.floorAreaSqm - 90) * 4200);
  const leaseContribution = Math.round((projectedLease - 75) * 3100);
  const storeyContribution = request.storeyLevel === 'PENTHOUSE' ? 45000 : request.storeyLevel === 'HIGH' ? 28000 : request.storeyLevel === 'MID' ? 8000 : -15000;
  const macroTrendContribution = Math.round(ensembleForecast - (baseNationalPrice + townContribution + areaContribution + leaseContribution + storeyContribution));

  const totalSum = baseNationalPrice + townContribution + areaContribution + leaseContribution + storeyContribution + macroTrendContribution;

  const featureContributions = [
    {
      feature: 'baseline',
      label: 'National Median Baseline',
      impactAmount: baseNationalPrice,
      impactPercent: Math.round((baseNationalPrice / totalSum) * 100),
      type: 'neutral' as const
    },
    {
      feature: 'location',
      label: `${town.name} Location & Amenities`,
      impactAmount: townContribution,
      impactPercent: Math.round((townContribution / totalSum) * 100),
      type: townContribution >= 0 ? ('positive' as const) : ('negative' as const)
    },
    {
      feature: 'area',
      label: `Floor Space (${request.floorAreaSqm} sqm)`,
      impactAmount: areaContribution,
      impactPercent: Math.round((areaContribution / totalSum) * 100),
      type: areaContribution >= 0 ? ('positive' as const) : ('negative' as const)
    },
    {
      feature: 'lease',
      label: `Remaining Lease (${projectedLease} yrs)`,
      impactAmount: leaseContribution,
      impactPercent: Math.round((leaseContribution / totalSum) * 100),
      type: leaseContribution >= 0 ? ('positive' as const) : ('negative' as const)
    },
    {
      feature: 'storey',
      label: `Storey Elevation (${request.storeyLevel})`,
      impactAmount: storeyContribution,
      impactPercent: Math.round((storeyContribution / totalSum) * 100),
      type: storeyContribution >= 0 ? ('positive' as const) : ('negative' as const)
    },
    {
      feature: 'macro',
      label: `Macroeconomic Cycle (${request.macroScenario})`,
      impactAmount: macroTrendContribution,
      impactPercent: Math.round((macroTrendContribution / totalSum) * 100),
      type: macroTrendContribution >= 0 ? ('positive' as const) : ('negative' as const)
    }
  ];

  return {
    horizonYears: request.horizonYears,
    targetYear,
    currentEstimatedPrice,
    xgboostForecast: futXgb,
    rfForecast: futRf,
    annForecast: futAnn,
    ensembleForecast,
    lowerBound90,
    upperBound90,
    lowerBound95,
    upperBound95,
    annualizedGrowthPct,
    monthlyMortgageEst,
    featureContributions
  };
}
