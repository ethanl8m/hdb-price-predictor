import React, { useState, useEffect } from 'react';
import { TownInfo } from './types/hdb';
import { HDB_TOWNS } from './data/hdbTowns';
import { Header } from './components/Header';
import { HistoricalTrends } from './components/HistoricalTrends';
import { MLForecastView } from './components/MLForecastView';
import { MLBacktestingView } from './components/MLBacktestingView';
import { ModelInspector } from './components/ModelInspector';
import { DatasetManagerModal } from './components/DatasetManagerModal';
import { runModelBacktesting, BacktestResults } from './ml/backtesting';
import { DEFAULT_HYPERPARAMS, ModelHyperparams } from './ml/types';
import { 
  loadDefaultHdbDataset, 
  getActiveDatasetSummary, 
  CsvDatasetSummary 
} from './data/csvDataLoader';

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [activeTab, setActiveTab] = useState<'trends' | 'forecast' | 'backtest' | 'architecture'>('trends');
  
  // Default selected town: Tampines (prominent regional hub)
  const [selectedTown, setSelectedTown] = useState<TownInfo>(() => {
    return HDB_TOWNS.find(t => t.id === 'TAMPINES') || HDB_TOWNS[0];
  });

  // Dataset management state
  const [datasetSummary, setDatasetSummary] = useState<CsvDatasetSummary | null>(null);
  const [isDatasetModalOpen, setIsDatasetModalOpen] = useState<boolean>(false);

  // Backtesting configuration state
  const [splitYear, setSplitYear] = useState<number>(2021);
  const [hyperparams, setHyperparams] = useState<ModelHyperparams>(DEFAULT_HYPERPARAMS);
  const [validationScope, setValidationScope] = useState<'town' | 'all'>('town');
  const [isRetraining, setIsRetraining] = useState<boolean>(false);

  // Initial backtest run for the selected town
  const [backtestResults, setBacktestResults] = useState<BacktestResults>(() => {
    return runModelBacktesting(selectedTown.id, 2021, DEFAULT_HYPERPARAMS);
  });

  // Sync dark class to root document element
  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDark]);

  // Load official CSV dataset on mount
  useEffect(() => {
    loadDefaultHdbDataset()
      .then((summary) => {
        setDatasetSummary(summary);
        const townTarget = validationScope === 'town' ? selectedTown.id : undefined;
        const res = runModelBacktesting(townTarget, splitYear, hyperparams);
        setBacktestResults(res);
      })
      .catch((err) => {
        console.warn('Initial default CSV load error:', err);
      });
  }, []);

  // Update backtesting when selected town changes in town mode
  useEffect(() => {
    if (validationScope === 'town') {
      setIsRetraining(true);
      const timer = setTimeout(() => {
        const res = runModelBacktesting(selectedTown.id, splitYear, hyperparams);
        setBacktestResults(res);
        setIsRetraining(false);
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [selectedTown.id, validationScope]);

  const handleRerunBacktest = (
    newSplitYear: number, 
    newParams: ModelHyperparams, 
    scope?: 'town' | 'all'
  ) => {
    setIsRetraining(true);
    setSplitYear(newSplitYear);
    setHyperparams(newParams);
    const targetScope = scope || validationScope;
    if (scope && scope !== validationScope) {
      setValidationScope(scope);
    }

    setTimeout(() => {
      const townTarget = targetScope === 'town' ? selectedTown.id : undefined;
      const results = runModelBacktesting(townTarget, newSplitYear, newParams);
      setBacktestResults(results);
      setIsRetraining(false);
    }, 40);
  };

  const handleDatasetUpdated = () => {
    const summary = getActiveDatasetSummary();
    setDatasetSummary(summary);
    setIsRetraining(true);
    setTimeout(() => {
      const townTarget = validationScope === 'town' ? selectedTown.id : undefined;
      const results = runModelBacktesting(townTarget, splitYear, hyperparams);
      setBacktestResults(results);
      setIsRetraining(false);
    }, 40);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      {/* Universal Top Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenDatasetManager={() => setIsDatasetModalOpen(true)}
        datasetSummary={datasetSummary}
      />

      {/* Main Workspace Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Contextual Breadcrumb Bar */}
        <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 pb-1">
          <div className="flex items-center gap-1.5">
            <span>Singapore HDB Analytics</span>
            <span>/</span>
            <span className="text-slate-700 dark:text-slate-300 font-medium">{selectedTown.name}</span>
            <span>/</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold capitalize">
              {activeTab === 'trends' ? '20-Year Historical Trends' :
               activeTab === 'forecast' ? 'ML Future Price Forecaster' :
               activeTab === 'backtest' ? 'Backtesting & Validation' :
               'Algorithm Mechanics'}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span>Official HDB: {datasetSummary ? `${datasetSummary.minQuarter} — ${datasetSummary.maxQuarter}` : '2007-Q2 — 2026-Q2'}</span>
            <span>·</span>
            <span>{datasetSummary?.validPriceRows ? `${datasetSummary.validPriceRows.toLocaleString()} Valid Prices` : '12,012 Rows'}</span>
            <span>·</span>
            <span>XGBoost | RF | ANN</span>
          </div>
        </div>

        {/* Tab Views */}
        {activeTab === 'trends' && (
          <HistoricalTrends
            selectedTown={selectedTown}
            onSelectTown={setSelectedTown}
            onNavigateToForecast={() => setActiveTab('forecast')}
            datasetSummary={datasetSummary}
            onOpenDatasetManager={() => setIsDatasetModalOpen(true)}
          />
        )}

        {activeTab === 'forecast' && (
          <MLForecastView
            selectedTown={selectedTown}
            onSelectTown={setSelectedTown}
            backtestResults={backtestResults}
          />
        )}

        {activeTab === 'backtest' && (
          <MLBacktestingView
            selectedTown={selectedTown}
            onSelectTown={setSelectedTown}
            backtestResults={backtestResults}
            onRerunBacktest={handleRerunBacktest}
            isRetraining={isRetraining}
            validationScope={validationScope}
            onToggleValidationScope={(scope) => {
              setValidationScope(scope);
              handleRerunBacktest(splitYear, hyperparams, scope);
            }}
            onOpenDatasetManager={() => setIsDatasetModalOpen(true)}
          />
        )}

        {activeTab === 'architecture' && (
          <ModelInspector />
        )}
      </main>

      {/* Dataset Manager Modal */}
      <DatasetManagerModal
        isOpen={isDatasetModalOpen}
        onClose={() => setIsDatasetModalOpen(false)}
        summary={datasetSummary}
        onDatasetUpdated={handleDatasetUpdated}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 py-6 px-6 text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 transition-colors mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 dark:text-slate-300">SG Resale ML Platform</span>
            <span>·</span>
            <span>Calibrated with Official Singapore HDB Resale Applications Data (data.gov.sg)</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>20-Year Timeline (2007–2026)</span>
            <span>·</span>
            <span>XGBoost (GBDT) · Random Forest · Deep ANN</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
