import React, { memo, useMemo } from 'react';

/**
 * TrendBarChart - Compact SVG bar chart with magnified relative scaling
 * Bars are scaled relative to min/max within the dataset to show oscillations clearly
 * Week-to-week color coding: green for increase, red for decrease from previous week
 *
 * @param {number[]} values - Array of values (e.g., FPTS per week)
 * @param {number} width - Chart width (default 70)
 * @param {number} height - Chart height (default 28)
 */
const TrendBarChart = memo(({ values = [], width = 70, height = 28 }) => {
  const analysis = useMemo(() => {
    if (!values || values.length < 2) {
      return null;
    }

    // Filter out null/undefined values for calculations
    const validValues = values.filter(v => v != null && !isNaN(v));
    if (validValues.length < 2) {
      return null;
    }

    const min = Math.min(...validValues);
    const max = Math.max(...validValues);
    const range = max - min || 1;

    // Determine week-to-week changes for coloring
    const weekChanges = values.map((v, i) => {
      if (v == null || isNaN(v)) return 'null';
      if (i === 0) return 'neutral';

      // Find previous valid value
      let prevVal = null;
      for (let j = i - 1; j >= 0; j--) {
        if (values[j] != null && !isNaN(values[j])) {
          prevVal = values[j];
          break;
        }
      }

      if (prevVal === null) return 'neutral';
      if (v > prevVal) return 'positive';
      if (v < prevVal) return 'negative';
      return 'neutral';
    });

    return {
      min,
      max,
      range,
      weekChanges,
      validValues,
    };
  }, [values]);

  if (!analysis) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const { min, range, weekChanges } = analysis;

  // Compact layout calculations
  const barWidth = 14;
  const barGap = 2;
  const paddingTop = 10;    // Room for value labels
  const paddingBottom = 2;
  const paddingX = 1;
  const chartHeight = height - paddingTop - paddingBottom;
  const minBarHeight = 4;

  // Calculate total width needed
  const validBarCount = values.filter(v => v != null && !isNaN(v)).length;
  const totalBarsWidth = validBarCount * barWidth + (validBarCount - 1) * barGap;
  const startX = Math.max(paddingX, (width - totalBarsWidth) / 2);

  // Get bar height - scaled relative to min/max for magnified oscillations
  const getBarHeight = (val) => {
    if (val == null || isNaN(val)) return 0;
    const normalized = (val - min) / range;
    return Math.max(minBarHeight, normalized * chartHeight);
  };

  // Get bar color based on week-to-week change
  const getBarColor = (weekChange) => {
    if (weekChange === 'positive') return '#14b8a6'; // Teal for increase
    if (weekChange === 'negative') return '#f87171'; // Red for decrease
    return '#14b8a6'; // Default teal for neutral/first
  };

  // Format value compactly
  const formatValue = (val) => {
    if (val == null || isNaN(val)) return '';
    return Math.round(val).toString();
  };

  let barIndex = 0;

  return (
    <svg
      width={width}
      height={height}
      className="trend-bar-chart"
      style={{ display: 'block' }}
    >
      {values.map((val, i) => {
        if (val == null || isNaN(val)) return null;

        const currentBarIndex = barIndex;
        barIndex++;

        const barH = getBarHeight(val);
        const x = startX + currentBarIndex * (barWidth + barGap);
        const y = height - barH - paddingBottom;
        const barColor = getBarColor(weekChanges[i]);
        const valueText = formatValue(val);

        return (
          <g key={i}>
            {/* Bar with slight rounded corners */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={2}
              ry={2}
              fill={barColor}
            />

            {/* Value label above bar */}
            <text
              x={x + barWidth / 2}
              y={y - 2}
              textAnchor="middle"
              fill="#374151"
              fontSize={8}
              fontWeight={600}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {valueText}
            </text>
          </g>
        );
      })}
    </svg>
  );
});

TrendBarChart.displayName = 'TrendBarChart';

export default TrendBarChart;
