import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-lg',
}: ModalProps) {
  const { palette } = useFinance();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fos-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidthClass} border shadow-2xl max-h-[90vh] flex flex-col overflow-hidden`}
        style={{
          backgroundColor: palette.mode === 'dark' ? '#101217' : '#FFFFFF',
          borderColor: palette.borderColor,
          borderRadius: palette.radiusPx,
          color: palette.textPrimary,
        }}
      >
        <div
          className="flex items-start justify-between gap-4 px-5 py-4 border-b"
          style={{ borderColor: palette.borderColor }}
        >
          <div>
            <h2 id="fos-modal-title" className="text-base font-semibold font-display">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs mt-0.5" style={{ color: palette.textSecondary }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar janela"
            className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center border transition-colors"
            style={{
              borderColor: palette.borderColor,
              borderRadius: palette.radiusSmPx,
              color: palette.textSecondary,
            }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
