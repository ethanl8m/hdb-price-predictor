import React, { useState, useMemo } from 'react';
import { 
  CheckCircle2, 
  Cpu, 
  BarChart3, 
  Sliders, 
  RotateCcw, 
  TrendingUp, 
  Zap, 
  AlertCircle,
  HelpCircle,
  Database
} from 'lucide-react';
import { TownInfo } from '../types/hdb';
import { HDB_TOWNS } from '../data/hdbTowns';
import { runModelBacktesting, BacktestResults } from '../ml/backtesting';
import { DEFAULT_HYPERPARAMS, ModelHyperparams } from '../ml/types';

interface MLBacktestingViewProps {
  selectedTown: TownInfo;
  onSelectTown: (town: TownInfo) => void;
  backtestResults: BacktestResults;
  onRerunBacktest: (splitYear: number, params: ModelHyperparams, scope?: 'town' | 'all') => void;
  isRetraining: boolean;
  validationScope?: 'town' | 'all';
  onToggleValidationScope?: (scope: 'town' | 'all') => void;
  onOpenDatasetManager?: () => void;
}

export const MLBacktestingView: React.FC<MLBacktestingViewProps> = ({
  selectedTown,
  onSelectTown,
  backtestResults,
  onRerunBacktest,
  isRetraining,
  validationScope = 'town',
  onToggleValidationScope,
  onOpenDatasetManager
}) => {
  const [splitYear, setSplitYear] = useState<number>(backtestResults.splitYear || 2021);
  const [selectedScatterAlgo, setSelectedScatterAlgo] = useState<'xgboost' | 'random_forest' | 'neural_network'>('xgboost');
  const [showHyperparams, setShowHyperparams] = useState(false);
  const [params, setParams] = useState<ModelHyperparams>(DEFAULT_HYPERPARAMS);

  const { metrics, timeSeriesComparison, scatterPoints, residualDistributions, featureImportanceComparison, totalTrainSamples, totalValidationSamples } = backtestResults;

  const handleRetrain = () => {
    onRerunBacktest(splitYear, params, validationScope);
  };

  const handleResetParams = () => {
    setParams(DEFAULT_HYPERPARAMS);
    onRerunBacktest(splitYear, DEFAULT_HYPERPARAMS, validationScope);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Find best model for each metric
  const bestR2 = Math.max(metrics.xgboost.r2Score, metrics.random_forest.r2Score, metrics.neural_network.r2Score);
  const bestMae = Math.min(metrics.xgboost.mae, metrics.random_forest.mae, metrics.neural_network.mae);
  const bestRmse = Math.min(metrics.xgboost.rmse, metrics.random_forest.rmse, metrics.neural_network.rmse);
  const bestMape = Math.min(metrics.xgboost.mape, metrics.random_forest.mape, metrics.neural_network.mape);
  const bestDir = Math.max(metrics.xgboost.directionalAccuracy, metrics.random_forest.directionalAccuracy, metrics.neural_network.directionalAccuracy);

  // Time-series Chart Math (SVG: 850 x 300)
  const tsPadding = { top: 25, right: 30, bottom: 40, left: 65 };
  const tsWidth = 850;
  const tsHeight = 300;
  const tsInnerWidth = tsWidth - tsPadding.left - tsPadding.right;
  const tsInnerHeight = tsHeight - tsPadding.top - tsPadding.bottom;

  const allTsPrices = timeSeriesComparison.flatMap(d => [d.actualPrice, d.xgboostPred, d.rfPred, d.annPred]);
  const minTsY = Math.floor(Math.min(...allTsPrices) * 0.94);
  const maxTsY = Math.ceil(Math.max(...allTsPrices) * 1.06);

  const getTsX = (idx: number) => {
    const total = Math.max(1, timeSeriesComparison.length - 1);
    return tsPadding.left + (idx / total) * tsInnerWidth;
  };

  const getTsY = (val: number) => {
    const ratio = (val - minTsY) / (maxTsY - minTsY || 1);
    return tsPadding.top + (1 - ratio) * tsInnerHeight;
  };

  const actualPath = timeSeriesComparison.reduce((acc, d, i) => {
    return i === 0 ? `M ${getTsX(i)} ${getTsY(d.actualPrice)}` : `${acc} L ${getTsX(i)} ${getTsY(d.actualPrice)}`;
  }, '');

  const xgbPath = timeSeriesComparison.reduce((acc, d, i) => {
    return i === 0 ? `M ${getTsX(i)} ${getTsY(d.xgboostPred)}` : `${acc} L ${getTsX(i)} ${getTsY(d.xgboostPred)}`;
  }, '');

  const rfPath = timeSeriesComparison.reduce((acc, d, i) => {
    return i === 0 ? `M ${getTsX(i)} ${getTsY(d.rfPred)}` : `${acc} L ${getTsX(i)} ${getTsY(d.rfPred)}`;
  }, '');

  const annPath = timeSeriesComparison.reduce((acc, d, i) => {
    return i === 0 ? `M ${getTsX(i)} ${getTsY(d.annPred)}` : `${acc} L ${getTsX(i)} ${getTsY(d.annPred)}`;
  }, '');

  // Scatter Plot Math (SVG: 400 x 300)
  const scPadding = { top: 25, right: 25, bottom: 45, left: 60 };
  const scWidth = 400;
  const scHeight = 300;
  const scInnerWidth = scWidth - scPadding.left - scPadding.right;
  const scInnerHeight = scHeight - scPadding.top - scPadding.bottom;

  const getScatterVal = (pt: typeof scatterPoints[0], algo: 'xgboost' | 'random_forest' | 'neural_network') => {
    if (algo === 'xgboost') return pt.xgboost;
    if (algo === 'random_forest') return pt.rf;
    return pt.ann;
  };

  const allScatterActual = scatterPoints.map(p => p.actual);
  const allScatterPred = scatterPoints.map(p => getScatterVal(p, selectedScatterAlgo));
  const minSc = Math.floor(Math.min(...allScatterActual, ...allScatterPred) * 0.95);
  const maxSc = Math.ceil(Math.max(...allScatterActual, ...allScatterPred) * 1.05);

  const getScX = (val: number) => scPadding.left + ((val - minSc) / (maxSc - minSc || 1)) * scInnerWidth;
  const getScY = (val: number) => scPadding.top + (1 - (val - minSc) / (maxSc - minSc || 1)) * scInnerHeight;

  // Residual Histogram Math
  const residuals = residualDistributions[selectedScatterAlgo];
  const numBins = 14;
  const minRes = -60000;
  const maxRes = 60000;
  const binWidth = (maxRes - minRes) / numBins;
  const bins = new Array(numBins).fill(0);

  residuals.forEach(r => {
    const clamped = Math.max(minRes, Math.min(maxRes - 1, r));
    const binIdx = Math.floor((clamped - minRes) / binWidth);
    if (binIdx >= 0 && binIdx < numBins) bins[binIdx]++;
  });
  const maxBinCount = Math.max(...bins, 1);

  return (
    <div className="space-y-6">
      {/* Header & Controls bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <span>Machine Learning Backtesting & Validation Suite</span>
              </h2>
              {onOpenDatasetManager && (
                <button
                  type="button"
                  onClick={onOpenDatasetManager}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 flex items-center gap-1 transition-colors"
                >
                  <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Real HDB CSV ({totalTrainSamples + totalValidationSamples} pts)</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Strict Out-of-Sample backtest evaluating XGBoost vs Random Forest vs Neural Networks on unseen registered HDB transactions.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Validation Scope Toggle */}
            {onToggleValidationScope && (
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => onToggleValidationScope('town')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    validationScope === 'town'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  {selectedTown.name}
                </button>
                <button
                  type="button"
                  onClick={() => onToggleValidationScope('all')}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                    validationScope === 'all'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Islandwide (26 Towns)
                </button>
              </div>
            )}

            {/* Split year selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Validation Split:</span>
              <select
                value={splitYear}
                onChange={(e) => setSplitYear(Number(e.target.value))}
                className="py-1.5 px-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium text-xs focus:ring-2 focus:ring-emerald-500"
              >
                <option value={2020}>Train: 2007-2020 | Test: 2021-2026</option>
                <option value={2021}>Train: 2007-2021 | Test: 2022-2026 (Recommended)</option>
                <option value={2022}>Train: 2007-2022 | Test: 2023-2026</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setShowHyperparams(!showHyperparams)}
              className="px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 flex items-center gap-1.5 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Hyperparameters</span>
            </button>

            <button
              type="button"
              disabled={isRetraining}
              onClick={handleRetrain}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
            >
              {isRetraining ? (
                <span>Training Models...</span>
              ) : (
                <>
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-run Validation</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Hyperparameters Config Drawer */}
        {showHyperparams && (
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* XGBoost Config */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-2">
                1. XGBoost Hyperparameters
              </span>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Estimators (Trees): {params.xgboost.nEstimators}</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="60"
                    step="5"
                    value={params.xgboost.nEstimators}
                    onChange={(e) => setParams({
                      ...params,
                      xgboost: { ...params.xgboost, nEstimators: Number(e.target.value) }
                    })}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg accent-emerald-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Max Depth: {params.xgboost.maxDepth}</span>
                  </div>
                  <input
                    type="range"
                    min="2"
                    max="6"
                    value={params.xgboost.maxDepth}
                    onChange={(e) => setParams({
                      ...params,
                      xgboost: { ...params.xgboost, maxDepth: Number(e.target.value) }
                    })}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg accent-emerald-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Learning Rate (Eta): {params.xgboost.learningRate}</span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="0.25"
                    step="0.01"
                    value={params.xgboost.learningRate}
                    onChange={(e) => setParams({
                      ...params,
                      xgboost: { ...params.xgboost, learningRate: Number(e.target.value) }
                    })}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg accent-emerald-600"
                  />
                </div>
              </div>
            </div>

            {/* Random Forest Config */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-2">
                2. Random Forest Hyperparameters
              </span>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Number of Trees: {params.randomForest.nEstimators}</span>
                  </div>
                  <input
                    type="range"
                    min="15"
                    max="50"
                    step="5"
                    value={params.randomForest.nEstimators}
                    onChange={(e) => setParams({
                      ...params,
                      randomForest: { ...params.randomForest, nEstimators: Number(e.target.value) }
                    })}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg accent-blue-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Max Tree Depth: {params.randomForest.maxDepth}</span>
                  </div>
                  <input
                    type="range"
                    min="3"
                    max="8"
                    value={params.randomForest.maxDepth}
                    onChange={(e) => setParams({
                      ...params,
                      randomForest: { ...params.randomForest, maxDepth: Number(e.target.value) }
                    })}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg accent-blue-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Feature Subsampling: {Math.round(params.randomForest.featureFraction * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.0"
                    step="0.05"
                    value={params.randomForest.featureFraction}
                    onChange={(e) => setParams({
                      ...params,
                      randomForest: { ...params.randomForest, featureFraction: Number(e.target.value) }
                    })}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg accent-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* ANN Neural Net Config */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <span className="font-semibold text-slate-900 dark:text-slate-100 block mb-2">
                3. Neural Network (ANN) Config
              </span>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Training Epochs: {params.neuralNet.epochs}</span>
                  </div>
                  <input
                    type="range"
                    min="30"
                    max="120"
                    step="10"
                    value={params.neuralNet.epochs}
                    onChange={(e) => setParams({
                      ...params,
                      neuralNet: { ...params.neuralNet, epochs: Number(e.target.value) }
                    })}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg accent-purple-600"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Hidden Units: Layer 1 ({params.neuralNet.hiddenDim1})</span>
                  </div>
                  <input
                    type="range"
                    min="8"
                    max="32"
                    step="4"
                    value={params.neuralNet.hiddenDim1}
                    onChange={(e) => setParams({
                      ...params,
                      neuralNet: { ...params.neuralNet, hiddenDim1: Number(e.target.value) }
                    })}
                    className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-lg accent-purple-600"
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetParams}
                    className="text-[11px] text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 underline"
                  >
                    Reset Defaults
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Head-to-Head Performance Scorecard Matrix */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-xs transition-colors">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Out-of-Sample Performance Comparison Matrix
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Evaluated on {backtestResults.totalValidationSamples} unseen transaction clusters ({splitYear + 1} — 2026)
            </p>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            Train Split: 2006–{splitYear} ({backtestResults.totalTrainSamples} samples)
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
              <tr>
                <th className="py-3 px-4 font-semibold">Algorithm</th>
                <th className="py-3 px-3 font-semibold text-right">R² Score (Goodness)</th>
                <th className="py-3 px-3 font-semibold text-right">MAE (SGD)</th>
                <th className="py-3 px-3 font-semibold text-right">RMSE (SGD)</th>
                <th className="py-3 px-3 font-semibold text-right">MAPE (%)</th>
                <th className="py-3 px-3 font-semibold text-right">Hit Rate (%)</th>
                <th className="py-3 px-3 font-semibold text-right">Train Speed</th>
                <th className="py-3 px-4 font-semibold text-right">Inference Latency</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {/* XGBoost Row */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">XGBoost (GBDT)</span>
                      <span className="block text-[10px] text-slate-400">Gradient Boosted Decision Trees</span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold">
                  <span className={metrics.xgboost.r2Score === bestR2 ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {metrics.xgboost.r2Score.toFixed(3)}
                  </span>
                  {metrics.xgboost.r2Score === bestR2 && <span className="ml-1 text-[10px] text-emerald-600">★</span>}
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.xgboost.mae === bestMae ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {formatCurrency(metrics.xgboost.mae)}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.xgboost.rmse === bestRmse ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {formatCurrency(metrics.xgboost.rmse)}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.xgboost.mape === bestMape ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {metrics.xgboost.mape.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.xgboost.directionalAccuracy === bestDir ? 'text-emerald-600 dark:text-emerald-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {metrics.xgboost.directionalAccuracy.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {metrics.xgboost.trainingTimeMs}ms
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {metrics.xgboost.inferenceLatencyMs}ms
                </td>
              </tr>

              {/* Random Forest Row */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Random Forest</span>
                      <span className="block text-[10px] text-slate-400">Bagging Ensemble with Subspace</span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold">
                  <span className={metrics.random_forest.r2Score === bestR2 ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {metrics.random_forest.r2Score.toFixed(3)}
                  </span>
                  {metrics.random_forest.r2Score === bestR2 && <span className="ml-1 text-[10px] text-blue-600">★</span>}
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.random_forest.mae === bestMae ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {formatCurrency(metrics.random_forest.mae)}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.random_forest.rmse === bestRmse ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {formatCurrency(metrics.random_forest.rmse)}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.random_forest.mape === bestMape ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {metrics.random_forest.mape.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.random_forest.directionalAccuracy === bestDir ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {metrics.random_forest.directionalAccuracy.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {metrics.random_forest.trainingTimeMs}ms
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {metrics.random_forest.inferenceLatencyMs}ms
                </td>
              </tr>

              {/* Neural Network (ANN) Row */}
              <tr className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                <td className="py-3.5 px-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100">Neural Network (ANN)</span>
                      <span className="block text-[10px] text-slate-400">Deep Multi-Layer Perceptron (Adam)</span>
                    </div>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums font-semibold">
                  <span className={metrics.neural_network.r2Score === bestR2 ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {metrics.neural_network.r2Score.toFixed(3)}
                  </span>
                  {metrics.neural_network.r2Score === bestR2 && <span className="ml-1 text-[10px] text-purple-600">★</span>}
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.neural_network.mae === bestMae ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {formatCurrency(metrics.neural_network.mae)}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.neural_network.rmse === bestRmse ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {formatCurrency(metrics.neural_network.rmse)}
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.neural_network.mape === bestMape ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {metrics.neural_network.mape.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums">
                  <span className={metrics.neural_network.directionalAccuracy === bestDir ? 'text-purple-600 dark:text-purple-400 font-bold' : 'text-slate-800 dark:text-slate-200'}>
                    {metrics.neural_network.directionalAccuracy.toFixed(1)}%
                  </span>
                </td>
                <td className="py-3.5 px-3 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {metrics.neural_network.trainingTimeMs}ms
                </td>
                <td className="py-3.5 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {metrics.neural_network.inferenceLatencyMs}ms
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Chart 1: Actual vs Predicted Validation Time-Series Curve */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-colors shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Actual vs Predicted Validation Trajectory ({splitYear + 1} — 2026)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quarterly price tracking over unseen market periods (post-cooling, 15-month wait-out, COVID aftermath)
            </p>
          </div>

          <div className="flex items-center gap-5 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-slate-900 dark:bg-white rounded-full" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">Actual Price</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-emerald-500 rounded-full" />
              <span className="text-emerald-700 dark:text-emerald-400 font-medium">XGBoost</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-blue-500 rounded-full" />
              <span className="text-blue-700 dark:text-blue-400 font-medium">Random Forest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-1 bg-purple-500 rounded-full" />
              <span className="text-purple-700 dark:text-purple-400 font-medium">ANN Neural Net</span>
            </div>
          </div>
        </div>

        {/* SVG Time-Series Chart */}
        <div className="relative w-full aspect-[21/8] min-h-[260px]">
          <svg viewBox={`0 0 ${tsWidth} ${tsHeight}`} className="w-full h-full overflow-visible select-none">
            {/* Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((step, idx) => {
              const val = Math.round(minTsY + step * (maxTsY - minTsY));
              const y = getTsY(val);
              return (
                <g key={idx}>
                  <line
                    x1={tsPadding.left}
                    y1={y}
                    x2={tsWidth - tsPadding.right}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={tsPadding.left - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] font-mono tabular-nums fill-slate-400"
                  >
                    ${(val / 1000).toFixed(0)}k
                  </text>
                </g>
              );
            })}

            {/* ANN Curve */}
            <path
              d={annPath}
              fill="none"
              stroke="#a855f7"
              strokeWidth="2"
              strokeDasharray="3 3"
              strokeLinecap="round"
            />

            {/* Random Forest Curve */}
            <path
              d={rfPath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* XGBoost Curve */}
            <path
              d={xgbPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Actual Ground Truth Line (High Contrast Solid) */}
            <path
              d={actualPath}
              fill="none"
              stroke="currentColor"
              className="text-slate-900 dark:text-white"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Data Points */}
            {timeSeriesComparison.map((d, i) => {
              const x = getTsX(i);
              return (
                <g key={d.dateLabel}>
                  <circle
                    cx={x}
                    cy={getTsY(d.actualPrice)}
                    r={3.5}
                    className="fill-slate-900 dark:fill-white"
                  />
                  <text
                    x={x}
                    y={tsPadding.top + tsInnerHeight + 18}
                    textAnchor="middle"
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    {d.dateLabel}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Grid of 2 Charts: Parity Scatter Plot & Residual Error Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Parity Scatter Plot */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Parity Scatter Plot (Actual vs Predicted)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Points adhering closely to the 45° diagonal indicate high model fidelity.
              </p>
            </div>

            {/* Model switcher for scatter */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setSelectedScatterAlgo('xgboost')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  selectedScatterAlgo === 'xgboost'
                    ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                XGBoost
              </button>
              <button
                type="button"
                onClick={() => setSelectedScatterAlgo('random_forest')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  selectedScatterAlgo === 'random_forest'
                    ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                Random Forest
              </button>
              <button
                type="button"
                onClick={() => setSelectedScatterAlgo('neural_network')}
                className={`px-2 py-1 rounded-md font-medium transition-colors ${
                  selectedScatterAlgo === 'neural_network'
                    ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                    : 'text-slate-500'
                }`}
              >
                ANN
              </button>
            </div>
          </div>

          <div className="relative w-full aspect-[4/3]">
            <svg viewBox={`0 0 ${scWidth} ${scHeight}`} className="w-full h-full overflow-visible select-none">
              {/* 45 degree ideal line (y = x) */}
              <line
                x1={getScX(minSc)}
                y1={getScY(minSc)}
                x2={getScX(maxSc)}
                y2={getScY(maxSc)}
                stroke="currentColor"
                className="text-slate-300 dark:text-slate-700"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
              <text
                x={getScX(maxSc) - 10}
                y={getScY(maxSc) - 8}
                textAnchor="end"
                className="text-[9px] fill-slate-400 font-mono"
              >
                Ideal Parity (y = x)
              </text>

              {/* Scatter Points */}
              {scatterPoints.slice(0, 160).map((pt, i) => {
                const predVal = getScatterVal(pt, selectedScatterAlgo);
                const cx = getScX(pt.actual);
                const cy = getScY(predVal);
                const dotColor = selectedScatterAlgo === 'xgboost' 
                  ? '#10b981' 
                  : selectedScatterAlgo === 'random_forest' 
                  ? '#3b82f6' 
                  : '#a855f7';

                return (
                  <circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r={3}
                    fill={dotColor}
                    fillOpacity={0.65}
                    className="hover:r-5 transition-all cursor-pointer"
                  >
                    <title>{`${pt.label}: Actual ${formatCurrency(pt.actual)}, Pred ${formatCurrency(predVal)}`}</title>
                  </circle>
                );
              })}

              {/* Axis labels */}
              <text
                x={scPadding.left + scInnerWidth / 2}
                y={scHeight - 8}
                textAnchor="middle"
                className="text-[10px] font-medium fill-slate-500"
              >
                Actual Price (SGD) →
              </text>
              <text
                x={15}
                y={scPadding.top + scInnerHeight / 2}
                textAnchor="middle"
                transform={`rotate(-90 15 ${scPadding.top + scInnerHeight / 2})`}
                className="text-[10px] font-medium fill-slate-500"
              >
                Predicted Price (SGD) →
              </text>
            </svg>
          </div>
        </div>

        {/* Residual Error Distribution Histogram */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Residual Error Distribution Histogram (y - ŷ)
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Centered bell distribution around $0 confirms unbiased model calibration.
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Range: -$60k to +$60k
            </span>
          </div>

          <div className="relative w-full aspect-[4/3] flex items-end gap-1.5 pt-6 pb-6 px-4">
            {bins.map((count, idx) => {
              const heightPct = Math.round((count / maxBinCount) * 100);
              const binCenter = minRes + (idx + 0.5) * binWidth;
              const isCenterBin = Math.abs(binCenter) < binWidth;

              const barBg = selectedScatterAlgo === 'xgboost' 
                ? (isCenterBin ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-emerald-400/60 dark:bg-emerald-700/60') 
                : selectedScatterAlgo === 'random_forest'
                ? (isCenterBin ? 'bg-blue-600 dark:bg-blue-500' : 'bg-blue-400/60 dark:bg-blue-700/60')
                : (isCenterBin ? 'bg-purple-600 dark:bg-purple-500' : 'bg-purple-400/60 dark:bg-purple-700/60');

              return (
                <div key={idx} className="flex-1 flex flex-col items-center group relative h-full justify-end">
                  {/* Tooltip on hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-7 text-[10px] font-mono bg-slate-900 text-white dark:bg-white dark:text-slate-900 px-1.5 py-0.5 rounded shadow pointer-events-none whitespace-nowrap z-20">
                    {count} samples ({(binCenter / 1000).toFixed(0)}k)
                  </div>
                  
                  <div 
                    style={{ height: `${Math.max(4, heightPct)}%` }} 
                    className={`w-full rounded-t-sm transition-all duration-300 ${barBg}`}
                  />
                  <span className="text-[8px] font-mono text-slate-400 mt-1">
                    {idx % 4 === 0 ? `${(binCenter / 1000).toFixed(0)}k` : ''}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>← Model Overpredicted</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">$0 Baseline Zero Error</span>
            <span>Model Underpredicted →</span>
          </div>
        </div>
      </div>

      {/* Feature Importance Comparison */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
          Feature Importance Attribution Comparison
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          How each machine learning model weights key housing features (Floor Area, Lease Decay, Macro RPI, Storey, CBD Distance)
        </p>

        <div className="space-y-3">
          {featureImportanceComparison.map((item) => (
            <div key={item.feature} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-800 dark:text-slate-200">{item.label}</span>
                <div className="flex items-center gap-4 font-mono text-[11px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold">XGB: {item.xgboostScore}%</span>
                  <span className="text-blue-600 dark:text-blue-400 font-semibold">RF: {item.rfScore}%</span>
                  <span className="text-purple-600 dark:text-purple-400 font-semibold">ANN: {item.annScore}%</span>
                </div>
              </div>

              {/* Triple segmented mini-bars */}
              <div className="grid grid-cols-3 gap-2">
                {/* XGBoost Bar */}
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.xgboostScore}%` }}
                    className="h-full bg-emerald-500 rounded-full"
                  />
                </div>
                {/* Random Forest Bar */}
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.rfScore}%` }}
                    className="h-full bg-blue-500 rounded-full"
                  />
                </div>
                {/* ANN Bar */}
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${item.annScore}%` }}
                    className="h-full bg-purple-500 rounded-full"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
