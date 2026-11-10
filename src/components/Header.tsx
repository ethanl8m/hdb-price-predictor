import React from 'react';
import { TrendingUp, Sun, Moon, Database } from 'lucide-react';

import { CsvDatasetSummary } from '../data/csvDataLoader';

interface HeaderProps {
  activeTab: 'trends' | 'forecast' | 'backtest' | 'architecture';
  setActiveTab: (tab: 'trends' | 'forecast' | 'backtest' | 'architecture') => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOpenDatasetManager?: () => void;
  datasetSummary?: CsvDatasetSummary | null;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  setIsDark,
  onOpenDatasetManager,
  datasetSummary
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-colors">
      {/* Zone 1: Single Brand wordmark element */}
      <a 
        href="#" 
        onClick={(e) => { e.preventDefault(); setActiveTab('trends'); }}
        className="flex items-center gap-2.5 text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
      >
        <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
          <TrendingUp className="w-5 h-5" />
        </div>
        <span>SG Resale ML</span>
      </a>

      {/* Zone 2: 4 single-line clean text nav links */}
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
        <button
          onClick={() => setActiveTab('trends')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === 'trends'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          20-Year Trends
          {activeTab === 'trends' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === 'forecast'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Price Forecaster
          {activeTab === 'forecast' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('backtest')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === 'backtest'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Backtesting & Validation
          {activeTab === 'backtest' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('architecture')}
          className={`whitespace-nowrap shrink-0 transition-colors py-1 relative ${
            activeTab === 'architecture'
              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
          }`}
        >
          Algorithm Mechanics
          {activeTab === 'architecture' && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-600 dark:bg-emerald-400 rounded-full" />
          )}
        </button>
      </nav>

      {/* Zone 3: Dataset badge, theme switch, & primary action */}
      <div className="flex items-center gap-2.5 shrink-0">
        {onOpenDatasetManager && (
          <button
            type="button"
            onClick={onOpenDatasetManager}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
            title="Manage HDB Resale CSV Dataset"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Dataset ({datasetSummary?.validPriceRows ? `${datasetSummary.validPriceRows.toLocaleString()} pts` : '12,012 rows'})</span>
          </button>
        )}

        <button
          onClick={() => setIsDark(!isDark)}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={() => setActiveTab('forecast')}
          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg transition-colors whitespace-nowrap shrink-0 shadow-xs"
        >
          Predict Price
        </button>
      </div>
    </header>
  );
};
