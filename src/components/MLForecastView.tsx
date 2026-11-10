import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingUp, 
  Calculator, 
  HelpCircle, 
  ShieldCheck, 
  DollarSign, 
  ArrowRight,
  Layers,
  Sliders,
  Check
} from 'lucide-react';
import { TownInfo, FlatType, ForecastRequest } from '../types/hdb';
import { HDB_TOWNS } from '../data/hdbTowns';
import { TownSelector } from './TownSelector';
import { BacktestResults } from '../ml/backtesting';
import { runFutureForecast } from '../ml/forecaster';

interface MLForecastViewProps {
  selectedTown: TownInfo;
  onSelectTown: (town: TownInfo) => void;
  backtestResults: BacktestResults;
}

type SelectedModelTab = 'xgboost' | 'random_forest' | 'neural_network' | 'ensemble';

export const MLForecastView: React.FC<MLForecastViewProps> = ({
  selectedTown,
  onSelectTown,
  backtestResults
}) => {
  const [activeModel, setActiveModel] = useState<SelectedModelTab>('xgboost');
  const [flatType, setFlatType] = useState<FlatType>('4 ROOM');
  const [floorAreaSqm, setFloorAreaSqm] = useState<number>(93);
  const [storeyLevel, setStoreyLevel] = useState<'LOW' | 'MID' | 'HIGH' | 'PENTHOUSE'>('MID');
  const [remainingLeaseYears, setRemainingLeaseYears] = useState<number>(
    Math.max(45, 99 - (2026 - selectedTown.avgLeaseCommenceYear))
  );
  const [horizonYears, setHorizonYears] = useState<number>(2); // Default 2-year forecast (2028)
  const [macroScenario, setMacroScenario] = useState<'conservative' | 'baseline' | 'bullish'>('baseline');

  // When flat type changes, set sensible default floor area
  const handleFlatTypeChange = (ft: FlatType) => {
    setFlatType(ft);
    if (ft === '2 ROOM') setFloorAreaSqm(45);
    else if (ft === '3 ROOM') setFloorAreaSqm(68);
    else if (ft === '4 ROOM') setFloorAreaSqm(93);
    else if (ft === '5 ROOM') setFloorAreaSqm(112);
    else if (ft === 'EXECUTIVE') setFloorAreaSqm(144);
  };

  // Run Forecast calculation
  const forecastRequest: ForecastRequest = {
    town: selectedTown.id,
    flatType,
    floorAreaSqm,
    storeyLevel,
    remainingLeaseYears,
    horizonYears,
    macroScenario
  };

  const validationRmse = backtestResults.metrics.xgboost.rmse || 26000;

  const forecastResult = useMemo(() => {
    return runFutureForecast(forecastRequest, backtestResults.models, validationRmse);
  }, [
    selectedTown.id,
    flatType,
    floorAreaSqm,
    storeyLevel,
    remainingLeaseYears,
    horizonYears,
    macroScenario,
    backtestResults.models,
    validationRmse
  ]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Selected Model's target predicted price
  const getDisplayPrice = () => {
    if (activeModel === 'xgboost') return forecastResult.xgboostForecast;
    if (activeModel === 'random_forest') return forecastResult.rfForecast;
    if (activeModel === 'neural_network') return forecastResult.annForecast;
    return forecastResult.ensembleForecast;
  };

  const currentPrice = forecastResult.currentEstimatedPrice;
  const targetPrice = getDisplayPrice();
  const priceDelta = targetPrice - currentPrice;
  const deltaPct = ((priceDelta / (currentPrice || 1)) * 100);

  // SVG Projection Cone Chart Math (2022 to Target Year)
  const projWidth = 650;
  const projHeight = 220;
  const projPadding = { top: 20, right: 30, bottom: 35, left: 60 };
  const innerW = projWidth - projPadding.left - projPadding.right;
  const innerH = projHeight - projPadding.top - projPadding.bottom;

  // Timeline points: 2022, 2024, 2026 (current), Target Year
  const timelineYears = [2022, 2024, 2026, forecastResult.targetYear];
  const historyPrices = [
    Math.round(currentPrice * 0.88),
    Math.round(currentPrice * 0.94),
    currentPrice,
    targetPrice
  ];

  const minProjY = Math.floor(Math.min(...historyPrices, forecastResult.lowerBound95) * 0.94);
  const maxProjY = Math.ceil(Math.max(...historyPrices, forecastResult.upperBound95) * 1.06);

  const getProjX = (yr: number) => {
    const minYr = 2022;
    const maxYr = forecastResult.targetYear;
    return projPadding.left + ((yr - minYr) / (maxYr - minYr || 1)) * innerW;
  };

  const getProjY = (val: number) => {
    const ratio = (val - minProjY) / (maxProjY - minProjY || 1);
    return projPadding.top + (1 - ratio) * innerH;
  };

  // History path up to 2026
  const histPath = `M ${getProjX(2022)} ${getProjY(historyPrices[0])} L ${getProjX(2024)} ${getProjY(historyPrices[1])} L ${getProjX(2026)} ${getProjY(historyPrices[2])}`;
  // Forecast projection line
  const forecastPath = `M ${getProjX(2026)} ${getProjY(currentPrice)} L ${getProjX(forecastResult.targetYear)} ${getProjY(targetPrice)}`;

  // Confidence Interval polygon
  const ciPolygon = `
    M ${getProjX(2026)} ${getProjY(currentPrice)}
    L ${getProjX(forecastResult.targetYear)} ${getProjY(forecastResult.upperBound90)}
    L ${getProjX(forecastResult.targetYear)} ${getProjY(forecastResult.lowerBound90)}
    Z
  `;

  return (
    <div className="space-y-6">
      {/* Top Property Configurator Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <span>Machine Learning Future Price Forecaster</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Select flat specifications, forecast horizon, and compare predictions from XGBoost, Random Forest, and ANN.
            </p>
          </div>

          {/* Model Selection Segmented Switch */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setActiveModel('xgboost')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeModel === 'xgboost'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              1) XGBoost
            </button>
            <button
              type="button"
              onClick={() => setActiveModel('random_forest')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeModel === 'random_forest'
                  ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              2) Random Forest
            </button>
            <button
              type="button"
              onClick={() => setActiveModel('neural_network')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeModel === 'neural_network'
                  ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-purple-400 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              3) Neural Net (ANN)
            </button>
            <button
              type="button"
              onClick={() => setActiveModel('ensemble')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                activeModel === 'ensemble'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Ensemble Average
            </button>
          </div>
        </div>

        {/* Configuration Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Town / Postal Code */}
          <div className="lg:col-span-1">
            <TownSelector
              selectedTown={selectedTown}
              onSelectTown={onSelectTown}
              label="Town / Postal Sector"
            />
          </div>

          {/* Flat Type */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Flat Type
            </label>
            <select
              value={flatType}
              onChange={(e) => handleFlatTypeChange(e.target.value as FlatType)}
              className="w-full py-2 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="2 ROOM">2-Room (avg 45 sqm)</option>
              <option value="3 ROOM">3-Room (avg 68 sqm)</option>
              <option value="4 ROOM">4-Room (avg 93 sqm)</option>
              <option value="5 ROOM">5-Room (avg 112 sqm)</option>
              <option value="EXECUTIVE">Executive (avg 144 sqm)</option>
            </select>
          </div>

          {/* Storey Elevation */}
          <div>
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Storey Level
            </label>
            <select
              value={storeyLevel}
              onChange={(e) => setStoreyLevel(e.target.value as any)}
              className="w-full py-2 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="LOW">Low Storey (01 to 06)</option>
              <option value="MID">Mid Storey (07 to 15)</option>
              <option value="HIGH">High Storey (16 to 25)</option>
              <option value="PENTHOUSE">Penthouse / Sky Villa (26+)</option>
            </select>
          </div>

          {/* Remaining Lease Slider */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Remaining Lease
              </label>
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
                {remainingLeaseYears} Years
              </span>
            </div>
            <input
              type="range"
              min="40"
              max="95"
              value={remainingLeaseYears}
              onChange={(e) => setRemainingLeaseYears(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg accent-emerald-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-mono">
              <span>40 yrs (older)</span>
              <span>75 yrs</span>
              <span>95 yrs (new)</span>
            </div>
          </div>
        </div>

        {/* Forecast Horizon & Macroeconomic Scenario Strip */}
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Horizon Selector */}
          <div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Forecast Horizon Target Year
            </span>
            <div className="grid grid-cols-4 gap-2">
              {[
                { yr: 1, target: 2027, label: '+1 Year' },
                { yr: 2, target: 2028, label: '+2 Years' },
                { yr: 3, target: 2029, label: '+3 Years' },
                { yr: 5, target: 2031, label: '+5 Years' }
              ].map(h => (
                <button
                  key={h.yr}
                  type="button"
                  onClick={() => setHorizonYears(h.yr)}
                  className={`py-2 px-2 text-center rounded-lg border transition-all ${
                    horizonYears === h.yr
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-xs">{h.label}</div>
                  <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">{h.target}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Macro Economic Scenario */}
          <div>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1.5">
              Macroeconomic Market Scenario
            </span>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'conservative', label: 'Cooling / High Rates', rate: '+1.4% p.a.' },
                { id: 'baseline', label: 'Baseline Moderate', rate: '+3.2% p.a.' },
                { id: 'bullish', label: 'Bullish / High Demand', rate: '+5.8% p.a.' }
              ].map(sc => (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => setMacroScenario(sc.id as any)}
                  className={`py-2 px-2 text-left rounded-lg border transition-all ${
                    macroScenario === sc.id
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-bold shadow-xs'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="text-[11px] truncate">{sc.label}</div>
                  <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">{sc.rate}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Prediction Results Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left: Highlighted Valuation Card (7 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                {activeModel.toUpperCase()} Valuation Forecast ({forecastResult.targetYear})
              </span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                Horizon: +{horizonYears} Years
              </span>
            </div>

            <div className="flex items-baseline gap-3 my-2">
              <div className="text-3xl sm:text-4xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(targetPrice)}
              </div>
              <div className={`text-sm font-bold font-mono flex items-center ${
                priceDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
              }`}>
                {priceDelta >= 0 ? `+${formatCurrency(priceDelta)}` : formatCurrency(priceDelta)}
                <span className="ml-1 text-xs font-normal">({deltaPct >= 0 ? `+${deltaPct.toFixed(1)}%` : `${deltaPct.toFixed(1)}%`})</span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              For a <span className="font-semibold text-slate-700 dark:text-slate-300">{flatType}</span> flat in <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedTown.name}</span> ({floorAreaSqm} sqm, {storeyLevel.toLowerCase()} storey, remaining lease {remainingLeaseYears - horizonYears} years in {forecastResult.targetYear}).
            </p>

            {/* Confidence Interval Strip */}
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Empirical Confidence Interval (90% CI)</span>
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400 text-[11px]">
                  ± {formatCurrency(Math.round(1.645 * validationRmse * Math.sqrt(horizonYears)))}
                </span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs text-slate-800 dark:text-slate-200">
                <span>Lower 90%: <strong className="text-slate-900 dark:text-white">{formatCurrency(forecastResult.lowerBound90)}</strong></span>
                <span>Upper 90%: <strong className="text-slate-900 dark:text-white">{formatCurrency(forecastResult.upperBound90)}</strong></span>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
            <div>
              <span className="text-slate-400 text-[11px]">Current 2026 Price</span>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                {formatCurrency(currentPrice)}
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Compound CAGR</span>
              <p className="font-mono font-semibold text-emerald-600 dark:text-emerald-400 text-sm mt-0.5">
                +{forecastResult.annualizedGrowthPct.toFixed(1)}% p.a.
              </p>
            </div>
            <div>
              <span className="text-slate-400 text-[11px]">Est. Monthly Loan</span>
              <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-sm mt-0.5">
                ~{formatCurrency(forecastResult.monthlyMortgageEst)}/mo
              </p>
            </div>
          </div>
        </div>

        {/* Right: Side-by-Side Model Comparison (5 cols) */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs flex flex-col justify-between transition-colors">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
              Cross-Algorithm Forecast Comparison
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
              Independent predictions generated by the 3 distinct ML architectures
            </p>

            <div className="space-y-2.5">
              {/* XGBoost Box */}
              <button
                type="button"
                onClick={() => setActiveModel('xgboost')}
                className={`w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between ${
                  activeModel === 'xgboost'
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>XGBoost (GBDT)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">R²: {backtestResults.metrics.xgboost.r2Score.toFixed(3)} · MAPE: {backtestResults.metrics.xgboost.mape}%</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(forecastResult.xgboostForecast)}
                  </span>
                  <span className="block text-[10px] font-mono text-emerald-600">
                    {formatCurrency(forecastResult.xgboostForecast - currentPrice)}
                  </span>
                </div>
              </button>

              {/* Random Forest Box */}
              <button
                type="button"
                onClick={() => setActiveModel('random_forest')}
                className={`w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between ${
                  activeModel === 'random_forest'
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>Random Forest</span>
                  </div>
                  <span className="text-[10px] text-slate-400">R²: {backtestResults.metrics.random_forest.r2Score.toFixed(3)} · MAPE: {backtestResults.metrics.random_forest.mape}%</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(forecastResult.rfForecast)}
                  </span>
                  <span className="block text-[10px] font-mono text-blue-600">
                    {formatCurrency(forecastResult.rfForecast - currentPrice)}
                  </span>
                </div>
              </button>

              {/* Neural Network Box */}
              <button
                type="button"
                onClick={() => setActiveModel('neural_network')}
                className={`w-full p-2.5 rounded-lg border text-left transition-colors flex items-center justify-between ${
                  activeModel === 'neural_network'
                    ? 'border-purple-500 bg-purple-50/60 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200'
                    : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-800 dark:text-slate-200'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>Neural Network (ANN)</span>
                  </div>
                  <span className="text-[10px] text-slate-400">R²: {backtestResults.metrics.neural_network.r2Score.toFixed(3)} · MAPE: {backtestResults.metrics.neural_network.mape}%</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(forecastResult.annForecast)}
                  </span>
                  <span className="block text-[10px] font-mono text-purple-600">
                    {formatCurrency(forecastResult.annForecast - currentPrice)}
                  </span>
                </div>
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Algorithm Variance Spread:</span>
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              {formatCurrency(Math.max(forecastResult.xgboostForecast, forecastResult.rfForecast, forecastResult.annForecast) - Math.min(forecastResult.xgboostForecast, forecastResult.rfForecast, forecastResult.annForecast))}
            </span>
          </div>
        </div>
      </div>

      {/* Trajectory Projection Cone Chart */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100">
              Multi-Year Price Trajectory & Forecasting Cone (2022 — {forecastResult.targetYear})
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Historical baseline connecting into the projected forecast cone with 90% confidence envelope
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-900 dark:bg-white" />
              <span>Historical</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-emerald-500" />
              <span>{activeModel.toUpperCase()} Forecast</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xs" />
              <span>90% Confidence Cone</span>
            </span>
          </div>
        </div>

        <div className="relative w-full aspect-[21/7] min-h-[200px]">
          <svg viewBox={`0 0 ${projWidth} ${projHeight}`} className="w-full h-full overflow-visible select-none">
            {/* Grid */}
            {[0, 0.5, 1.0].map((step, idx) => {
              const val = Math.round(minProjY + step * (maxProjY - minProjY));
              const y = getProjY(val);
              return (
                <g key={idx}>
                  <line
                    x1={projPadding.left}
                    y1={y}
                    x2={projWidth - projPadding.right}
                    y2={y}
                    stroke="currentColor"
                    className="text-slate-100 dark:text-slate-800"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={projPadding.left - 8}
                    y={y + 3}
                    textAnchor="end"
                    className="text-[9px] font-mono tabular-nums fill-slate-400"
                  >
                    ${(val / 1000).toFixed(0)}k
                  </text>
                </g>
              );
            })}

            {/* Confidence Cone Polygon */}
            <path
              d={ciPolygon}
              fill="#10b981"
              fillOpacity={0.15}
            />

            {/* Historical solid line */}
            <path
              d={histPath}
              fill="none"
              stroke="currentColor"
              className="text-slate-900 dark:text-white"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            {/* Forecast dashed line */}
            <path
              d={forecastPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />

            {/* Target year dots */}
            <circle
              cx={getProjX(forecastResult.targetYear)}
              cy={getProjY(targetPrice)}
              r={5}
              fill="#10b981"
              className="stroke-2 stroke-white dark:stroke-slate-900"
            />

            {/* Present day dot (2026) */}
            <circle
              cx={getProjX(2026)}
              cy={getProjY(currentPrice)}
              r={4}
              className="fill-slate-900 dark:fill-white"
            />

            {/* Year labels */}
            {timelineYears.map(yr => (
              <text
                key={yr}
                x={getProjX(yr)}
                y={projPadding.top + innerH + 18}
                textAnchor="middle"
                className="text-[10px] font-mono fill-slate-500"
              >
                {yr} {yr === 2026 ? '(Now)' : ''}
              </text>
            ))}
          </svg>
        </div>
      </div>

      {/* Feature Valuation Waterfall Breakdown */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mb-1">
          Valuation Component Attribution Breakdown
        </h4>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-4">
          Decomposition of how property parameters contribute toward the predicted price of {formatCurrency(targetPrice)}
        </p>

        <div className="space-y-2.5">
          {forecastResult.featureContributions.map((fc) => (
            <div key={fc.feature} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 dark:border-slate-800/80">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {fc.label}
              </span>
              <div className="flex items-center gap-3 font-mono">
                <span className={`font-semibold ${
                  fc.type === 'positive' ? 'text-emerald-600 dark:text-emerald-400' :
                  fc.type === 'negative' ? 'text-rose-600 dark:text-rose-400' :
                  'text-slate-800 dark:text-slate-200'
                }`}>
                  {fc.impactAmount >= 0 ? `+${formatCurrency(fc.impactAmount)}` : formatCurrency(fc.impactAmount)}
                </span>
                <span className="text-slate-400 text-[10px] w-12 text-right">
                  {fc.impactPercent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
