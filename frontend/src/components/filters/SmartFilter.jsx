// SmartFilter.jsx
// Reusable filter component for fantasy football analytics
// Supports collapsed (inline bar) and expanded (full panel) states

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  Filter,
  ChevronDown,
  ChevronUp,
  X,
  Search,
  RotateCcw,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import { getTeamLogo } from '../../data/nflTeamLogos';

// ============================================================================
// CONFIGURATION & DATA
// Using uppercase IDs to match existing app format
// ============================================================================

const POSITIONS = [
  { id: 'All', label: 'All', shortLabel: 'All' },
  { id: 'QB', label: 'QB', shortLabel: 'QB' },
  { id: 'RB', label: 'RB', shortLabel: 'RB' },
  { id: 'WR', label: 'WR', shortLabel: 'WR' },
  { id: 'TE', label: 'TE', shortLabel: 'TE' },
  { id: 'FLEX', label: 'FLEX', shortLabel: 'FLX' },
  { id: 'DST', label: 'DST', shortLabel: 'DST' },
  { id: 'K', label: 'K', shortLabel: 'K' },
];

const NFL_TEAMS = [
  { id: 'All', label: 'All Teams', abbrev: 'ALL' },
  { id: 'ARI', label: 'Arizona Cardinals', abbrev: 'ARI' },
  { id: 'ATL', label: 'Atlanta Falcons', abbrev: 'ATL' },
  { id: 'BAL', label: 'Baltimore Ravens', abbrev: 'BAL' },
  { id: 'BUF', label: 'Buffalo Bills', abbrev: 'BUF' },
  { id: 'CAR', label: 'Carolina Panthers', abbrev: 'CAR' },
  { id: 'CHI', label: 'Chicago Bears', abbrev: 'CHI' },
  { id: 'CIN', label: 'Cincinnati Bengals', abbrev: 'CIN' },
  { id: 'CLE', label: 'Cleveland Browns', abbrev: 'CLE' },
  { id: 'DAL', label: 'Dallas Cowboys', abbrev: 'DAL' },
  { id: 'DEN', label: 'Denver Broncos', abbrev: 'DEN' },
  { id: 'DET', label: 'Detroit Lions', abbrev: 'DET' },
  { id: 'GB', label: 'Green Bay Packers', abbrev: 'GB' },
  { id: 'HOU', label: 'Houston Texans', abbrev: 'HOU' },
  { id: 'IND', label: 'Indianapolis Colts', abbrev: 'IND' },
  { id: 'JAX', label: 'Jacksonville Jaguars', abbrev: 'JAX' },
  { id: 'KC', label: 'Kansas City Chiefs', abbrev: 'KC' },
  { id: 'LV', label: 'Las Vegas Raiders', abbrev: 'LV' },
  { id: 'LAC', label: 'Los Angeles Chargers', abbrev: 'LAC' },
  { id: 'LAR', label: 'Los Angeles Rams', abbrev: 'LAR' },
  { id: 'MIA', label: 'Miami Dolphins', abbrev: 'MIA' },
  { id: 'MIN', label: 'Minnesota Vikings', abbrev: 'MIN' },
  { id: 'NE', label: 'New England Patriots', abbrev: 'NE' },
  { id: 'NO', label: 'New Orleans Saints', abbrev: 'NO' },
  { id: 'NYG', label: 'New York Giants', abbrev: 'NYG' },
  { id: 'NYJ', label: 'New York Jets', abbrev: 'NYJ' },
  { id: 'PHI', label: 'Philadelphia Eagles', abbrev: 'PHI' },
  { id: 'PIT', label: 'Pittsburgh Steelers', abbrev: 'PIT' },
  { id: 'SF', label: 'San Francisco 49ers', abbrev: 'SF' },
  { id: 'SEA', label: 'Seattle Seahawks', abbrev: 'SEA' },
  { id: 'TB', label: 'Tampa Bay Buccaneers', abbrev: 'TB' },
  { id: 'TEN', label: 'Tennessee Titans', abbrev: 'TEN' },
  { id: 'WAS', label: 'Washington Commanders', abbrev: 'WAS' },
];

