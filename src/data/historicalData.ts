import { HistoricalYearSummary, MilestoneEvent, FlatType } from '../types/hdb';
import { HDB_TOWNS } from './hdbTowns';

// Singapore Official HDB Resale Price Index trajectory (2006 to 2026)
// Base 2009 Q1 = 100
export const NATIONAL_RPI: Record<number, number> = {
  2006: 80.2,
  2007: 89.5,
  2008: 102.1,
  2009: 108.4,
  2010: 123.6,
  2011: 136.9,
  2012: 145.8,
  2013: 149.4, // Q2 2013 Peak
  2014: 140.4, // Post TDSR/MSR cooling
  2015: 135.2,
  2016: 134.7,
  2017: 132.8,
  2018: 131.6,
  2019: 131.5, // 6-year trough
  2020: 138.1, // COVID supply crunch surge
  2021: 155.6,
  2022: 171.8, // 15-month wait-out introduced
  2023: 180.2,
  2024: 189.5,
  2025: 194.2,
  2026: 198.8
};

// Historical SORA / Benchmark Interest Rates
export const HISTORICAL_SORA_RATES: Record<number, number> = {
  2006: 3.25,
  2007: 2.85,
  2008: 1.75,
  2009: 0.65,
  2010: 0.45,
  2011: 0.38,
  2012: 0.35,
  2013: 0.42,
  2014: 0.58,
  2015: 1.15,
  2016: 1.25,
  2017: 1.35,
  2018: 1.85,
  2019: 1.75,
  2020: 0.72,
  2021: 0.85,
  2022: 2.95,
  2023: 3.65,
  2024: 3.45,
  2025: 3.15,
  2026: 2.95
};

export const MARKET_MILESTONES: MilestoneEvent[] = [
  {
    year: 2008,
    title: 'Global Financial Crisis',
    description: 'Global equity turmoil; aggressive interest rate cuts triggered safe-haven flight into Singapore property.',
    impact: 'boost'
  },
  {
    year: 2011,
    title: 'Cooling Measures & Minimum Occupation Period (MOP)',
    description: 'Stricter financing rules and 5-year MOP enforcement to curb speculative flipping.',
    impact: 'cool'
  },
  {
    year: 2013,
    title: 'TDSR (60%) & MSR (30%) Implemented',
    description: 'Game-changing debt framework capping monthly mortgage at 30% of gross income and shortening max tenure to 25 years.',
    impact: 'cool'
  },
  {
    year: 2014,
    title: 'Removal of Cash-Over-Valuation (COV)',
    description: 'Valuation made available only after Option to Purchase (OTP) is granted, breaking the upward COV spiral.',
    impact: 'cool'
  },
  {
    year: 2018,
    title: 'ABSD & LTV Tightening',
    description: 'Higher Additional Buyer Stamp Duty on second homes and LTV limit lowered by 5% to 75%.',
    impact: 'cool'
  },
  {
    year: 2020,
    title: 'COVID-19 Pandemic & BTO Delays',
    description: 'Construction shutdowns and work-from-home demand sparked an unprecedented resale demand wave.',
    impact: 'boost'
  },
  {
    year: 2021,
    title: 'Dec 2021 Cooling Package',
    description: 'TDSR tightened to 55%, HDB housing loan LTV reduced from 90% to 85%, ABSD raised for foreigners and investors.',
    impact: 'cool'
  },
  {
    year: 2022,
    title: 'Sept 2022 15-Month Wait-Out Rule',
    description: 'Private property owners must wait 15 months after selling before purchasing non-subsidised resale flats.',
    impact: 'cool'
  },
  {
    year: 2024,
    title: 'Standard, Plus, Prime Framework',
    description: 'HDB launched new classification for BTOs with 10-year MOP and subsidy recovery on resale.',
    impact: 'neutral'
  },
  {
    year: 2026,
    title: 'Supply Normalization & Steady Growth',
    description: 'Large pipeline of BTO completions stabilizes supply; price appreciation normalizes to sustainable ~2-3% p.a.',
    impact: 'neutral'
  }
];

