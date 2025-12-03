import React, { memo } from 'react';

/**
 * DeltaBadge - Displays a delta value with simple colored text
 * Matches the reference design with just colored text (teal for +, red for -)
 *
 * @param {number} value - The delta value (positive or negative)
 */
const DeltaBadge = memo(({ value }) => {
  if (value == null || isNaN(value)) {
    return <span className="text-gray-400 text-xs">-</span>;
  }

  const isPositive = value > 0;
  const isNegative = value < 0;

  // Color scheme: teal for positive, red for negative, gray for zero
  const textColor = isPositive ? '#14b8a6' : isNegative ? '#ef4444' : '#6b7280';

  const prefix = value > 0 ? '+' : '';
  // Use rounded value for cleaner display
  const displayValue = Math.round(value);

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: textColor,
        fontSize: '11px',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        whiteSpace: 'nowrap',
        minWidth: '24px',
        lineHeight: 1,
      }}
    >
      {prefix}{displayValue}
    </span>
  );
});

DeltaBadge.displayName = 'DeltaBadge';

export default DeltaBadge;
