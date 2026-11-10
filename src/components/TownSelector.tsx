import React, { useState } from 'react';
import { Search, MapPin, Check, Building2 } from 'lucide-react';
import { HDB_TOWNS, resolveTownFromQuery } from '../data/hdbTowns';
import { TownInfo } from '../types/hdb';

interface TownSelectorProps {
  selectedTown: TownInfo;
  onSelectTown: (town: TownInfo) => void;
  label?: string;
}

export const TownSelector: React.FC<TownSelectorProps> = ({
  selectedTown,
  onSelectTown,
  label = "Select Town or Enter Postal Code"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);

    // Auto-resolve if postal code pattern matches
    const resolved = resolveTownFromQuery(val);
    if (resolved && val.trim().length >= 4) {
      onSelectTown(resolved);
    }
  };

  const filteredTowns = HDB_TOWNS.filter(town => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = town.name.toLowerCase().includes(term);
    const sectorMatch = town.postalSectors.some(sec => sec.includes(term));
    const regionMatch = town.region.toLowerCase().includes(term);
    return nameMatch || sectorMatch || regionMatch;
  });

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label}
        </label>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {selectedTown.region} Region · {selectedTown.distanceToCbdKm} km to CBD
        </span>
      </div>

      {/* Main Selector Button */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={isOpen ? searchTerm : `${selectedTown.name} (Sector ${selectedTown.postalSectors.join(', ')})`}
            onFocus={() => { setIsOpen(true); setSearchTerm(''); }}
            onChange={handleSearchChange}
            placeholder="Type town or 6-digit postal code (e.g. 560123, Tampines)..."
            className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 rounded-lg whitespace-nowrap transition-colors"
        >
          {isOpen ? 'Close' : 'Browse Towns'}
        </button>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-40 mt-1.5 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-80 overflow-y-auto p-1.5">
          <div className="px-2 py-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium border-b border-slate-100 dark:border-slate-700/60 mb-1 flex items-center justify-between">
            <span>26 Singapore HDB Estates</span>
            <span>{filteredTowns.length} available</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {filteredTowns.map(town => {
              const isSelected = town.id === selectedTown.id;
              return (
                <button
                  key={town.id}
                  type="button"
                  onClick={() => {
                    onSelectTown(town);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`flex items-start justify-between p-2 rounded-lg text-left transition-colors ${
                    isSelected
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800/60'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <div className="min-w-0 pr-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold truncate">{town.name}</span>
                      {town.isMature && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">Mature</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                      <span>Sectors: {town.postalSectors.join(', ')}</span>
                      <span>·</span>
                      <span>{town.distanceToCbdKm}km CBD</span>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {filteredTowns.length === 0 && (
            <div className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">
              No towns found for "{searchTerm}". Try a postal sector (e.g. "56", "52", "09") or estate name.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
