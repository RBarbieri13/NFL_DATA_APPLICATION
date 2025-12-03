import React, { memo, useMemo } from 'react';
import TrendBarChart from './TrendBarChart';
import DeltaBadge from './DeltaBadge';

/**
 * Extracts the stat value from week data based on stat key
 */
const getStatValue = (weekData, statKey) => {
  if (!weekData) return null;

  switch (statKey) {
    case 'fpts':
      return weekData.misc?.fpts ?? null;
    case 'rushYds':
      return weekData.rushing?.yds ?? null;
    case 'rushTd':
      return weekData.rushing?.td ?? null;
    case 'rushAtt':
      return weekData.rushing?.att ?? null;
    case 'targets':
    case 'tgts':
      return weekData.receiving?.tgts ?? null;
    case 'rec':
      return weekData.receiving?.rec ?? null;
    case 'recYds':
      return weekData.receiving?.yds ?? null;
    case 'recTd':
      return weekData.receiving?.td ?? null;
    case 'snapPct':
    case 'num':
      return weekData.misc?.num ?? null;
    case 'touches':
      // Touches = rush attempts + receptions
      const rushAtt = weekData.rushing?.att ?? 0;
      const rec = weekData.receiving?.rec ?? 0;
      return rushAtt + rec || null;
    case 'passYds':
      return weekData.passing?.yds ?? null;
    case 'passTd':
      return weekData.passing?.td ?? null;
    default:
      return null;
  }
};

/**
 * TrendBarCell - Renders a mini trend chart with delta badge
 *
 * @param {Object} player - Player data with weeks array
 * @param {string} selectedStat - The stat to display
 * @param {number} selectedWeeks - Number of weeks to show
 * @param {number[]} weeksToShow - Array of week numbers being displayed
 */
const TrendBarCell = memo(({ player, selectedStat = 'fpts', selectedWeeks = 4, weeksToShow = [] }) => {
  // Extract values for the selected stat over the last N weeks
  const { values, delta } = useMemo(() => {
    if (!player?.weeks || player.weeks.length === 0) {
      return { values: [], delta: null };
    }

    // Get the last N weeks from the displayed weeks
    const relevantWeeks = weeksToShow.slice(-selectedWeeks);

    // Extract values for each week
    const extractedValues = relevantWeeks.map(weekNum => {
      const weekData = player.weeks.find(w => w.weekNum === weekNum);
      return getStatValue(weekData, selectedStat);
    });

    // Filter valid values for delta calculation
    const validValues = extractedValues.filter(v => v != null && !isNaN(v));

    // Calculate delta (most recent - oldest)
    let calculatedDelta = null;
    if (validValues.length >= 2) {
      calculatedDelta = validValues[validValues.length - 1] - validValues[0];
    }

    return { values: extractedValues, delta: calculatedDelta };
  }, [player, selectedStat, selectedWeeks, weeksToShow]);

  if (values.length < 2 || values.every(v => v == null)) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-gray-400 text-xs">-</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-end gap-1"
      style={{
        padding: '2px 4px',
        height: '100%',
      }}
    >
      <TrendBarChart values={values} width={70} height={28} />
      <DeltaBadge value={delta} />
    </div>
  );
});

TrendBarCell.displayName = 'TrendBarCell';

export default TrendBarCell;
