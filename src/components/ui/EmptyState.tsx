import React from 'react';
import { useFinance } from '../../context/FinanceContext';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}: EmptyStateProps) {
  const { palette } = useFinance();

  return (
    <div
      className="flex flex-col items-center justify-center text-center py-10 px-6 border border-dashed"
      style={{
        borderColor: palette.borderColor,
        borderRadius: palette.radiusPx,
        backgroundColor: palette.surfaceMutedColor,
      }}
    >
      {icon && (
        <div className="mb-3" style={{ color: palette.textSecondary }}>
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold font-display" style={{ color: palette.textPrimary }}>
        {title}
      </h3>
      <p className="text-xs mt-1.5 max-w-md leading-relaxed" style={{ color: palette.textSecondary }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 fos-btn-primary px-4 py-2 text-xs font-semibold whitespace-nowrap shrink-0 min-h-[40px]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
