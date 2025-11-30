import React, { memo } from 'react';

/**
 * TrendBarChart - SVG mini bar chart for displaying trends over weeks
 *
 * @param {number[]} values - Array of values (e.g., FPTS per week)
 * @param {number} width - Chart width (default 56)
 * @param {number} height - Chart height (default 28)
 */
const TrendBarChart = memo(({ values = [], width = 56, height = 28 }) => {
  if (!values || values.length < 2) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const barWidth = 10;
  const barGap = 4;
  const paddingTop = 8;     // Room for labels
  const paddingBottom = 4;
  const chartHeight = height - paddingTop - paddingBottom;

  // Filter out null/undefined values for calculations
  const validValues = values.filter(v => v != null && !isNaN(v));
  if (validValues.length < 2) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const minVal = Math.min(...validValues);
  const maxVal = Math.max(...validValues);
  const lowIdx = values.indexOf(minVal);

  // Calculate bar height with minimum visibility
  const scaleHeight = (val) => {
    if (val == null || isNaN(val)) return 0;
    const range = maxVal - minVal || 1;
    const normalized = (val - minVal) / range;
    return Math.max(4, normalized * chartHeight); // min 4px height
  };

  // Format value for display - shorter format for small numbers
  const formatValue = (val) => {
    if (val == null || isNaN(val)) return '';
    if (val >= 100) return Math.round(val).toString();
    if (val >= 10) return val.toFixed(1);
    return val.toFixed(1);
  };

  // Get bar color based on comparison to previous week
  const getBarColor = (val, index) => {
    if (index === 0) return '#3b82f6'; // First bar is neutral blue

    // Find previous valid value
    let prevVal = null;
    for (let j = index - 1; j >= 0; j--) {
      if (values[j] != null && !isNaN(values[j])) {
        prevVal = values[j];
        break;
      }
    }

    if (prevVal === null) return '#3b82f6'; // No previous value, use neutral
    if (val > prevVal) return '#22c55e'; // Green - increased
    if (val < prevVal) return '#ef4444'; // Red - decreased
    return '#3b82f6'; // Blue - same value
  };

  // Get label color matching bar color
  const getLabelColor = (val, index) => {
    const barColor = getBarColor(val, index);
    if (barColor === '#22c55e') return '#22c55e'; // Green
    if (barColor === '#ef4444') return '#ef4444'; // Red
    return '#9ca3af'; // Gray for neutral
  };

  // Calculate total width needed
  const totalWidth = values.length * barWidth + (values.length - 1) * barGap;
  const startX = (width - totalWidth) / 2; // Center the bars

  return (
    <svg
      width={width}
      height={height}
      className="trend-bar-chart"
      style={{ display: 'block' }}
    >
      {values.map((val, i) => {
        if (val == null || isNaN(val)) return null;

        const barH = scaleHeight(val);
        const x = startX + i * (barWidth + barGap);
        const y = height - barH - paddingBottom;
        const isLow = i === lowIdx && minVal !== maxVal;
        const barColor = getBarColor(val, i);
        const labelColor = getLabelColor(val, i);

        return (
          <g key={i}>
            {/* Bar */}
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barH}
              rx={2}
              ry={2}
              fill={barColor}
            />

            {/* Underline for lowest week */}
            {isLow && (
              <rect
                x={x}
                y={height - paddingBottom + 1}
                width={barWidth}
                height={2}
                rx={1}
                fill="#ef4444"
              />
            )}

            {/* Value label above each bar */}
            <text
              x={x + barWidth / 2}
              y={y - 1}
              textAnchor="middle"
              fill={labelColor}
              fontSize={6}
              fontWeight={barColor !== '#3b82f6' ? 600 : 400}
              fontFamily="Inter, system-ui, sans-serif"
            >
              {formatValue(val)}
            </text>
          </g>
        );
      })}
    </svg>
  );
});

TrendBarChart.displayName = 'TrendBarChart';

export default TrendBarChart;
