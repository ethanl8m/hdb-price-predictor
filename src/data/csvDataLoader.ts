import { FlatType, HistoricalYearSummary } from '../types/hdb';
import { HDB_TOWNS } from './hdbTowns';
import { NATIONAL_RPI, HISTORICAL_SORA_RATES } from './historicalData';

export interface RawHdbRecord {
  quarter: string; // "2007-Q2"
  year: number;
  quarterNum: number;
  town: string; // Standardized town ID e.g. "TAMPINES"
  rawTown: string;
  flatType: string; // "1-room", "2-room", "3-room", "4-room", "5-room", "Executive"
  standardFlatType: FlatType | '1 ROOM';
  price: number | null; // null if na or -
}

export interface CsvDatasetSummary {
  fileName: string;
  source: 'official_hdb' | 'custom_upload';
  totalRows: number;
  validPriceRows: number;
  suppressedRows: number;
  minYear: number;
  maxYear: number;
  minQuarter: string;
  maxQuarter: string;
  townsCount: number;
  flatTypesCount: number;
  townBreakdown: Record<string, {
    totalRows: number;
    validPrices: number;
    latestQuarter: string;
    latestPrice: number | null;
  }>;
}

export interface RealQuarterlyDataPoint {
  id: string;
  year: number;
  quarter: number;
  dateStr: string;
  town: string;
  flatType: FlatType;
  floorAreaSqm: number;
  storeyLevel: 'LOW' | 'MID' | 'HIGH';
  remainingLease: number;
  distanceToCbd: number;
  soraRate: number;
  macroRpi: number;
  resalePrice: number;
  psf: number;
}

const FLAT_TYPE_MAP: Record<string, FlatType | '1 ROOM'> = {
  '1-room': '1 ROOM',
  '1 room': '1 ROOM',
  '2-room': '2 ROOM',
  '2 room': '2 ROOM',
  '3-room': '3 ROOM',
  '3 room': '3 ROOM',
  '4-room': '4 ROOM',
  '4 room': '4 ROOM',
  '5-room': '5 ROOM',
  '5 room': '5 ROOM',
  'executive': 'EXECUTIVE',
  'multi generation': 'EXECUTIVE',
  'multi-generation': 'EXECUTIVE'
};

const STANDARD_AREAS: Record<string, number> = {
  '1 ROOM': 33,
  '2 ROOM': 45,
  '3 ROOM': 68,
  '4 ROOM': 93,
  '5 ROOM': 112,
  'EXECUTIVE': 144
};

const SQM_TO_SQFT = 10.7639;

// In-memory active dataset
let activeRecords: RawHdbRecord[] = [];
let activeSummary: CsvDatasetSummary | null = null;
let changeListeners: Array<() => void> = [];

export function subscribeToDatasetChanges(listener: () => void): () => void {
  changeListeners.push(listener);
  return () => {
    changeListeners = changeListeners.filter(l => l !== listener);
  };
}

function notifyListeners() {
  changeListeners.forEach(fn => {
    try { fn(); } catch (e) { console.error(e); }
  });
}

/**
 * Standardize town string from raw CSV
 */
export function normalizeTown(raw: string): string {
  const clean = raw.trim().toUpperCase();
  if (clean === 'CENTRAL') return 'CENTRAL AREA';
  if (clean === 'KALLANG / WHAMPOA' || clean === 'KALLANG WHAMPOA') return 'KALLANG/WHAMPOA';
  return clean;
}

/**
 * Parse CSV text into structured records and summary
 */
