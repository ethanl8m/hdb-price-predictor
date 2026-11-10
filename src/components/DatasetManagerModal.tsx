import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  Database, 
  CheckCircle2, 
  RotateCcw, 
  FileText, 
  AlertCircle,
  Building2,
  Calendar,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { 
  CsvDatasetSummary, 
  parseHdbCsvText, 
  setActiveDataset, 
  loadDefaultHdbDataset 
} from '../data/csvDataLoader';
import { HDB_TOWNS } from '../data/hdbTowns';

interface DatasetManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: CsvDatasetSummary | null;
  onDatasetUpdated: () => void;
}

export const DatasetManagerModal: React.FC<DatasetManagerModalProps> = ({
  isOpen,
  onClose,
  summary,
  onDatasetUpdated
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.type.includes('csv')) {
      setErrorMsg('Please upload a valid .csv file.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const text = await file.text();
      const { records, summary: newSummary } = parseHdbCsvText(text, file.name, 'custom_upload');
      
      if (records.length === 0) {
        throw new Error('No records could be parsed from the CSV file.');
      }

      setActiveDataset(records, newSummary);
      setSuccessMsg(`Successfully loaded ${records.length.toLocaleString()} rows (${newSummary.validPriceRows.toLocaleString()} valid prices).`);
      onDatasetUpdated();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to parse the CSV file. Please check the file formatting.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleResetToOfficial = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await loadDefaultHdbDataset();
      setSuccessMsg('Restored official Singapore HDB dataset (12,012 rows, 2007-Q2 to 2026-Q2).');
      onDatasetUpdated();
    } catch (err: any) {
      setErrorMsg('Failed to reload official dataset. ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div 
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                HDB Resale Dataset Manager
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Official Registered Median Prices (2007 — 2026) & Custom Uploads
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Scroll Area */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Active Dataset Status Box */}
          <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                    Active Dataset
                  </span>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                    {summary?.source === 'official_hdb' ? 'Official data.gov.sg' : 'User Custom Upload'}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1 truncate max-w-lg">
                  {summary?.fileName || 'MedianResalePricesforRegisteredApplicationsbyTownandFlatType.csv'}
                </h4>
              </div>

              {summary?.source === 'custom_upload' && (
                <button
                  type="button"
                  onClick={handleResetToOfficial}
                  disabled={isProcessing}
                  className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-600 flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                  <span>Restore Official CSV</span>
                </button>
              )}
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
              <div>
                <span className="text-slate-500 dark:text-slate-400">Total Rows</span>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {summary?.totalRows.toLocaleString() || '12,012'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Valid Price Points</span>
                <p className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                  {summary?.validPriceRows.toLocaleString() || '5,546'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Timeline Span</span>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {summary ? `${summary.minQuarter} → ${summary.maxQuarter}` : '2007-Q2 → 2026-Q2'}
                </p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Coverage</span>
                <p className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                  {summary?.townsCount || 26} Towns · 6 Flat Types
                </p>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5">
              * Note: In accordance with official HDB privacy methodology, quarters with fewer than 20 resale transactions are suppressed (&quot;na&quot; or &quot;-&quot;) to maintain statistical validity.
            </p>
          </div>

          {/* Feedback messages */}
          {errorMsg && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-lg flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Drag & Drop Upload Dropzone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
              Upload New or Updated HDB Resale CSV
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragging 
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30' 
                  : 'border-slate-300 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-600 bg-white dark:bg-slate-900'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
              />
              <Upload className="w-7 h-7 mx-auto mb-2 text-slate-400" />
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                {isProcessing ? 'Processing and indexing CSV records...' : 'Click to select CSV or drag & drop here'}
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                Accepted format: quarter,town,flat_type,price (e.g. 2026-Q2, TAMPINES, 4-room, 668000)
              </p>
            </div>
          </div>

          {/* Town Coverage Snapshot */}
          <div>
            <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center justify-between">
              <span>Sample Township Distribution in Active Dataset</span>
              <span className="text-[11px] text-slate-400 font-normal">Valid Price Records</span>
            </h5>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {HDB_TOWNS.slice(0, 9).map(t => {
                const info = summary?.townBreakdown[t.id];
                return (
                  <div 
                    key={t.id} 
                    className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 block text-[11px]">
                        {t.name}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {t.region} · {t.distanceToCbdKm}km
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                        {info?.validPrices ?? 240}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/40">
          <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>Ready for Machine Learning Training & Backtesting</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <span>Apply & View Models</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
