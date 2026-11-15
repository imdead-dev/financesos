import React from 'react';
import { Check, RotateCcw } from 'lucide-react';
import { useFinance } from '../../context/FinanceContext';
import {
  BorderRadiusStyle,
  CardStyle,
  NavStyle,
  ThemePreset,
  UiDensity,
} from '../../types/finance';
import { preferencesFromPreset, THEME_LIST } from '../../utils/themes';
import { SurfaceCard } from '../ui/SurfaceCard';

const ACCENT_SWATCHES = [
  '#FF9900',
  '#2962FF',
  '#30D158',
  '#00E5FF',
  '#10B981',
  '#3B82F6',
  '#1D4ED8',
  '#38BDF8',
  '#22C55E',
  '#FAFAFA',
];

const CHART_PALETTE_PRESETS = [
  { name: 'Terminal Clássico', colors: ['#FF9900', '#10B981', '#38BDF8', '#A855F7', '#F43F5E'] },
  { name: 'Trading Pro', colors: ['#2962FF', '#089981', '#F23645', '#FF9800', '#9C27B0'] },
  { name: 'Esmeralda & Ciano', colors: ['#10B981', '#38BDF8', '#34D399', '#818CF8', '#FBBF24'] },
  { name: 'Monocromático', colors: ['#FAFAFA', '#A1A1AA', '#71717A', '#52525B', '#D4D4D8'] },
  { name: 'Cyber Neon', colors: ['#00E5FF', '#B026FF', '#00FFA3', '#FF2A6D', '#FFE600'] },
];

function ThemeMiniPreview({
  preset,
  isSelected,
  onSelect,
}: {
  preset: ThemePreset;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const radius =
    preset.borderRadius === 'sharp'
      ? '2px'
      : preset.borderRadius === 'subtle'
        ? '6px'
        : '11px';

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isSelected}
      data-testid={`theme-card-${preset.id}`}
      className="text-left border p-3.5 transition-all duration-150 flex flex-col gap-3 w-full"
      style={{
        backgroundColor: preset.surfaceColor,
        borderColor: isSelected ? preset.accentColor : preset.borderColor,
        borderRadius: radius,
        color: preset.textPrimary,
        boxShadow: isSelected ? `0 0 0 1px ${preset.accentColor}` : undefined,
      }}
    >
      {/* Live Visual Mini Terminal Mockup */}
      <div
        className="w-full border overflow-hidden p-2.5 space-y-2"
        style={{
          backgroundColor: preset.backgroundColor,
          borderColor: preset.borderColor,
          borderRadius: radius,
        }}
      >
        {/* Top miniature bar */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{
              color: preset.accentColor,
              fontFamily:
                preset.fontDisplay === 'mono' ? '"JetBrains Mono", monospace' : 'inherit',
            }}
          >
            FINANCE OS
          </span>
          <span
            className="w-10 h-1.5"
            style={{ backgroundColor: preset.borderColor, borderRadius: radius }}
          />
        </div>

        {/* Mini KPI + Mini Chart */}
        <div className="grid grid-cols-3 gap-1.5">
          <div
            className="col-span-1 p-1.5 border"
            style={{
              backgroundColor: preset.surfaceColor,
              borderColor: preset.borderColor,
              borderRadius: radius,
            }}
          >
            <div className="w-8 h-1 mb-1" style={{ backgroundColor: preset.textSecondary, opacity: 0.45 }} />
            <div className="text-[10px] font-bold font-num" style={{ color: preset.positiveColor }}>
              +14,2%
            </div>
          </div>
          <div
            className="col-span-2 p-1.5 border flex items-end"
            style={{
              backgroundColor: preset.surfaceColor,
              borderColor: preset.borderColor,
              borderRadius: radius,
            }}
          >
            <svg viewBox="0 0 100 24" className="w-full h-5 overflow-visible">
              <polyline
                fill="none"
                stroke={preset.chartColors[0]}
                strokeWidth="2"
                points={
                  preset.chartLineStyle === 'stepped'
                    ? '0,20 20,20 20,14 45,14 45,16 70,8 100,4'
                    : '0,20 22,15 48,17 72,9 100,3'
                }
              />
            </svg>
          </div>
        </div>
      </div>

      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold">{preset.name}</span>
          </div>
          <p className="text-[11px] mt-0.5 leading-snug" style={{ color: preset.textSecondary }}>
            {preset.description}
          </p>
        </div>
        {isSelected && (
          <span
            className="w-5 h-5 flex items-center justify-center shrink-0"
            style={{
              backgroundColor: preset.accentColor,
              color: preset.accentForeground,
              borderRadius: radius,
            }}
          >
            <Check className="w-3.5 h-3.5" />
          </span>
        )}
      </div>

      <div
        className="flex items-center justify-between gap-2 text-[10px] pt-1 border-t"
        style={{ borderColor: preset.borderColor, color: preset.textSecondary }}
      >
        <span className="truncate">
          {preset.mode === 'dark' ? 'Escuro' : 'Claro'} · {preset.tagline}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {preset.chartColors.slice(0, 4).map((c, idx) => (
            <span
              key={idx}
              className="w-2.5 h-2.5"
              style={{ backgroundColor: c, borderRadius: '2px' }}
            />
          ))}
        </div>
      </div>
    </button>
  );
}

