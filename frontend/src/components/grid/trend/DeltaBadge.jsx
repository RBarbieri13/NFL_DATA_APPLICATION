import React, { memo } from 'react';

/**
 * DeltaBadge - Displays a delta value with color coding
 *
 * @param {number} value - The delta value (positive or negative)
 */
const DeltaBadge = memo(({ value }) => {
  if (value == null || isNaN(value)) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const isPositive = value > 0.3;
  const isNegative = value < -0.3;

  const bgColor = isPositive
    ? 'rgba(34, 197, 94, 0.15)'
    : isNegative
      ? 'rgba(239, 68, 68, 0.15)'
      : 'rgba(107, 114, 128, 0.15)';

  const textColor = isPositive ? '#22c55e' : isNegative ? '#ef4444' : '#9ca3af';
  const prefix = value > 0 ? '+' : '';

  return (
    <span
      style={{
        background: bgColor,
        color: textColor,
        padding: '2px 6px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 600,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
      }}
    >
      {prefix}{value.toFixed(1)}
    </span>
  );
});

DeltaBadge.displayName = 'DeltaBadge';

export default DeltaBadge;