// Baseline prices across flat types (for year 2026 base reference, in SGD)
const FLAT_BASELINES: Record<FlatType, { areaSqm: number; basePsf: number; countShare: number }> = {
  '2 ROOM': { areaSqm: 45, basePsf: 580, countShare: 0.05 },
  '3 ROOM': { areaSqm: 68, basePsf: 595, countShare: 0.28 },
  '4 ROOM': { areaSqm: 93, basePsf: 615, countShare: 0.42 },
  '5 ROOM': { areaSqm: 112, basePsf: 635, countShare: 0.20 },
  'EXECUTIVE': { areaSqm: 144, basePsf: 650, countShare: 0.05 }
};

// SQM to SQFT conversion constant
export const SQM_TO_SQFT = 10.7639;

// Town specific multiplier based on distance to CBD, maturity, and prestige
function getTownMultiplier(townId: string): number {
  const town = HDB_TOWNS.find(t => t.id === townId);
  if (!town) return 1.0;
  
  // Specific town historical calibrations
  const specialMultipliers: Record<string, number> = {
    'CENTRAL AREA': 1.62,
    'BUKIT MERAH': 1.45,
    'QUEENSTOWN': 1.48,
    'BISHAN': 1.42,
    'BUKIT TIMAH': 1.40,
    'MARINE PARADE': 1.34,
    'TOA PAYOH': 1.32,
    'KALLANG/WHAMPOA': 1.30,
    'CLEMENTI': 1.25,
    'GEYLANG': 1.20,
    'SERANGOON': 1.18,
    'ANG MO KIO': 1.15,
    'TAMPINES': 1.12,
    'BEDOK': 1.10,
    'HOUGANG': 1.02,
    'PASIR RIS': 1.01,
    'PUNGGOL': 1.03, // Newer flats command higher PSF despite distance
    'SENGKANG': 0.99,
    'JURONG EAST': 1.03, // 2nd CBD boost
    'BUKIT BATOK': 0.94,
    'YISHUN': 0.92,
    'BUKIT PANJANG': 0.91,
    'CHOA CHU KANG': 0.89,
    'JURONG WEST': 0.88,
    'SEMBAWANG': 0.87,
    'WOODLANDS': 0.87
  };

  return specialMultipliers[townId] || 1.0;
}

import { generateTownDataFromCsv, generateQuarterlyDatasetFromCsv, getActiveRecords } from './csvDataLoader';

/**
 * Generate comprehensive 20-year historical dataset (2006 to 2026) for each town
 * Automatically uses real official CSV records if loaded, with smooth baseline calibration
 */