export function ThemesView() {
  const { preferences, updatePreferences, palette } = useFinance();

  const handleApplyPreset = (preset: ThemePreset) => {
    void updatePreferences(preferencesFromPreset(preset.id, preferences.currency));
  };

  const handleResetCurrent = () => {
    void updatePreferences(preferencesFromPreset(preferences.themeId, preferences.currency));
  };

  return (
    <div className="space-y-6">
      {/* Header Explanation */}
      <SurfaceCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold font-display">
              Estúdio de Temas & Personalização
            </h2>
            <p className="text-xs mt-1 max-w-3xl" style={{ color: palette.textSecondary }}>
              Escolha entre 10 identidades visuais completas com prévia ao vivo ou ajuste cores,
              densidade, estilo de cards, arredondamento e navegação. Alterações são aplicadas e
              salvas automaticamente sem afetar seus dados financeiros.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetCurrent}
            className="fos-btn-secondary px-3.5 py-2 text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 min-h-[38px] self-start md:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Padrão do Tema</span>
          </button>
        </div>
      </SurfaceCard>

      {/* 10 Theme Presets with Live Visual Preview */}
      <div className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: palette.textSecondary }}>
          Temas Predefinidos (10 identidades visuais)
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
          {THEME_LIST.map((preset) => (
            <ThemeMiniPreview
              key={preset.id}
              preset={preset}
              isSelected={preferences.themeId === preset.id}
              onSelect={() => handleApplyPreset(preset)}
            />
          ))}
        </div>
      </div>

      {/* Advanced Visual Customization */}
      <SurfaceCard>
        <h3 className="text-sm font-semibold font-display mb-4">
          Personalização Avançada
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Mode */}
          <div className="space-y-2">
            <span className="block text-xs font-medium">Modo de Exibição</span>
            <div className="grid grid-cols-2 gap-2">
              {(['dark', 'light'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() =>
                    void updatePreferences({
                      mode: m,
                      backgroundColor: m === 'light' ? '#F4F6F9' : '#090B0F',
                    })
                  }
                  className="py-2 px-3 text-xs font-medium border min-h-[38px]"
                  style={{
                    borderRadius: palette.radiusSmPx,
                    borderColor:
                      preferences.mode === m ? palette.accentColor : palette.borderColor,
                    backgroundColor:
                      preferences.mode === m ? palette.surfaceMutedColor : 'transparent',
                    color: preferences.mode === m ? palette.accentColor : palette.textSecondary,
                  }}
                >
                  {m === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <label htmlFor="custom-accent" className="block text-xs font-medium">
              Cor de Destaque
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {ACCENT_SWATCHES.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => void updatePreferences({ accentColor: hex })}
                  aria-label={`Selecionar cor de destaque ${hex}`}
                  className="w-7 h-7 border transition-transform hover:scale-110"
                  style={{
                    backgroundColor: hex,
                    borderRadius: palette.radiusSmPx,
                    borderColor:
                      preferences.accentColor.toLowerCase() === hex.toLowerCase()
                        ? palette.textPrimary
                        : palette.borderColor,
                    boxShadow:
                      preferences.accentColor.toLowerCase() === hex.toLowerCase()
                        ? `0 0 0 2px ${palette.accentColor}`
                        : undefined,
                  }}
                />
              ))}
              <input
                id="custom-accent"
                type="color"
                value={preferences.accentColor}
                onChange={(e) => void updatePreferences({ accentColor: e.target.value })}
                aria-label="Cor de destaque personalizada"
                className="w-8 h-7 p-0 border cursor-pointer bg-transparent"
                style={{ borderColor: palette.borderColor, borderRadius: palette.radiusSmPx }}
              />
            </div>
          </div>

          {/* Background Color */}
          <div className="space-y-2">
            <label htmlFor="custom-bg" className="block text-xs font-medium">
              Cor de Fundo
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {['#000000', '#050507', '#0A0F1E', '#131722', '#040F0B', '#F4F6F9', '#FFFFFF'].map(
                (bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() =>
                      void updatePreferences({
                        backgroundColor: bg,
                        mode: bg === '#F4F6F9' || bg === '#FFFFFF' ? 'light' : 'dark',
                      })
                    }
                    aria-label={`Selecionar fundo ${bg}`}
                    className="w-7 h-7 border"
                    style={{
                      backgroundColor: bg,
                      borderRadius: palette.radiusSmPx,
                      borderColor:
                        preferences.backgroundColor.toLowerCase() === bg.toLowerCase()
                          ? palette.accentColor
                          : palette.borderColor,
                    }}
                  />
                )
              )}
              <input
                id="custom-bg"
                type="color"
                value={
                  preferences.backgroundColor.startsWith('#')
                    ? preferences.backgroundColor
                    : '#090B0F'
                }
                onChange={(e) => void updatePreferences({ backgroundColor: e.target.value })}
                aria-label="Cor de fundo personalizada"
                className="w-8 h-7 p-0 border cursor-pointer bg-transparent"
                style={{ borderColor: palette.borderColor, borderRadius: palette.radiusSmPx }}
              />
            </div>
          </div>

          {/* Chart Colors */}
          <div className="space-y-2">
            <span className="block text-xs font-medium">Paleta dos Gráficos</span>
            <div className="flex flex-wrap gap-2">
              {CHART_PALETTE_PRESETS.map((cp) => (
                <button
                  key={cp.name}
                  type="button"
                  onClick={() => void updatePreferences({ chartColors: [...cp.colors] })}
                  className="px-2.5 py-1.5 border text-[11px] flex items-center gap-1.5 min-h-[34px]"
                  style={{
                    borderRadius: palette.radiusSmPx,
                    borderColor: palette.borderColor,
                    backgroundColor: palette.surfaceMutedColor,
                  }}
                >
                  <span className="flex items-center gap-0.5">
                    {cp.colors.slice(0, 3).map((c, i) => (
                      <span
                        key={i}
                        className="w-2.5 h-2.5"
                        style={{ backgroundColor: c, borderRadius: '2px' }}
                      />
                    ))}
                  </span>
                  <span>{cp.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* UI Density */}
          <div className="space-y-2">
            <span className="block text-xs font-medium">Densidade da Interface</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['compact', 'Compacta'],
                  ['comfortable', 'Confortável'],
                  ['spacious', 'Ampla'],
                ] as Array<[UiDensity, string]>
              ).map(([d, label]) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => void updatePreferences({ density: d })}
                  className="py-2 px-2 text-xs font-medium border min-h-[38px]"
                  style={{
                    borderRadius: palette.radiusSmPx,
                    borderColor:
                      preferences.density === d ? palette.accentColor : palette.borderColor,
                    backgroundColor:
                      preferences.density === d ? palette.surfaceMutedColor : 'transparent',
                    color:
                      preferences.density === d ? palette.accentColor : palette.textSecondary,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Card Style */}
          <div className="space-y-2">
            <span className="block text-xs font-medium">Estilo dos Cards</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  ['flat', 'Plano'],
                  ['bordered', 'Borda'],
                  ['elevated', 'Elevado'],
                  ['glass', 'Vidro'],
                ] as Array<[CardStyle, string]>
              ).map(([cs, label]) => (
                <button
                  key={cs}
                  type="button"
                  onClick={() => void updatePreferences({ cardStyle: cs })}
                  className="py-2 px-2 text-xs font-medium border min-h-[38px]"
                  style={{
                    borderRadius: palette.radiusSmPx,
                    borderColor:
                      preferences.cardStyle === cs ? palette.accentColor : palette.borderColor,
                    backgroundColor:
                      preferences.cardStyle === cs ? palette.surfaceMutedColor : 'transparent',
                    color:
                      preferences.cardStyle === cs ? palette.accentColor : palette.textSecondary,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-2">
            <span className="block text-xs font-medium">Arredondamento</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(
                [
                  ['sharp', 'Reto'],
                  ['subtle', 'Sutil'],
                  ['rounded', 'Médio'],
                  ['pill', 'Suave'],
                ] as Array<[BorderRadiusStyle, string]>
              ).map(([br, label]) => (
                <button
                  key={br}
                  type="button"
                  onClick={() => void updatePreferences({ borderRadius: br })}
                  className="py-2 px-2 text-xs font-medium border min-h-[38px]"
                  style={{
                    borderRadius: palette.radiusSmPx,
                    borderColor:
                      preferences.borderRadius === br
                        ? palette.accentColor
                        : palette.borderColor,
                    backgroundColor:
                      preferences.borderRadius === br
                        ? palette.surfaceMutedColor
                        : 'transparent',
                    color:
                      preferences.borderRadius === br
                        ? palette.accentColor
                        : palette.textSecondary,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Style */}
          <div className="space-y-2">
            <span className="block text-xs font-medium">Estilo de Navegação</span>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  ['sidebar', 'Sidebar'],
                  ['compact_rail', 'Rail Compacto'],
                  ['topbar', 'Barra Topo'],
                ] as Array<[NavStyle, string]>
              ).map(([ns, label]) => (
                <button
                  key={ns}
                  type="button"
                  onClick={() => void updatePreferences({ navStyle: ns })}
                  className="py-2 px-2 text-xs font-medium border min-h-[38px]"
                  style={{
                    borderRadius: palette.radiusSmPx,
                    borderColor:
                      preferences.navStyle === ns ? palette.accentColor : palette.borderColor,
                    backgroundColor:
                      preferences.navStyle === ns ? palette.surfaceMutedColor : 'transparent',
                    color:
                      preferences.navStyle === ns ? palette.accentColor : palette.textSecondary,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </SurfaceCard>
    </div>
  );
}
