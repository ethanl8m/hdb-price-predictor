import React, { useState, useMemo } from 'react';
import { 
  Building2, 
  ArrowUpRight, 
  Download, 
  Info, 
  GitCompare, 
  Calendar,
  Layers,
  Sparkles,
  Database
} from 'lucide-react';
import { TownInfo, FlatType, HistoricalYearSummary } from '../types/hdb';
import { HDB_TOWNS } from '../data/hdbTowns';
import { 
  generateTownHistoricalData, 
  MARKET_MILESTONES, 
  NATIONAL_RPI 
} from '../data/historicalData';
import { CsvDatasetSummary } from '../data/csvDataLoader';
import { TownSelector } from './TownSelector';

interface HistoricalTrendsProps {
  selectedTown: TownInfo;
  onSelectTown: (town: TownInfo) => void;
  onNavigateToForecast: () => void;
  datasetSummary?: CsvDatasetSummary | null;
  onOpenDatasetManager?: () => void;
}

type MetricMode = 'price' | 'psf' | 'psm' | 'volume' | 'rpi';

export const HistoricalTrends: React.FC<HistoricalTrendsProps> = ({
  selectedTown,
  onSelectTown,
  onNavigateToForecast,
  datasetSummary,
  onOpenDatasetManager
}) => {
  const [flatType, setFlatType] = useState<FlatType | 'ALL'>('ALL');
  const [metricMode, setMetricMode] = useState<MetricMode>('price');
  const [showMilestones, setShowMilestones] = useState(true);
  const [compareTown, setCompareTown] = useState<TownInfo | null>(null);
  const [hoveredYear, setHoveredYear] = useState<number | null>(null);

  // Generate 20-year data (2006 - 2026) for primary town using real CSV data if loaded
  const historicalData = useMemo(() => {
    return generateTownHistoricalData(selectedTown.id);
  }, [selectedTown.id, datasetSummary]);

  // Generate for comparison town if active
  const compareData = useMemo(() => {
    if (!compareTown) return null;
    return generateTownHistoricalData(compareTown.id);
  }, [compareTown?.id, datasetSummary]);

  // Extract metric values
  const getMetricValue = (item: HistoricalYearSummary, ft: FlatType | 'ALL', mode: MetricMode): number => {
    if (ft !== 'ALL' && item.byFlatType[ft]) {
      const flat = item.byFlatType[ft];
      if (mode === 'price') return flat.medianPrice;
      if (mode === 'psf') return flat.avgPsf;
      if (mode === 'psm') return Math.round(flat.avgPsf * 10.7639);
      if (mode === 'volume') return flat.count;
      if (mode === 'rpi') return Math.round((flat.medianPrice / (historicalData[0].byFlatType[ft]?.medianPrice || 1)) * 1000) / 10;
    }

    if (mode === 'price') return item.medianPrice;
    if (mode === 'psf') return item.avgPsf;
    if (mode === 'psm') return item.avgPsm;
    if (mode === 'volume') return item.transactionCount;
    if (mode === 'rpi') {
      const basePrice = historicalData[0].medianPrice || 1;
      return Math.round((item.medianPrice / basePrice) * 1000) / 10;
    }
    return item.medianPrice;
  };

  // Formatter for Y-axis and tooltips
  const formatValue = (val: number, mode: MetricMode): string => {
    if (mode === 'price') return `$${(val / 1000).toFixed(0)}k`;
    if (mode === 'psf') return `$${val}/sqft`;
    if (mode === 'psm') return `$${val}/sqm`;
    if (mode === 'volume') return `${val.toLocaleString()} units`;
    if (mode === 'rpi') return `${val.toFixed(1)} pts`;
    return val.toString();
  };

  // Full value formatter for cards
  const formatFullCurrency = (val: number): string => {
    return new Intl.NumberFormat('en-SG', {
      style: 'currency',
      currency: 'SGD',
      maximumFractionDigits: 0
    }).format(val);
  };

  // Calculate high-level KPIs
  const data2006 = historicalData[0];
  const data2026 = historicalData[historicalData.length - 1];

  const price2006 = getMetricValue(data2006, flatType, 'price');
  const price2026 = getMetricValue(data2026, flatType, 'price');
  const appreciationRate = ((price2026 - price2006) / price2006) * 100;
  const cagr = (Math.pow(price2026 / price2006, 1 / 20) - 1) * 100;

  // Chart coordinate math (SVG viewBox: 0 0 900 360)
  const padding = { top: 30, right: 35, bottom: 45, left: 65 };
  const chartWidth = 900;
  const chartHeight = 360;
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const primarySeries = historicalData.map(d => ({
    year: d.year,
    val: getMetricValue(d, flatType, metricMode),
    raw: d
  }));

  const compareSeries = compareData?.map(d => ({
    year: d.year,
    val: getMetricValue(d, flatType, metricMode),
    raw: d
  }));

  const allVals = [
    ...primarySeries.map(s => s.val),
    ...(compareSeries ? compareSeries.map(s => s.val) : [])
  ];

  const minVal = Math.floor(Math.min(...allVals) * 0.92);
  const maxVal = Math.ceil(Math.max(...allVals) * 1.08);

  const getX = (year: number) => {
    return padding.left + ((year - 2006) / 20) * innerWidth;
  };

  const getY = (val: number) => {
    const ratio = (val - minVal) / (maxVal - minVal || 1);
    return padding.top + (1 - ratio) * innerHeight;
  };

  // Build SVG Path
  const primaryPath = primarySeries.reduce((acc, curr, idx) => {
    const x = getX(curr.year);
    const y = getY(curr.val);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const primaryAreaPath = `${primaryPath} L ${getX(2026)} ${padding.top + innerHeight} L ${getX(2006)} ${padding.top + innerHeight} Z`;

  const comparePath = compareSeries ? compareSeries.reduce((acc, curr, idx) => {
    const x = getX(curr.year);
    const y = getY(curr.val);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '') : '';

  // Download CSV
  const handleExportCsv = () => {
    const headers = ['Year', 'Town', 'Median Price (SGD)', 'Avg PSF (SGD)', 'Avg PSM (SGD)', 'Annual Transactions', 'Remaining Lease (Yrs)', 'National RPI'];
    const rows = historicalData.map(d => [
      d.year,
      d.town,
      getMetricValue(d, flatType, 'price'),
      getMetricValue(d, flatType, 'psf'),
      getMetricValue(d, flatType, 'psm'),
      getMetricValue(d, flatType, 'volume'),
      d.remainingLeaseAvg,
      d.resalePriceIndex
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + 
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `HDB_resale_trends_${selectedTown.id}_2006_2026.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hoveredData = hoveredYear !== null 
    ? historicalData.find(d => d.year === hoveredYear) || null 
    : historicalData[historicalData.length - 1];

  const hoveredCompareData = (hoveredYear !== null && compareData)
    ? compareData.find(d => d.year === hoveredYear) || null
    : compareData ? compareData[compareData.length - 1] : null;

  return (
    <div className="space-y-6">
      {/* Top Filter & Selector Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-end">
          {/* Primary Town Selector */}
          <div className="lg:col-span-6">
            <TownSelector
              selectedTown={selectedTown}
              onSelectTown={onSelectTown}
              label="Primary Town (Type Postal Code or Select)"
            />
          </div>

          {/* Comparison Town Selector */}
          <div className="lg:col-span-6">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <GitCompare className="w-3.5 h-3.5 text-slate-400" />
                <span>Compare with Town (Optional)</span>
              </label>
              {compareTown && (
                <button
                  type="button"
                  onClick={() => setCompareTown(null)}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
                >
                  Clear Comparison
                </button>
              )}
            </div>

            <select
              value={compareTown?.id || ''}
              onChange={(e) => {
                const val = e.target.value;
                setCompareTown(val ? HDB_TOWNS.find(t => t.id === val) || null : null);
              }}
              className="w-full py-2 px-3 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors"
            >
              <option value="">No comparison town selected</option>
              {HDB_TOWNS.filter(t => t.id !== selectedTown.id).map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.region} · {t.distanceToCbdKm}km CBD)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          {/* Flat Type Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            {(['ALL', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE'] as const).map(ft => (
              <button
                key={ft}
                type="button"
                onClick={() => setFlatType(ft)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                  flatType === ft
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {ft === 'ALL' ? 'All Room Types' : ft}
              </button>
            ))}
          </div>

          {/* Metric View Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setMetricMode('price')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                metricMode === 'price'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Resale Price (SGD)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('psf')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                metricMode === 'psf'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              PSF (Per Sqft)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('volume')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                metricMode === 'volume'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Volume (Units)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('rpi')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${
                metricMode === 'rpi'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              Growth Index (Base=100)
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowMilestones(!showMilestones)}
              className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                showMilestones 
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300' 
                  : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400'
              }`}
            >
              {showMilestones ? 'Milestones: Visible' : 'Milestones: Hidden'}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="p-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="Export CSV data"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            2026 Current Median
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {formatFullCurrency(price2026)}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1">
            <span>2006: {formatFullCurrency(price2006)}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            20-Year Capital Gain
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-5 h-5" />
            <span>+{appreciationRate.toFixed(1)}%</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Compound CAGR: +{cagr.toFixed(2)}% p.a.
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Current Avg PSF
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            ${getMetricValue(data2026, flatType, 'psf')}/sqft
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            ${getMetricValue(data2026, flatType, 'psm')}/sqm
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 transition-colors">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
            Est. Remaining Lease
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {data2026.remainingLeaseAvg} Years
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Avg Built Year: {selectedTown.avgLeaseCommenceYear}
          </div>
        </div>
      </div>

      {/* Main Interactive Chart Canvas */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 transition-colors shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>{selectedTown.name} Resale Trajectory (2006 — 2026)</span>
                {compareTown && (
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                    vs {compareTown.name}
                  </span>
                )}
              </h2>
              {onOpenDatasetManager && (
                <button
                  type="button"
                  onClick={onOpenDatasetManager}
                  className="px-2 py-0.5 rounded text-[11px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700/80 flex items-center gap-1 transition-colors"
                >
                  <Database className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>HDB CSV (2007-Q2 — 2026-Q2)</span>
                </button>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing {flatType === 'ALL' ? 'Overall Town Median' : flatType} · Official Singapore HDB Resale Data Calibration
            </p>
          </div>

          {/* Interactive Legend */}
          <div className="flex items-center gap-5 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
              <span className="font-medium">{selectedTown.name}</span>
            </div>
            {compareTown && (
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                <span className="font-medium">{compareTown.name}</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-400 shrink-0" />
              <span className="text-slate-400">National RPI Reference</span>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="relative w-full aspect-[21/9] min-h-[300px]">
          <svg 
            viewBox={`0 0 ${chartWidth} ${chartHeight}`} 
            className="w-full h-full overflow-visible select-none"
          >
            <defs>
              <linearGradient id="primaryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Y-axis gridlines & labels */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((step, idx) => {
              const val = Math.round(minVal + step * (maxVal - minVal));
              const y = getY(val);
              return (
                <g key={idx}>
                  <line 
                    x1={padding.left} 
                    y1={y} 
                    x2={chartWidth - padding.right} 
                    y2={y} 
                    stroke="currentColor" 
                    className="text-slate-200 dark:text-slate-800" 
                    strokeDasharray="3 3" 
                  />
                  <text 
                    x={padding.left - 10} 
                    y={y + 4} 
                    textAnchor="end" 
                    className="text-[11px] font-mono tabular-nums fill-slate-400"
                  >
                    {formatValue(val, metricMode)}
                  </text>
                </g>
              );
            })}

            {/* Area fill for primary series */}
            <path d={primaryAreaPath} fill="url(#primaryAreaGrad)" />

            {/* Comparison line if present */}
            {comparePath && (
              <path 
                d={comparePath} 
                fill="none" 
                stroke="#3b82f6" 
                strokeWidth="2.5" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
              />
            )}

            {/* Primary line */}
            <path 
              d={primaryPath} 
              fill="none" 
              stroke="#10b981" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />

            {/* Milestone markers on chart */}
            {showMilestones && MARKET_MILESTONES.map((ms) => {
              const x = getX(ms.year);
              const isHovered = hoveredYear === ms.year;
              return (
                <g key={ms.year}>
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + innerHeight}
                    stroke="currentColor"
                    className="text-amber-400/60 dark:text-amber-500/40"
                    strokeDasharray="2 2"
                  />
                  <circle
                    cx={x}
                    cy={padding.top - 8}
                    r={isHovered ? 5 : 3.5}
                    className="fill-amber-500 hover:fill-amber-400 transition-all cursor-pointer"
                  />
                </g>
              );
            })}

            {/* X-axis tick labels */}
            {primarySeries.map(s => {
              const x = getX(s.year);
              const isHighlighted = s.year % 4 === 2 || s.year === 2006 || s.year === 2026;
              return (
                <g key={s.year}>
                  <line 
                    x1={x} 
                    y1={padding.top + innerHeight} 
                    x2={x} 
                    y2={padding.top + innerHeight + 5} 
                    stroke="currentColor" 
                    className="text-slate-300 dark:text-slate-700" 
                  />
                  {isHighlighted && (
                    <text 
                      x={x} 
                      y={padding.top + innerHeight + 20} 
                      textAnchor="middle" 
                      className={`text-[11px] font-mono tabular-nums ${
                        hoveredYear === s.year ? 'fill-emerald-600 font-bold' : 'fill-slate-500 dark:fill-slate-400'
                      }`}
                    >
                      {s.year}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Interactive hover points & crosshair */}
            {primarySeries.map(s => {
              const x = getX(s.year);
              const y = getY(s.val);
              const isHovered = hoveredYear === s.year;

              return (
                <g key={s.year}>
                  {/* Invisible wide column for hover target */}
                  <rect
                    x={x - (innerWidth / 40)}
                    y={padding.top}
                    width={innerWidth / 20}
                    height={innerHeight}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredYear(s.year)}
                    onMouseLeave={() => setHoveredYear(null)}
                  />

                  {/* Dot on active point */}
                  <circle
                    cx={x}
                    cy={y}
                    r={isHovered ? 6 : 3.5}
                    className={`transition-all duration-150 ${
                      isHovered 
                        ? 'fill-emerald-600 stroke-4 stroke-white dark:stroke-slate-900' 
                        : 'fill-emerald-500 hover:fill-emerald-600'
                    }`}
                  />

                  {compareSeries && (
                    <circle
                      cx={x}
                      cy={getY(compareSeries.find(c => c.year === s.year)?.val || 0)}
                      r={isHovered ? 5 : 2.5}
                      className="fill-blue-500"
                    />
                  )}
                </g>
              );
            })}

            {/* Vertical crosshair */}
            {hoveredYear !== null && (
              <line
                x1={getX(hoveredYear)}
                y1={padding.top}
                x2={getX(hoveredYear)}
                y2={padding.top + innerHeight}
                stroke="#10b981"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                className="pointer-events-none opacity-80"
              />
            )}
          </svg>
        </div>

        {/* Hover Snapshot Panel */}
        {hoveredData && (
          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
            <div>
              <span className="text-slate-400">Year Reference</span>
              <p className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-sm">
                {hoveredData.year}
              </p>
            </div>
            <div>
              <span className="text-slate-400">{selectedTown.name} Value</span>
              <p className="font-semibold font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                {formatValue(getMetricValue(hoveredData, flatType, metricMode), metricMode)}
              </p>
            </div>
            {hoveredCompareData && (
              <div>
                <span className="text-slate-400">{compareTown?.name} Value</span>
                <p className="font-semibold font-mono text-blue-600 dark:text-blue-400 text-sm">
                  {formatValue(getMetricValue(hoveredCompareData, flatType, metricMode), metricMode)}
                </p>
              </div>
            )}
            <div>
              <span className="text-slate-400">Annual Volume</span>
              <p className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-sm">
                {hoveredData.transactionCount.toLocaleString()} flats
              </p>
            </div>
            <div>
              <span className="text-slate-400">Policy / Macro SORA</span>
              <p className="font-semibold font-mono text-slate-800 dark:text-slate-200 text-sm">
                {hoveredData.soraRate}% SORA · RPI {hoveredData.resalePriceIndex}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Policy Milestones Timeline Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-colors">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-600" />
          <span>Major Singapore Housing Policy Milestones (2006 — 2026)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {MARKET_MILESTONES.map((ms) => (
            <div 
              key={ms.year}
              className={`p-3 rounded-lg border transition-colors ${
                hoveredYear === ms.year
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{ms.year}</span>
                <span className={`text-[10px] font-medium ${
                  ms.impact === 'cool' ? 'text-blue-600 dark:text-blue-400' :
                  ms.impact === 'boost' ? 'text-amber-600 dark:text-amber-400' :
                  'text-slate-500'
                }`}>
                  {ms.impact === 'cool' ? 'Cooling Measure' : ms.impact === 'boost' ? 'Market Stimulus' : 'Structural Shift'}
                </span>
              </div>
              <h4 className="text-xs font-semibold text-slate-900 dark:text-slate-100">{ms.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                {ms.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA to Predict future prices */}
      <div className="p-5 bg-gradient-to-r from-emerald-900 to-teal-900 text-white rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-base font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-300" />
            <span>Ready to Forecast Future HDB Prices for {selectedTown.name}?</span>
          </h4>
          <p className="text-xs text-emerald-100 mt-1 max-w-xl">
            Simulate 2027 to 2031 valuations using calibrated XGBoost, Random Forest, and Deep Neural Network regression algorithms.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateToForecast}
          className="px-5 py-2.5 bg-white text-emerald-900 font-semibold text-xs rounded-lg hover:bg-emerald-50 transition-colors whitespace-nowrap shadow-sm shrink-0"
        >
          Open ML Forecaster →
        </button>
      </div>
    </div>
  );
};
