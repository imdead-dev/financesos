import React, { useId, useState } from 'react';
import { useFinance } from '../../context/FinanceContext';
import { formatCompactCurrency, formatCurrency, formatPercent } from '../../utils/formatters';

export interface AreaSeriesPoint {
  label: string;
  value: number;
  secondaryValue?: number;
}

interface AreaTrendChartProps {
  data: AreaSeriesPoint[];
  height?: number;
  primaryLabel?: string;
  secondaryLabel?: string;
  colorIndex?: number;
  emptyText?: string;
}

function buildLinePath(
  points: Array<{ x: number; y: number }>,
  style: 'stepped' | 'sharp' | 'smooth'
): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  if (style === 'stepped') {
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` H ${points[i].x} V ${points[i].y}`;
    }
    return d;
  }

  if (style === 'sharp') {
    return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  }

  // Smooth cubic bezier
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx} ${p0.y}, ${cx} ${p1.y}, ${p1.x} ${p1.y}`;
  }
  return d;
}

export function AreaTrendChart({
  data,
  height = 240,
  primaryLabel = 'Valor',
  secondaryLabel = 'Base',
  colorIndex = 0,
  emptyText = 'Sem dados suficientes para exibir o gráfico.',
}: AreaTrendChartProps) {
  const { palette, preferences } = useFinance();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradId = useId();

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs"
        style={{ height, color: palette.textSecondary }}
      >
        {emptyText}
      </div>
    );
  }

  const width = 680;
  const padLeft = 64;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const allValues = data.flatMap((d) =>
    d.secondaryValue !== undefined ? [d.value, d.secondaryValue] : [d.value]
  );
  const rawMin = Math.min(...allValues);
  const rawMax = Math.max(...allValues, 1);
  const effectiveRawMin = rawMin >= 0 ? 0 : rawMin;
  const span = Math.max(1, rawMax - effectiveRawMin);
  const minVal = effectiveRawMin === 0 ? 0 : effectiveRawMin - span * 0.08;
  const maxVal = rawMax + span * 0.1;
  const valSpan = Math.max(1, maxVal - minVal);

  const getX = (idx: number) =>
    data.length === 1 ? padLeft + innerW / 2 : padLeft + (idx / (data.length - 1)) * innerW;
  const getY = (val: number) => padTop + innerH - ((val - minVal) / valSpan) * innerH;

  const primaryPoints = data.map((d, i) => ({ x: getX(i), y: getY(d.value) }));
  const secondaryPoints =
    data[0].secondaryValue !== undefined
      ? data.map((d, i) => ({ x: getX(i), y: getY(d.secondaryValue ?? 0) }))
      : [];

  const lineStyle = palette.preset.chartLineStyle;
  const linePath =
    primaryPoints.length === 1
      ? `M ${padLeft} ${primaryPoints[0].y} L ${width - padRight} ${primaryPoints[0].y}`
      : buildLinePath(primaryPoints, lineStyle);
  const areaPath =
    primaryPoints.length === 1
      ? `M ${padLeft} ${primaryPoints[0].y} L ${width - padRight} ${primaryPoints[0].y} L ${width - padRight} ${padTop + innerH} L ${padLeft} ${padTop + innerH} Z`
      : primaryPoints.length > 0
        ? `${linePath} L ${primaryPoints[primaryPoints.length - 1].x} ${padTop + innerH} L ${primaryPoints[0].x} ${padTop + innerH} Z`
        : '';
  const secondaryPath =
    secondaryPoints.length > 0 ? buildLinePath(secondaryPoints, lineStyle) : '';

  const primaryColor = palette.chartColors[colorIndex % palette.chartColors.length] || palette.accentColor;
  const secondaryColor =
    palette.chartColors[(colorIndex + 1) % palette.chartColors.length] || palette.textSecondary;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minVal + valSpan * t);
  const activePoint = hoverIdx !== null ? data[hoverIdx] : data[data.length - 1];
  const activeIdx = hoverIdx !== null ? hoverIdx : data.length - 1;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
        <div className="flex items-center gap-4">
          <span className="font-medium" style={{ color: palette.textSecondary }}>
            {activePoint.label}
          </span>
          <span className="font-num font-semibold" style={{ color: primaryColor }}>
            {primaryLabel}: {formatCurrency(activePoint.value, preferences.currency)}
          </span>
          {activePoint.secondaryValue !== undefined && (
            <span className="font-num font-medium" style={{ color: secondaryColor }}>
              {secondaryLabel}: {formatCurrency(activePoint.secondaryValue, preferences.currency)}
            </span>
          )}
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible select-none"
        style={{ height: `${height}px` }}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label={primaryLabel}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.28" />
            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {yTicks.map((tick, i) => {
          const y = getY(tick);
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke={palette.borderColor}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                className="font-num"
                fill={palette.textSecondary}
              >
                {formatCompactCurrency(tick, preferences.currency)}
              </text>
            </g>
          );
        })}

        {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        {secondaryPath && (
          <path
            d={secondaryPath}
            fill="none"
            stroke={secondaryColor}
            strokeWidth="1.75"
            strokeDasharray="5 4"
          />
        )}
        {linePath && (
          <path
            d={linePath}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2.25"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* Active crosshair */}
        {primaryPoints[activeIdx] && (
          <g>
            <line
              x1={primaryPoints[activeIdx].x}
              y1={padTop}
              x2={primaryPoints[activeIdx].x}
              y2={padTop + innerH}
              stroke={palette.borderColor}
              strokeWidth="1"
            />
            <circle
              cx={primaryPoints[activeIdx].x}
              cy={primaryPoints[activeIdx].y}
              r="4.5"
              fill={primaryColor}
              stroke={palette.surfaceColor}
              strokeWidth="2"
            />
          </g>
        )}

        {/* X Axis labels (sampled to avoid overlap) */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.ceil(data.length / 7));
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={i}
              x={getX(i)}
              y={height - 8}
              textAnchor="middle"
              fontSize="10"
              className="font-num"
              fill={palette.textSecondary}
            >
              {d.label}
            </text>
          );
        })}

        {/* Hover columns */}
        {data.map((_, i) => {
          const colW = innerW / Math.max(1, data.length);
          const x = getX(i) - colW / 2;
          return (
            <rect
              key={i}
              x={Math.max(padLeft, x)}
              y={padTop}
              width={colW}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          );
        })}
      </svg>
    </div>
  );
}

export interface BarComparisonPoint {
  label: string;
  income: number;
  expense: number;
}

export function BarComparisonChart({
  data,
  height = 240,
  emptyText = 'Registre receitas e despesas para comparar os períodos.',
}: {
  data: BarComparisonPoint[];
  height?: number;
  emptyText?: string;
}) {
  const { palette, preferences } = useFinance();
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs"
        style={{ height, color: palette.textSecondary }}
      >
        {emptyText}
      </div>
    );
  }

  const width = 640;
  const padLeft = 64;
  const padRight = 16;
  const padTop = 16;
  const padBottom = 30;
  const innerW = width - padLeft - padRight;
  const innerH = height - padTop - padBottom;

  const maxVal = Math.max(...data.flatMap((d) => [d.income, d.expense]), 100);
  const groupW = innerW / data.length;
  const barW = Math.min(24, Math.max(8, groupW * 0.28));

  const active = hoverIdx !== null ? data[hoverIdx] : data[data.length - 1];

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2 text-xs">
        <span className="font-medium" style={{ color: palette.textSecondary }}>
          Período: {active.label}
        </span>
        <div className="flex items-center gap-4 font-num">
          <span style={{ color: palette.positiveColor }}>
            Receitas: {formatCurrency(active.income, preferences.currency)}
          </span>
          <span style={{ color: palette.negativeColor }}>
            Despesas: {formatCurrency(active.expense, preferences.currency)}
          </span>
        </div>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible select-none"
        style={{ height: `${height}px` }}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label="Comparação entre receitas e despesas"
      >
        {[0, 0.5, 1].map((t, i) => {
          const val = maxVal * t;
          const y = padTop + innerH - t * innerH;
          return (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke={palette.borderColor}
                strokeDasharray="3 3"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize="10"
                className="font-num"
                fill={palette.textSecondary}
              >
                {formatCompactCurrency(val, preferences.currency)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const cx = padLeft + groupW * i + groupW / 2;
          const incH = (d.income / maxVal) * innerH;
          const expH = (d.expense / maxVal) * innerH;
          const isHovered = hoverIdx === i;

          return (
            <g key={d.label} onMouseEnter={() => setHoverIdx(i)}>
              {isHovered && (
                <rect
                  x={padLeft + groupW * i + 2}
                  y={padTop}
                  width={Math.max(4, groupW - 4)}
                  height={innerH}
                  fill={palette.surfaceMutedColor}
                  opacity={0.5}
                />
              )}
              <rect
                x={cx - barW - 2}
                y={padTop + innerH - incH}
                width={barW}
                height={Math.max(1, incH)}
                rx={palette.preset.borderRadius === 'sharp' ? 1 : 3}
                fill={palette.positiveColor}
                opacity={hoverIdx === null || isHovered ? 0.95 : 0.45}
              />
              <rect
                x={cx + 2}
                y={padTop + innerH - expH}
                width={barW}
                height={Math.max(1, expH)}
                rx={palette.preset.borderRadius === 'sharp' ? 1 : 3}
                fill={palette.negativeColor}
                opacity={hoverIdx === null || isHovered ? 0.95 : 0.45}
              />
              <text
                x={cx}
                y={height - 8}
                textAnchor="middle"
                fontSize="10"
                className="font-num"
                fill={palette.textSecondary}
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export interface DonutSegment {
  key: string;
  label: string;
  value: number;
  share: number;
}

export function DonutBreakdownChart({
  segments,
  emptyText = 'Sem valores positivos para distribuição.',
}: {
  segments: DonutSegment[];
  emptyText?: string;
}) {
  const { palette, preferences } = useFinance();
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const nonZero = segments.filter((s) => s.value > 0);
  if (nonZero.length === 0) {
    return (
      <div className="py-8 text-center text-xs" style={{ color: palette.textSecondary }}>
        {emptyText}
      </div>
    );
  }

  const total = nonZero.reduce((sum, s) => sum + s.value, 0);
  const size = 160;
  const strokeW = 22;
  const r = (size - strokeW) / 2;
  const circumference = 2 * Math.PI * r;
  let accumulated = 0;

  const focused = nonZero.find((s) => s.key === activeKey);

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={palette.surfaceMutedColor}
            strokeWidth={strokeW}
          />
          {nonZero.map((seg, idx) => {
            const pct = seg.value / total;
            const dash = pct * circumference;
            const offset = -accumulated * circumference;
            accumulated += pct;
            const color = palette.chartColors[idx % palette.chartColors.length];
            const isActive = activeKey === null || activeKey === seg.key;
            return (
              <circle
                key={seg.key}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={color}
                strokeWidth={strokeW}
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
                opacity={isActive ? 1 : 0.35}
                className="transition-opacity duration-150 cursor-pointer"
                onMouseEnter={() => setActiveKey(seg.key)}
                onMouseLeave={() => setActiveKey(null)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-3">
          <span className="text-[11px]" style={{ color: palette.textSecondary }}>
            {focused ? focused.label : 'Total'}
          </span>
          <span className="text-xs font-semibold font-num mt-0.5">
            {formatCompactCurrency(focused ? focused.value : total, preferences.currency)}
          </span>
        </div>
      </div>

      <div className="w-full space-y-2.5">
        {nonZero.map((seg, idx) => {
          const color = palette.chartColors[idx % palette.chartColors.length];
          return (
            <div
              key={seg.key}
              className="flex items-center justify-between gap-3 text-xs py-1 border-b last:border-b-0"
              style={{ borderColor: palette.borderColor }}
              onMouseEnter={() => setActiveKey(seg.key)}
              onMouseLeave={() => setActiveKey(null)}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 shrink-0"
                  style={{ backgroundColor: color, borderRadius: '2px' }}
                />
                <span className="truncate" style={{ color: palette.textPrimary }}>
                  {seg.label}
                </span>
              </div>
              <div className="flex items-center gap-3 font-num shrink-0">
                <span style={{ color: palette.textSecondary }}>{formatPercent(seg.share)}</span>
                <span className="font-semibold" style={{ color: palette.textPrimary }}>
                  {formatCurrency(seg.value, preferences.currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