export function parseHdbCsvText(
  csvText: string,
  fileName = 'MedianResalePricesforRegisteredApplicationsbyTownandFlatType.csv',
  source: 'official_hdb' | 'custom_upload' = 'official_hdb'
): { records: RawHdbRecord[]; summary: CsvDatasetSummary } {
  const lines = csvText.split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV file is empty or missing data lines.');
  }

  // Detect header indices
  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim());
  const quarterIdx = headers.findIndex(h => h.includes('quarter'));
  const townIdx = headers.findIndex(h => h.includes('town'));
  const flatTypeIdx = headers.findIndex(h => h.includes('flat') || h.includes('type'));
  const priceIdx = headers.findIndex(h => h.includes('price') || h.includes('resale') || h.includes('median'));

  const qCol = quarterIdx !== -1 ? quarterIdx : 0;
  const tCol = townIdx !== -1 ? townIdx : 1;
  const ftCol = flatTypeIdx !== -1 ? flatTypeIdx : 2;
  const pCol = priceIdx !== -1 ? priceIdx : 3;

  const records: RawHdbRecord[] = [];
  const townMap: Record<string, { totalRows: number; validPrices: number; latestQuarter: string; latestPrice: number | null }> = {};
  
  let validCount = 0;
  let suppressedCount = 0;
  let minYear = 9999;
  let maxYear = 0;
  let minQuarter = '9999-Q4';
  let maxQuarter = '0000-Q1';

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(',');
    if (parts.length <= Math.max(qCol, tCol, ftCol, pCol)) continue;

    const rawQuarter = parts[qCol]?.trim() || '';
    const rawTown = parts[tCol]?.trim() || '';
    const rawFlatType = parts[ftCol]?.trim() || '';
    const rawPrice = parts[pCol]?.trim() || '';

    if (!rawQuarter || !rawTown) continue;

    // Parse quarter e.g. "2007-Q2" or "2007 Q2"
    const qParts = rawQuarter.replace(' ', '-').split('-');
    const year = parseInt(qParts[0], 10);
    const quarterNum = parseInt(qParts[1]?.replace('Q', '') || '1', 10);

    if (isNaN(year)) continue;

    if (year < minYear) minYear = year;
    if (year > maxYear) maxYear = year;
    if (rawQuarter < minQuarter) minQuarter = rawQuarter;
    if (rawQuarter > maxQuarter) maxQuarter = rawQuarter;

    const town = normalizeTown(rawTown);
    const normFlatKey = rawFlatType.toLowerCase();
    const standardFlatType = FLAT_TYPE_MAP[normFlatKey] || '4 ROOM';

    const numPrice = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
    const isValid = !isNaN(numPrice) && numPrice > 0;

    if (isValid) {
      validCount++;
    } else {
      suppressedCount++;
    }

    if (!townMap[town]) {
      townMap[town] = {
        totalRows: 0,
        validPrices: 0,
        latestQuarter: rawQuarter,
        latestPrice: null
      };
    }
    townMap[town].totalRows++;
    if (isValid) {
      townMap[town].validPrices++;
      if (rawQuarter >= townMap[town].latestQuarter || !townMap[town].latestPrice) {
        townMap[town].latestQuarter = rawQuarter;
        townMap[town].latestPrice = numPrice;
      }
    }

    records.push({
      quarter: rawQuarter,
      year,
      quarterNum,
      town,
      rawTown,
      flatType: rawFlatType,
      standardFlatType,
      price: isValid ? numPrice : null
    });
  }

  const summary: CsvDatasetSummary = {
    fileName,
    source,
    totalRows: records.length,
    validPriceRows: validCount,
    suppressedRows: suppressedCount,
    minYear: minYear === 9999 ? 2007 : minYear,
    maxYear: maxYear === 0 ? 2026 : maxYear,
    minQuarter,
    maxQuarter,
    townsCount: Object.keys(townMap).length,
    flatTypesCount: 6,
    townBreakdown: townMap
  };

  return { records, summary };
}

/**
 * Set active dataset and alert subscribers
 */
export function setActiveDataset(records: RawHdbRecord[], summary: CsvDatasetSummary) {
  activeRecords = records;
  activeSummary = summary;
  notifyListeners();
}

/**
 * Get active dataset summary
 */
export function getActiveDatasetSummary(): CsvDatasetSummary | null {
  return activeSummary;
}

/**
 * Get active raw records
 */
export function getActiveRecords(): RawHdbRecord[] {
  return activeRecords;
}

/**
 * Calculate 20-year historical annual summaries for a town directly from the active CSV dataset
 */