export function generateTownHistoricalData(townId: string): HistoricalYearSummary[] {
  if (getActiveRecords().length > 0) {
    return generateTownDataFromCsv(townId);
  }

  const town = HDB_TOWNS.find(t => t.id === townId) || HDB_TOWNS[0];
  const townMultiplier = getTownMultiplier(town.id);
  const years = Array.from({ length: 21 }, (_, i) => 2006 + i); // 2006 - 2026

  const baseAnnualTransactions = town.isMature ? 1350 : 1850;

  return years.map(year => {
    const rpi = NATIONAL_RPI[year];
    const rpiRatio = rpi / NATIONAL_RPI[2026];
    const sora = HISTORICAL_SORA_RATES[year];

    // Town age decay factor: remaining lease decreases ~1 year every year
    const remainingLease = Math.max(35, 99 - (year - town.avgLeaseCommenceYear));
    // Lease decay effect (Bala's curve approximation)
    const leaseFactor = remainingLease > 75 ? 1.0 : 1.0 - (75 - remainingLease) * 0.0035;

    // Flat types calculations
    const flatTypes = Object.keys(FLAT_BASELINES) as FlatType[];
    const byFlatType: HistoricalYearSummary['byFlatType'] = {} as any;
    
    let totalWeightedPrice = 0;
    let totalWeightedPsf = 0;
    let totalWeightedPsm = 0;
    let totalCount = 0;

    flatTypes.forEach(ft => {
      const config = FLAT_BASELINES[ft];
      // Price per sqft in year
      const psf = Math.round(config.basePsf * townMultiplier * rpiRatio * leaseFactor);
      const psm = Math.round(psf * SQM_TO_SQFT);
      const price = Math.round((psm * config.areaSqm) / 1000) * 1000;
      
      // Volume variation based on market cycle
      let volumeMultiplier = 1.0;
      if (year === 2013) volumeMultiplier = 0.85; // cooling dip
      if (year === 2014 || year === 2015) volumeMultiplier = 0.88;
      if (year === 2020) volumeMultiplier = 1.15; // post-lockdown surge
      if (year === 2021) volumeMultiplier = 1.25; // record high volumes
      if (year === 2022) volumeMultiplier = 1.12;

      const count = Math.round(baseAnnualTransactions * config.countShare * volumeMultiplier);

      byFlatType[ft] = {
        medianPrice: price,
        avgPrice: Math.round(price * 1.015),
        avgPsf: psf,
        count
      };

      totalWeightedPrice += price * count;
      totalWeightedPsf += psf * count;
      totalWeightedPsm += psm * count;
      totalCount += count;
    });

    const avgPrice = Math.round(totalWeightedPrice / totalCount);
    const medianPrice = Math.round(avgPrice * 0.98); // typical median is slightly lower than mean
    const avgPsf = Math.round(totalWeightedPsf / totalCount);
    const avgPsm = Math.round(totalWeightedPsm / totalCount);

    return {
      year,
      town: town.id,
      medianPrice,
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
 * Generate quarterly data for backtesting (from 2006 Q1 to 2026 Q4)
 * Returns structured rows representing individual micro-market transaction clusters
 */
export interface QuarterlyDataPoint {
  id: string;
  year: number;
  quarter: number;
  dateStr: string; // e.g. "2024 Q2"
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

export function generateQuarterlyDataset(selectedTownId?: string): QuarterlyDataPoint[] {
  if (getActiveRecords().length > 0) {
    const csvPoints = generateQuarterlyDatasetFromCsv(selectedTownId);
    if (csvPoints.length > 0) {
      return csvPoints;
    }
  }

  const townsToUse = selectedTownId 
    ? HDB_TOWNS.filter(t => t.id === selectedTownId) 
    : HDB_TOWNS;

  const dataset: QuarterlyDataPoint[] = [];

  townsToUse.forEach(town => {
    const townMultiplier = getTownMultiplier(town.id);
    
    for (let year = 2006; year <= 2026; year++) {
      const baseRpi = NATIONAL_RPI[year];
      const prevRpi = NATIONAL_RPI[year - 1] || baseRpi;
      const sora = HISTORICAL_SORA_RATES[year];
      const remainingLease = Math.max(38, 99 - (year - town.avgLeaseCommenceYear));

      for (let q = 1; q <= 4; q++) {
        // Quarter progression within year
        const quarterFraction = (q - 1) / 4;
        const qRpi = prevRpi + (baseRpi - prevRpi) * (0.25 + quarterFraction * 0.75);
        const rpiRatio = qRpi / NATIONAL_RPI[2026];

        const flatTypes: FlatType[] = ['3 ROOM', '4 ROOM', '5 ROOM'];
        const storeys: ('LOW' | 'MID' | 'HIGH')[] = ['LOW', 'MID', 'HIGH'];

        flatTypes.forEach(ft => {
          const config = FLAT_BASELINES[ft];
          
          storeys.forEach(st => {
            const storeyMultiplier = st === 'HIGH' ? 1.07 : st === 'MID' ? 1.0 : 0.94;
            const psf = Math.round(config.basePsf * townMultiplier * rpiRatio * storeyMultiplier);
            const psm = Math.round(psf * SQM_TO_SQFT);
            const price = Math.round(psm * config.areaSqm);

            dataset.push({
              id: `${town.id}-${year}-Q${q}-${ft}-${st}`,
              year,
              quarter: q,
              dateStr: `${year} Q${q}`,
              town: town.id,
              flatType: ft,
              floorAreaSqm: config.areaSqm,
              storeyLevel: st,
              remainingLease,
              distanceToCbd: town.distanceToCbdKm,
              soraRate: sora,
              macroRpi: Math.round(qRpi * 10) / 10,
              resalePrice: price,
              psf
            });
          });
        });
      }
    }
  });

  return dataset;
}
