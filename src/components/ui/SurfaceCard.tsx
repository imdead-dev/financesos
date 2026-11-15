import React from 'react';
import { useFinance } from '../../context/FinanceContext';
import { getCardClasses } from '../../utils/themes';

interface SurfaceCardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'default' | 'none' | 'compact';
}

export function SurfaceCard({
  children,
  className = '',
  padding = 'default',
}: SurfaceCardProps) {
  const { preferences, palette } = useFinance();
  const cardCls = getCardClasses(preferences.cardStyle);

  const padStyle =
    padding === 'none'
      ? undefined
      : padding === 'compact'
        ? { padding: '12px' }
        : { padding: 'var(--fos-pad)' };

  return (
    <section
      className={`fos-surface transition-colors duration-150 ${cardCls} ${className}`}
      style={{
        backgroundColor: palette.surfaceColor,
        borderColor: palette.borderColor,
        borderRadius: palette.radiusPx,
        ...padStyle,
      }}
    >
      {children}
    </section>
  );
}