export function generateTownDataFromCsv(townId: string): HistoricalYearSummary[] {
  const town = HDB_TOWNS.find(t => t.id === townId) || HDB_TOWNS[0];
  const townRecords = activeRecords.filter(r => r.town === town.id);

  // Years from 2006 to 2026 (21 years)
  const years = Array.from({ length: 21 }, (_, i) => 2006 + i);

  // Group records by year and flat type
  const recordsByYear = new Map<number, RawHdbRecord[]>();
  townRecords.forEach(r => {
    const list = recordsByYear.get(r.year) || [];
    list.push(r);
    recordsByYear.set(r.year, list);
  });

  // Calculate annual town medians and flat type medians
  return years.map(year => {
    const rpi = NATIONAL_RPI[year] || 150;
    const sora = HISTORICAL_SORA_RATES[year] || 2.5;
    const remainingLease = Math.max(30, 99 - (year - town.avgLeaseCommenceYear));

    const yrRecords = recordsByYear.get(year) || [];
    const validPrices = yrRecords.filter(r => r.price !== null).map(r => r.price!);

    // Calculate by flat type
    const flatTypes: FlatType[] = ['2 ROOM', '3 ROOM', '4 ROOM', '5 ROOM', 'EXECUTIVE'];
    const byFlatType: HistoricalYearSummary['byFlatType'] = {} as any;

    let weightedPriceSum = 0;
    let weightedPsfSum = 0;
    let weightedPsmSum = 0;
    let totalCount = 0;

    flatTypes.forEach(ft => {
      const area = STANDARD_AREAS[ft] || 93;
      const ftRecords = yrRecords.filter(r => r.standardFlatType === ft && r.price !== null);
      const ftPrices = ftRecords.map(r => r.price!);

      let medianPrice: number;
      if (ftPrices.length > 0) {
        ftPrices.sort((a, b) => a - b);
        medianPrice = ftPrices[Math.floor(ftPrices.length / 2)];
      } else {
        // If suppressed or pre-2007 (2006), extrapolate from town baseline & RPI
        const base4Room = 450000;
        const ftRatio = ft === '2 ROOM' ? 0.6 : ft === '3 ROOM' ? 0.72 : ft === '4 ROOM' ? 1.0 : ft === '5 ROOM' ? 1.25 : 1.45;
        const rpiRatio = rpi / (NATIONAL_RPI[2026] || 198.8);
        medianPrice = Math.round(base4Room * ftRatio * rpiRatio * (town.isMature ? 1.2 : 0.95));
      }

      const psf = Math.round(medianPrice / (area * SQM_TO_SQFT));
      const psm = Math.round(medianPrice / area);
      const count = Math.max(80, ftPrices.length * 35); // Estimated transactions

      byFlatType[ft] = {
        medianPrice,
        avgPrice: Math.round(medianPrice * 1.02),
        avgPsf: psf,
        count
      };

      weightedPriceSum += medianPrice * count;
      weightedPsfSum += psf * count;
      weightedPsmSum += psm * count;
      totalCount += count;
    });

    // Town overall median
    let townMedian: number;
    if (validPrices.length > 0) {
      validPrices.sort((a, b) => a - b);
      townMedian = validPrices[Math.floor(validPrices.length / 2)];
    } else {
      townMedian = byFlatType['4 ROOM'].medianPrice;
    }

    const avgPrice = Math.round(weightedPriceSum / totalCount);
    const avgPsf = Math.round(weightedPsfSum / totalCount);
    const avgPsm = Math.round(weightedPsmSum / totalCount);

    return {
      year,
      town: town.id,
      medianPrice: townMedian,
      avgPrice,
      avgPsm,
      avgPsf,
      transactionCount: totalCount,
      byFlatType,
      resalePriceIndex: rpi,
      soraRate: sora,
      remainingLeaseAvg: remainingLease
    };
  });
}

/**
 * Generate quarterly samples directly from active CSV records for Machine Learning training & backtesting
 */
export function generateQuarterlyDatasetFromCsv(selectedTownId?: string): RealQuarterlyDataPoint[] {
  const townsMap = new Map(HDB_TOWNS.map(t => [t.id, t]));
  const dataset: RealQuarterlyDataPoint[] = [];

  const targetRecords = selectedTownId
    ? activeRecords.filter(r => r.town === selectedTownId && r.price !== null)
    : activeRecords.filter(r => r.price !== null);

  targetRecords.forEach(r => {
    const town = townsMap.get(r.town);
    if (!town || r.price === null) return;

    // Filter to standard flat types
    if (r.standardFlatType === '1 ROOM') return;
    const ft = r.standardFlatType as FlatType;
    const area = STANDARD_AREAS[ft] || 93;

    const baseRpi = NATIONAL_RPI[r.year] || 150;
    const prevRpi = NATIONAL_RPI[r.year - 1] || baseRpi;
    const quarterFraction = (r.quarterNum - 1) / 4;
    const macroRpi = prevRpi + (baseRpi - prevRpi) * (0.25 + quarterFraction * 0.75);
    const soraRate = HISTORICAL_SORA_RATES[r.year] || 2.5;
    const remainingLease = Math.max(30, 99 - (r.year - town.avgLeaseCommenceYear));

    const psf = Math.round(r.price / (area * SQM_TO_SQFT));

    dataset.push({
      id: `${r.town}-${r.year}-Q${r.quarterNum}-${ft}`,
      year: r.year,
      quarter: r.quarterNum,
      dateStr: `${r.year} Q${r.quarterNum}`,
      town: r.town,
      flatType: ft,
      floorAreaSqm: area,
      storeyLevel: 'MID',
      remainingLease,
      distanceToCbd: town.distanceToCbdKm,
      soraRate,
      macroRpi: Math.round(macroRpi * 10) / 10,
      resalePrice: r.price,
      psf
    });
  });

  return dataset;
}

/**
 * Initialize default official dataset from the static CSV file
 */
export async function loadDefaultHdbDataset(): Promise<CsvDatasetSummary> {
  try {
    const response = await fetch('/assets/aistudio/MedianResalePricesforRegisteredApplicationsbyTownandFlatType_2c62da3e.csv');
    if (!response.ok) {
      throw new Error(`Failed to load default CSV: ${response.statusText}`);
    }
    const text = await response.text();
    const { records, summary } = parseHdbCsvText(
      text,
      'MedianResalePricesforRegisteredApplicationsbyTownandFlatType.csv',
      'official_hdb'
    );
    setActiveDataset(records, summary);
    return summary;
  } catch (err) {
    console.warn('Network fetch of CSV failed, trying direct text fallback:', err);
    throw err;
  }
}
