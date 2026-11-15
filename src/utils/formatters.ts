import { CurrencyCode, AssetClass, RecurrenceFrequency } from '../types/finance';

const LOCALE_BY_CURRENCY: Record<CurrencyCode, string> = {
  BRL: 'pt-BR',
  USD: 'en-US',
  EUR: 'de-DE',
};

export function formatCurrency(value: number, currency: CurrencyCode = 'BRL'): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeValue);
}

export function formatCompactCurrency(value: number, currency: CurrencyCode = 'BRL'): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  if (Math.abs(safeValue) < 1000) {
    return formatCurrency(safeValue, currency);
  }
  return new Intl.NumberFormat(LOCALE_BY_CURRENCY[currency], {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(safeValue);
}

export function formatPercent(value: number, showPlus = false): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(safeValue);
  if (showPlus && safeValue > 0) {
    return `+${formatted}%`;
  }
  return `${formatted}%`;
}

export function formatNumber(value: number, maxDecimals = 4): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxDecimals,
  }).format(safeValue);
}

export function formatDateBR(isoDate: string): string {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return '—';
  const [y, m, d] = isoDate.split('-');
  return `${d}/${m}/${y}`;
}

export function formatMonthLabel(yyyyMm: string): string {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return yyyyMm;
  const [year, month] = yyyyMm.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const formatted = new Intl.DateTimeFormat('pt-BR', {
    month: 'short',
    year: '2-digit',
  }).format(date);
  return formatted.replace('.', '');
}

export function getTodayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getCurrentMonthKey(): string {
  return getTodayISO().slice(0, 7);
}

export const ASSET_CLASS_LABELS: Record<AssetClass, string> = {
  fixed_income: 'Renda Fixa',
  stocks: 'Ações',
  fii: 'FIIs',
  crypto: 'Criptomoedas',
  other: 'Outros Ativos',
};

export const RECURRENCE_LABELS: Record<RecurrenceFrequency, string> = {
  none: 'Única',
  weekly: 'Semanal',
  monthly: 'Mensal',
  yearly: 'Anual',
};
