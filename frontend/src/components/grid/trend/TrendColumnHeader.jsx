import React, { memo } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Stat options for the trend chart
 */
export const STAT_OPTIONS = [
  { value: 'fpts', label: 'FPTS' },
  { value: 'rushYds', label: 'Rush Yds' },
  { value: 'rushTd', label: 'Rush TD' },
  { value: 'targets', label: 'Targets' },
  { value: 'rec', label: 'Rec' },
  { value: 'recYds', label: 'Rec Yds' },
  { value: 'recTd', label: 'Rec TD' },
  { value: 'snapPct', label: 'Snap %' },
  { value: 'touches', label: 'Touches' },
];

/**
 * Week range options
 */
export const WEEK_OPTIONS = [2, 3, 4, 6, 8];

/**
 * Pill-style dropdown component
 */
const PillDropdown = memo(({ value, options, onChange, renderOption }) => {
  return (
    <div className="relative inline-block">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="trend-dropdown appearance-none cursor-pointer pr-6"
        style={{
          background: 'rgba(42, 48, 69, 0.7)',
          border: '1px solid #3a4055',
          borderRadius: '16px',
          padding: '3px 20px 3px 8px',
          color: '#ffffff',
          fontSize: '10px',
          fontWeight: 500,
          outline: 'none',
          transition: 'all 0.15s ease',
        }}
      >
        {options.map((opt) => (
          <option
            key={typeof opt === 'object' ? opt.value : opt}
            value={typeof opt === 'object' ? opt.value : opt}
            style={{ background: '#1a1f36', color: '#ffffff' }}
          >
            {renderOption ? renderOption(opt) : (typeof opt === 'object' ? opt.label : opt)}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ width: '10px', height: '10px', color: '#9ca3af' }}
      />
    </div>
  );
});

PillDropdown.displayName = 'PillDropdown';

/**
 * TrendColumnHeader - Custom header with stat and week dropdowns
 *
 * @param {string} selectedStat - Currently selected stat
 * @param {number} selectedWeeks - Number of weeks to display
 * @param {function} onStatChange - Callback when stat changes
 * @param {function} onWeeksChange - Callback when weeks changes
 */
const TrendColumnHeader = memo(({
  selectedStat = 'fpts',
  selectedWeeks = 4,
  onStatChange,
  onWeeksChange,
}) => {
  const selectedStatOption = STAT_OPTIONS.find(s => s.value === selectedStat);

  return (
    <div
      className="trend-column-header flex items-center justify-center gap-1.5"
      style={{ padding: '2px 4px' }}
    >
      <PillDropdown
        value={selectedStat}
        options={STAT_OPTIONS}
        onChange={onStatChange}
        renderOption={(opt) => opt.label}
      />
      <PillDropdown
        value={selectedWeeks}
        options={WEEK_OPTIONS}
        onChange={(val) => onWeeksChange(parseInt(val))}
        renderOption={(opt) => `${opt}W`}
      />
    </div>
  );
});

TrendColumnHeader.displayName = 'TrendColumnHeader';

export default TrendColumnHeader;