const SEASONS = [
  { id: '2025', label: '2025' },
  { id: '2024', label: '2024' },
  { id: '2023', label: '2023' },
];

const SLATES = [
  { id: 'Main', label: 'Main' },
  { id: 'Showdown', label: 'Showdown' },
  { id: 'Early', label: 'Early' },
  { id: 'Afternoon', label: 'Afternoon' },
  { id: 'Primetime', label: 'Primetime' },
  { id: 'TNF', label: 'TNF' },
  { id: 'SNF', label: 'SNF' },
  { id: 'MNF', label: 'MNF' },
];

const MAX_WEEKS = 18;
const MAX_SALARY = 15000;
const MIN_SALARY = 0;
const SALARY_STEP = 100;

// Default filter state
const DEFAULT_FILTERS = {
  positions: ['RB'],
  team: 'All',
  season: '2025',
  slate: 'Main',
  weekRange: [1, 4],
  salaryRange: [0, 15000],
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const formatSalary = (value) => {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}K`;
  }
  return `$${value}`;
};

const formatWeekRange = (range) => {
  if (range[0] === range[1]) {
    return `Wk ${range[0]}`;
  }
  return `Wk ${range[0]}-${range[1]}`;
};

const countActiveFilters = (filters) => {
  let count = 0;
  if (!filters.positions.includes('All') && filters.positions.length > 0) count++;
  if (filters.team !== 'All') count++;
  if (filters.season !== DEFAULT_FILTERS.season) count++;
  if (filters.slate !== DEFAULT_FILTERS.slate) count++;
  if (filters.weekRange[0] !== 1 || filters.weekRange[1] !== MAX_WEEKS) count++;
  if (filters.salaryRange[0] !== MIN_SALARY || filters.salaryRange[1] !== MAX_SALARY) count++;
  return count;
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const RangeSlider = ({
  min,
  max,
  value,
  onChange,
  step = 1,
  formatLabel,
  showLabels = true,
  compact = false,
  className = '',
}) => {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null);

  const getPercentage = (val) => ((val - min) / (max - min)) * 100;

  const handleMouseDown = (handle) => (e) => {
    e.preventDefault();
    setIsDragging(handle);
  };

  const handleMouseMove = useCallback(
    (e) => {
      if (!isDragging || !trackRef.current) return;

      const rect = trackRef.current.getBoundingClientRect();
      const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const rawValue = min + percentage * (max - min);
      const steppedValue = Math.round(rawValue / step) * step;
      const clampedValue = Math.max(min, Math.min(max, steppedValue));

      const newValue = [...value];
      if (isDragging === 'start') {
        newValue[0] = Math.min(clampedValue, value[1] - step);
      } else {
        newValue[1] = Math.max(clampedValue, value[0] + step);
      }
      onChange(newValue);
    },
    [isDragging, min, max, step, value, onChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(null);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const startPercent = getPercentage(value[0]);
  const endPercent = getPercentage(value[1]);

  return (
    <div className={`relative ${compact ? 'py-1' : 'py-2'} ${className}`}>
      {showLabels && !compact && (
        <div className="flex justify-between mb-1 text-xs text-slate-500 dark:text-slate-400">
          <span>{formatLabel ? formatLabel(value[0]) : value[0]}</span>
          <span>{formatLabel ? formatLabel(value[1]) : value[1]}</span>
        </div>
      )}
      <div
        ref={trackRef}
        className={`relative w-full bg-slate-200 dark:bg-slate-700 rounded-full cursor-pointer ${
          compact ? 'h-1.5' : 'h-2'
        }`}
      >
        <div
          className="absolute h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
          style={{
            left: `${startPercent}%`,
            width: `${endPercent - startPercent}%`,
          }}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white dark:bg-slate-100 border-2 border-blue-500 rounded-full shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 ${
            compact ? 'w-3 h-3' : 'w-4 h-4'
          } ${isDragging === 'start' ? 'scale-110 ring-2 ring-blue-300' : ''}`}
          style={{ left: `${startPercent}%` }}
          onMouseDown={handleMouseDown('start')}
        />
        <div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 bg-white dark:bg-slate-100 border-2 border-blue-500 rounded-full shadow-md cursor-grab active:cursor-grabbing transition-transform hover:scale-110 ${
            compact ? 'w-3 h-3' : 'w-4 h-4'
          } ${isDragging === 'end' ? 'scale-110 ring-2 ring-blue-300' : ''}`}
          style={{ left: `${endPercent}%` }}
          onMouseDown={handleMouseDown('end')}
        />
      </div>
      {showLabels && compact && (
        <div className="flex justify-center mt-1">
          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400">
            {formatLabel ? `${formatLabel(value[0])} - ${formatLabel(value[1])}` : `${value[0]} - ${value[1]}`}
          </span>
        </div>
      )}
    </div>
  );
};

const WeekGridSelector = ({ value, onChange, maxWeeks = 18 }) => {
  const [selectionStart, setSelectionStart] = useState(null);
  const [hoverWeek, setHoverWeek] = useState(null);

  const weeks = Array.from({ length: maxWeeks }, (_, i) => i + 1);

  const handleWeekClick = (week) => {
    if (selectionStart === null) {
      setSelectionStart(week);
    } else {
      const start = Math.min(selectionStart, week);
      const end = Math.max(selectionStart, week);
      onChange([start, end]);
      setSelectionStart(null);
    }
  };

  const isInRange = (week) => {
    if (selectionStart !== null && hoverWeek !== null) {
      const start = Math.min(selectionStart, hoverWeek);
      const end = Math.max(selectionStart, hoverWeek);
      return week >= start && week <= end;
    }
    return week >= value[0] && week <= value[1];
  };

  const isRangeStart = (week) => week === value[0];
  const isRangeEnd = (week) => week === value[1];

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>Select week range</span>
        <span className="font-medium text-blue-600 dark:text-blue-400">
          {formatWeekRange(value)}
        </span>
      </div>
      <div className="grid grid-cols-6 gap-1">
        {weeks.map((week) => {
          const inRange = isInRange(week);
          const isStart = isRangeStart(week);
          const isEnd = isRangeEnd(week);
          const isSelecting = selectionStart !== null;

          return (
            <button
              key={week}
              type="button"
              onClick={() => handleWeekClick(week)}
              onMouseEnter={() => setHoverWeek(week)}
              onMouseLeave={() => setHoverWeek(null)}
              className={`
                relative py-1.5 text-xs font-medium rounded transition-all
                ${
                  inRange
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }
                ${isStart ? 'rounded-l-md' : ''}
                ${isEnd ? 'rounded-r-md' : ''}
                ${isSelecting ? 'cursor-crosshair' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
              `}
            >
              {week}
            </button>
          );
        })}
      </div>
      {selectionStart !== null && (
        <p className="text-[10px] text-center text-slate-400 dark:text-slate-500">
          Click another week to complete range
        </p>
      )}
    </div>
  );
};

const PositionToggleGroup = ({ value, onChange, positions = POSITIONS }) => {
  const handleToggle = (positionId) => {
    if (positionId === 'All') {
      onChange(['All']);
      return;
    }

    let newValue = value.filter((p) => p !== 'All');

    if (newValue.includes(positionId)) {
      newValue = newValue.filter((p) => p !== positionId);
      if (newValue.length === 0) {
        newValue = ['All'];
      }
    } else {
      newValue = [...newValue, positionId];
    }

    onChange(newValue);
  };

  const isSelected = (positionId) => {
    if (positionId === 'All') {
      return value.includes('All') || value.length === 0;
    }
    return value.includes(positionId);
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {positions.map((position) => (
        <button
          key={position.id}
          type="button"
          onClick={() => handleToggle(position.id)}
          className={`
            px-3 py-1.5 text-xs font-semibold rounded-md transition-all
            focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1
            ${
              isSelected(position.id)
                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }
          `}
        >
          <span className="flex items-center gap-1">
            {isSelected(position.id) && position.id !== 'All' && (
              <Check className="w-3 h-3" />
            )}
            {position.label}
          </span>
        </button>
      ))}
    </div>
  );
};

const SearchableDropdown = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  searchable = true,
  showLogos = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef(null);

  const selectedOption = options.find((opt) => opt.id === value);

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const searchLower = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(searchLower) ||
        opt.abbrev?.toLowerCase().includes(searchLower)
    );
  }, [options, search]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
      >
        <span className="flex items-center gap-2 truncate">
          {showLogos && selectedOption && selectedOption.id !== 'All' && getTeamLogo(selectedOption.id) && (
            <img src={getTeamLogo(selectedOption.id)} alt={selectedOption.id} className="w-4 h-4 object-contain" />
          )}
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg overflow-hidden">
          {searchable && (
            <div className="p-2 border-b border-slate-200 dark:border-slate-700">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-300 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
          )}
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id);
                  setIsOpen(false);
                  setSearch('');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                  value === option.id
                    ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                    : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  {showLogos && option.id !== 'All' && getTeamLogo(option.id) && (
                    <img src={getTeamLogo(option.id)} alt={option.id} className="w-4 h-4 object-contain" />
                  )}
                  {option.label}
                </span>
                {option.abbrev && option.id !== 'All' && (
                  <span className="text-xs text-slate-400">{option.abbrev}</span>
                )}
              </button>
            ))}
            {filteredOptions.length === 0 && (
              <div className="px-3 py-4 text-sm text-center text-slate-400">
                No results found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const FilterTag = ({ label, onRemove }) => (
  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-medium rounded-full">
    {label}
    <button
      type="button"
      onClick={onRemove}
      className="p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full transition-colors"
    >
      <X className="w-3 h-3" />
    </button>
  </span>
);

const CompactSelect = ({ options, value, onChange, className = '' }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`appearance-none bg-transparent text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-none ${className}`}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.abbrev || option.label}
        </option>
      ))}
    </select>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const SmartFilter = ({
  initialFilters = DEFAULT_FILTERS,
  onFilterChange,
  defaultExpanded = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS, ...initialFilters });
  const [pendingFilters, setPendingFilters] = useState(filters);

  // Sync filters when initialFilters prop changes
  useEffect(() => {
    setFilters({ ...DEFAULT_FILTERS, ...initialFilters });
    setPendingFilters({ ...DEFAULT_FILTERS, ...initialFilters });
  }, [initialFilters]);

  // Sync pending filters when expanded
  useEffect(() => {
    if (isExpanded) {
      setPendingFilters(filters);
    }
  }, [isExpanded, filters]);

  // Handle filter updates from collapsed bar (immediate)
  const updateFilter = useCallback(
    (key, value) => {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      onFilterChange?.(newFilters);
    },
    [filters, onFilterChange]
  );

  // Handle pending filter updates (for expanded panel)
  const updatePendingFilter = useCallback((key, value) => {
    setPendingFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Apply pending filters
  const applyFilters = useCallback(() => {
    setFilters(pendingFilters);
    onFilterChange?.(pendingFilters);
    setIsExpanded(false);
  }, [pendingFilters, onFilterChange]);

  // Reset to defaults
  const resetFilters = useCallback(() => {
    setPendingFilters(DEFAULT_FILTERS);
  }, []);

  // Get active filter count
  const activeFilterCount = useMemo(() => countActiveFilters(filters), [filters]);

  // Build active filter tags for expanded view
  const activeFilterTags = useMemo(() => {
    const tags = [];

    if (!pendingFilters.positions.includes('All') && pendingFilters.positions.length > 0) {
      pendingFilters.positions.forEach((pos) => {
        tags.push({
          id: `pos-${pos}`,
          label: pos,
          onRemove: () => {
            const newPositions = pendingFilters.positions.filter((p) => p !== pos);
            updatePendingFilter('positions', newPositions.length ? newPositions : ['All']);
          },
        });
      });
    }

    if (pendingFilters.team !== 'All') {
      const team = NFL_TEAMS.find((t) => t.id === pendingFilters.team);
      tags.push({
        id: 'team',
        label: team?.abbrev || pendingFilters.team,
        onRemove: () => updatePendingFilter('team', 'All'),
      });
    }

    if (pendingFilters.weekRange[0] !== 1 || pendingFilters.weekRange[1] !== MAX_WEEKS) {
      tags.push({
        id: 'weeks',
        label: formatWeekRange(pendingFilters.weekRange),
        onRemove: () => updatePendingFilter('weekRange', [1, MAX_WEEKS]),
      });
    }

    if (pendingFilters.salaryRange[0] !== MIN_SALARY || pendingFilters.salaryRange[1] !== MAX_SALARY) {
      tags.push({
        id: 'salary',
        label: `${formatSalary(pendingFilters.salaryRange[0])}-${formatSalary(pendingFilters.salaryRange[1])}`,
        onRemove: () => updatePendingFilter('salaryRange', [MIN_SALARY, MAX_SALARY]),
      });
    }

    return tags;
  }, [pendingFilters, updatePendingFilter]);

  return (
    <div className={`w-full ${className}`}>
      {/* COLLAPSED STATE - Horizontal Filter Bar */}
      {!isExpanded && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
          <div className="flex items-center divide-x divide-slate-200 dark:divide-slate-700">
            {/* Zone 1: Position Quick Select */}
            <div className="flex items-center gap-1 px-3 py-2.5">
              {POSITIONS.slice(0, 7).map((position) => (
                <button
                  key={position.id}
                  type="button"
                  onClick={() => {
                    if (position.id === 'All') {
                      updateFilter('positions', ['All']);
                    } else {
                      const isSelected = filters.positions.includes(position.id);
                      let newPositions;
                      if (isSelected) {
                        newPositions = filters.positions.filter((p) => p !== position.id);
                        if (newPositions.length === 0) newPositions = ['All'];
                      } else {
                        newPositions = filters.positions.filter((p) => p !== 'All');
                        newPositions = [...newPositions, position.id];
                      }
                      updateFilter('positions', newPositions);
                    }
                  }}
                  className={`px-2 py-1 text-xs font-semibold rounded-md transition-all ${
                    filters.positions.includes(position.id) ||
                    (position.id === 'All' && filters.positions.includes('All'))
                      ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {position.shortLabel}
                </button>
              ))}
            </div>

            {/* Zone 2: Team */}
            <div className="flex items-center px-3 py-2.5">
              <CompactSelect
                options={NFL_TEAMS}
                value={filters.team}
                onChange={(val) => updateFilter('team', val)}
              />
              <ChevronDown className="w-3 h-3 text-slate-400 ml-1" />
            </div>

            {/* Zone 3: Season & Slate */}
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {filters.season}
              </span>
              <span className="text-slate-300 dark:text-slate-600">·</span>
              <CompactSelect
                options={SLATES}
                value={filters.slate}
                onChange={(val) => updateFilter('slate', val)}
              />
            </div>

            {/* Zone 4: Mini Week Slider */}
            <div className="flex-1 px-4 py-2.5 min-w-[140px]">
              <RangeSlider
                min={1}
                max={MAX_WEEKS}
                value={filters.weekRange}
                onChange={(val) => updateFilter('weekRange', val)}
                formatLabel={(v) => `Wk ${v}`}
                showLabels={true}
                compact={true}
              />
            </div>

            {/* Zone 5: Salary */}
            <div className="flex items-center px-3 py-2.5">
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {formatSalary(filters.salaryRange[0])} - {formatSalary(filters.salaryRange[1])}
              </span>
            </div>

            {/* Zone 6: Expand Button with Filter Count */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors rounded-r-xl"
            >
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full">
                  {activeFilterCount}
                </span>
              )}
              <SlidersHorizontal className="w-4 h-4" />
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* EXPANDED STATE - Full Filter Panel */}
      {isExpanded && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden">
          {/* Header with Active Filter Tags */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Active Filters
                </h3>
                {activeFilterTags.length > 0 && (
                  <span className="text-xs text-slate-400">
                    ({activeFilterTags.length} active)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsExpanded(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
              >
                <ChevronUp className="w-5 h-5" />
              </button>
            </div>

            {/* Active Filter Tags */}
            {activeFilterTags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {activeFilterTags.map((tag) => (
                  <FilterTag key={tag.id} label={tag.label} onRemove={tag.onRemove} />
                ))}
              </div>
            )}
          </div>

          {/* Filter Controls Grid */}
          <div className="p-4 space-y-5">
            {/* Row 1: Positions */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Positions
              </label>
              <PositionToggleGroup
                value={pendingFilters.positions}
                onChange={(val) => updatePendingFilter('positions', val)}
              />
            </div>

            {/* Row 2: Team, Season, Slate */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Team
                </label>
                <SearchableDropdown
                  options={NFL_TEAMS}
                  value={pendingFilters.team}
                  onChange={(val) => updatePendingFilter('team', val)}
                  placeholder="All Teams"
                  showLogos={true}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Season
                </label>
                <SearchableDropdown
                  options={SEASONS}
                  value={pendingFilters.season}
                  onChange={(val) => updatePendingFilter('season', val)}
                  searchable={false}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Slate
                </label>
                <SearchableDropdown
                  options={SLATES}
                  value={pendingFilters.slate}
                  onChange={(val) => updatePendingFilter('slate', val)}
                  searchable={false}
                />
              </div>
            </div>

            {/* Row 3: Week Range (Calendar Grid) */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Week Range
              </label>
              <WeekGridSelector
                value={pendingFilters.weekRange}
                onChange={(val) => updatePendingFilter('weekRange', val)}
                maxWeeks={MAX_WEEKS}
              />
            </div>

            {/* Row 4: Salary Range */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Salary
              </label>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <RangeSlider
                    min={MIN_SALARY}
                    max={MAX_SALARY}
                    step={SALARY_STEP}
                    value={pendingFilters.salaryRange}
                    onChange={(val) => updatePendingFilter('salaryRange', val)}
                    formatLabel={formatSalary}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={pendingFilters.salaryRange[0]}
                    onChange={(e) => {
                      const val = Math.max(MIN_SALARY, Math.min(Number(e.target.value), pendingFilters.salaryRange[1] - SALARY_STEP));
                      updatePendingFilter('salaryRange', [val, pendingFilters.salaryRange[1]]);
                    }}
                    className="w-20 px-2 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-center text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={MIN_SALARY}
                    max={MAX_SALARY}
                    step={SALARY_STEP}
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="number"
                    value={pendingFilters.salaryRange[1]}
                    onChange={(e) => {
                      const val = Math.min(MAX_SALARY, Math.max(Number(e.target.value), pendingFilters.salaryRange[0] + SALARY_STEP));
                      updatePendingFilter('salaryRange', [pendingFilters.salaryRange[0], val]);
                    }}
                    className="w-20 px-2 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-center text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min={MIN_SALARY}
                    max={MAX_SALARY}
                    step={SALARY_STEP}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer with Actions */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={resetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-md transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartFilter;
