import {
  BorderRadiusStyle,
  CardStyle,
  ThemeId,
  ThemePreset,
  UiDensity,
  UserPreferences,
} from '../types/finance';

export const THEME_PRESETS: Record<ThemeId, ThemePreset> = {
  bloomberg: {
    id: 'bloomberg',
    name: 'Bloomberg Terminal',
    tagline: 'Terminal Institucional',
    description: 'Preto absoluto, âmbar de alta leitura, grade densa e tipografia monoespaçada.',
    mode: 'dark',
    backgroundColor: '#050507',
    surfaceColor: '#0E0F12',
    surfaceMutedColor: '#16181D',
    borderColor: '#262932',
    textPrimary: '#F4F4F5',
    textSecondary: '#9CA3AF',
    accentColor: '#FF9900',
    accentForeground: '#09090B',
    positiveColor: '#10B981',
    negativeColor: '#EF4444',
    warningColor: '#F59E0B',
    chartColors: ['#FF9900', '#10B981', '#38BDF8', '#A855F7', '#F43F5E'],
    density: 'compact',
    cardStyle: 'bordered',
    borderRadius: 'sharp',
    navStyle: 'sidebar',
    fontDisplay: 'mono',
    fontBody: 'mono',
    headingStyle: 'terminal',
    chartLineStyle: 'stepped',
    glassBlur: false,
  },
  tradingview: {
    id: 'tradingview',
    name: 'TradingView',
    tagline: 'Análise Gráfica Pro',
    description: 'Grafite profundo com azul de negociação, leitura rápida e gráficos destacados.',
    mode: 'dark',
    backgroundColor: '#131722',
    surfaceColor: '#1E222D',
    surfaceMutedColor: '#262B38',
    borderColor: '#2A2E39',
    textPrimary: '#D1D4DC',
    textSecondary: '#787B86',
    accentColor: '#2962FF',
    accentForeground: '#FFFFFF',
    positiveColor: '#089981',
    negativeColor: '#F23645',
    warningColor: '#FF9800',
    chartColors: ['#2962FF', '#089981', '#F23645', '#FF9800', '#9C27B0'],
    density: 'compact',
    cardStyle: 'bordered',
    borderRadius: 'subtle',
    navStyle: 'compact_rail',
    fontDisplay: 'jakarta',
    fontBody: 'jakarta',
    headingStyle: 'clean',
    chartLineStyle: 'sharp',
    glassBlur: false,
  },
  apple_finance: {
    id: 'apple_finance',
    name: 'Apple Finance',
    tagline: 'Minimalismo Refinado',
    description: 'Espaços amplos, tipografia geométrica elegante, verde financeiro e contrastes suaves.',
    mode: 'dark',
    backgroundColor: '#0A0A0C',
    surfaceColor: '#16161A',
    surfaceMutedColor: '#202026',
    borderColor: '#2B2B33',
    textPrimary: '#F5F5F7',
    textSecondary: '#98989D',
    accentColor: '#30D158',
    accentForeground: '#051B0B',
    positiveColor: '#30D158',
    negativeColor: '#FF453A',
    warningColor: '#FFD60A',
    chartColors: ['#30D158', '#0A84FF', '#64D2FF', '#BF5AF2', '#FF9F0A'],
    density: 'spacious',
    cardStyle: 'elevated',
    borderRadius: 'rounded',
    navStyle: 'sidebar',
    fontDisplay: 'outfit',
    fontBody: 'jakarta',
    headingStyle: 'editorial',
    chartLineStyle: 'smooth',
    glassBlur: false,
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk',
    tagline: 'Futurista High-Contrast',
    description: 'Obsidiana profunda com violeta elétrico, ciano técnico e ângulos cortados.',
    mode: 'dark',
    backgroundColor: '#07040F',
    surfaceColor: '#100921',
    surfaceMutedColor: '#191032',
    borderColor: '#322061',
    textPrimary: '#F3EEFF',
    textSecondary: '#A499C9',
    accentColor: '#00E5FF',
    accentForeground: '#050810',
    positiveColor: '#00FFA3',
    negativeColor: '#FF2A6D',
    warningColor: '#FFE600',
    chartColors: ['#00E5FF', '#B026FF', '#00FFA3', '#FF2A6D', '#FFE600'],
    density: 'comfortable',
    cardStyle: 'bordered',
    borderRadius: 'sharp',
    navStyle: 'sidebar',
    fontDisplay: 'mono',
    fontBody: 'jakarta',
    headingStyle: 'terminal',
    chartLineStyle: 'sharp',
    glassBlur: false,
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome',
    tagline: 'Editorial Puro',
    description: 'Preto, branco e escala precisa de cinzas arquitetônicos sem ruído cromático.',
    mode: 'dark',
    backgroundColor: '#09090B',
    surfaceColor: '#121215',
    surfaceMutedColor: '#1A1A1F',
    borderColor: '#27272A',
    textPrimary: '#FAFAFA',
    textSecondary: '#A1A1AA',
    accentColor: '#FAFAFA',
    accentForeground: '#09090B',
    positiveColor: '#E4E4E7',
    negativeColor: '#71717A',
    warningColor: '#D4D4D8',
    chartColors: ['#FAFAFA', '#A1A1AA', '#71717A', '#52525B', '#D4D4D8'],
    density: 'comfortable',
    cardStyle: 'flat',
    borderRadius: 'subtle',
    navStyle: 'sidebar',
    fontDisplay: 'outfit',
    fontBody: 'jakarta',
    headingStyle: 'editorial',
    chartLineStyle: 'smooth',
    glassBlur: false,
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald',
    tagline: 'Private Banking',
    description: 'Verde-escuro profundo, detalhes esmeralda serenos e leitura de alta confiança.',
    mode: 'dark',
    backgroundColor: '#040F0B',
    surfaceColor: '#081B14',
    surfaceMutedColor: '#0F2920',
    borderColor: '#173E30',
    textPrimary: '#ECFDF5',
    textSecondary: '#86B8A3',
    accentColor: '#10B981',
    accentForeground: '#032016',
    positiveColor: '#34D399',
    negativeColor: '#FB7185',
    warningColor: '#FBBF24',
    chartColors: ['#10B981', '#34D399', '#6EE7B7', '#38BDF8', '#FBBF24'],
    density: 'comfortable',
    cardStyle: 'bordered',
    borderRadius: 'rounded',
    navStyle: 'sidebar',
    fontDisplay: 'outfit',
    fontBody: 'jakarta',
    headingStyle: 'clean',
    chartLineStyle: 'smooth',
    glassBlur: false,
  },
  midnight_blue: {
    id: 'midnight_blue',
    name: 'Midnight Blue',
    tagline: 'Mesa Institucional',
    description: 'Azul-marinho profundo com azul elétrico e hierarquia de mesa de tesouraria.',
    mode: 'dark',
    backgroundColor: '#050B16',
    surfaceColor: '#0B1629',
    surfaceMutedColor: '#11213D',
    borderColor: '#1D3357',
    textPrimary: '#F0F6FF',
    textSecondary: '#8CA3C7',
    accentColor: '#3B82F6',
    accentForeground: '#FFFFFF',
    positiveColor: '#22C55E',
    negativeColor: '#F43F5E',
    warningColor: '#F59E0B',
    chartColors: ['#3B82F6', '#06B6D4', '#22C55E', '#818CF8', '#F59E0B'],
    density: 'comfortable',
    cardStyle: 'elevated',
    borderRadius: 'rounded',
    navStyle: 'topbar',
    fontDisplay: 'outfit',
    fontBody: 'jakarta',
    headingStyle: 'clean',
    chartLineStyle: 'smooth',
    glassBlur: false,
  },
  light_professional: {
    id: 'light_professional',
    name: 'Light Professional',
    tagline: 'Clareza Executiva',
    description: 'Superfície clara nítida, divisórias sutis em cinza-frio e acento azul corporativo.',
    mode: 'light',
    backgroundColor: '#F4F6F9',
    surfaceColor: '#FFFFFF',
    surfaceMutedColor: '#EEF2F6',
    borderColor: '#DCE3EC',
    textPrimary: '#0F172A',
    textSecondary: '#475569',
    accentColor: '#1D4ED8',
    accentForeground: '#FFFFFF',
    positiveColor: '#15803D',
    negativeColor: '#DC2626',
    warningColor: '#D97706',
    chartColors: ['#1D4ED8', '#15803D', '#0284C7', '#D97706', '#64748B'],
    density: 'comfortable',
    cardStyle: 'elevated',
    borderRadius: 'subtle',
    navStyle: 'sidebar',
    fontDisplay: 'outfit',
    fontBody: 'jakarta',
    headingStyle: 'clean',
    chartLineStyle: 'smooth',
    glassBlur: false,
  },
  glassmorphism: {
    id: 'glassmorphism',
    name: 'Glassmorphism',
    tagline: 'Painéis Translúcidos',
    description: 'Camadas de vidro com desfoque sutil sobre fundo profundo e bordas luminosas.',
    mode: 'dark',
    backgroundColor: '#0A0F1E',
    surfaceColor: 'rgba(20, 30, 52, 0.62)',
    surfaceMutedColor: 'rgba(32, 46, 76, 0.56)',
    borderColor: 'rgba(186, 210, 255, 0.16)',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    accentColor: '#38BDF8',
    accentForeground: '#061523',
    positiveColor: '#34D399',
    negativeColor: '#FB7185',
    warningColor: '#FBBF24',
    chartColors: ['#38BDF8', '#34D399', '#818CF8', '#F472B6', '#FBBF24'],
    density: 'spacious',
    cardStyle: 'glass',
    borderRadius: 'rounded',
    navStyle: 'sidebar',
    fontDisplay: 'outfit',
    fontBody: 'jakarta',
    headingStyle: 'clean',
    chartLineStyle: 'smooth',
    glassBlur: true,
  },
  amoled: {
    id: 'amoled',
    name: 'AMOLED',
    tagline: 'Contraste Absoluto',
    description: 'Preto puro #000000 para telas OLED com contraste máximo e sinais cromáticos precisos.',
    mode: 'dark',
    backgroundColor: '#000000',
    surfaceColor: '#080808',
    surfaceMutedColor: '#121212',
    borderColor: '#222222',
    textPrimary: '#FFFFFF',
    textSecondary: '#A3A3A3',
    accentColor: '#22C55E',
    accentForeground: '#021A0A',
    positiveColor: '#22C55E',
    negativeColor: '#EF4444',
    warningColor: '#FACC15',
    chartColors: ['#22C55E', '#38BDF8', '#FACC15', '#A855F7', '#F43F5E'],
    density: 'compact',
    cardStyle: 'bordered',
    borderRadius: 'subtle',
    navStyle: 'sidebar',
    fontDisplay: 'mono',
    fontBody: 'jakarta',
    headingStyle: 'terminal',
    chartLineStyle: 'sharp',
    glassBlur: false,
  },
};

export const THEME_LIST: ThemePreset[] = Object.values(THEME_PRESETS);

export const DEFAULT_PREFERENCES: UserPreferences = {
  themeId: 'bloomberg',
  mode: THEME_PRESETS.bloomberg.mode,
  accentColor: THEME_PRESETS.bloomberg.accentColor,
  backgroundColor: THEME_PRESETS.bloomberg.backgroundColor,
  chartColors: [...THEME_PRESETS.bloomberg.chartColors],
  density: THEME_PRESETS.bloomberg.density,
  cardStyle: THEME_PRESETS.bloomberg.cardStyle,
  borderRadius: THEME_PRESETS.bloomberg.borderRadius,
  navStyle: THEME_PRESETS.bloomberg.navStyle,
  currency: 'BRL',
};

export function preferencesFromPreset(
  presetId: ThemeId,
  currency: UserPreferences['currency'] = 'BRL'
): UserPreferences {
  const preset = THEME_PRESETS[presetId] ?? THEME_PRESETS.bloomberg;
  return {
    themeId: preset.id,
    mode: preset.mode,
    accentColor: preset.accentColor,
    backgroundColor: preset.backgroundColor,
    chartColors: [...preset.chartColors],
    density: preset.density,
    cardStyle: preset.cardStyle,
    borderRadius: preset.borderRadius,
    navStyle: preset.navStyle,
    currency,
  };
}

function parseHexToRgb(color: string): [number, number, number] | null {
  const clean = color.trim();
  const match = /^#([0-9a-fA-F]{6})$/.exec(clean);
  if (!match) return null;
  const intVal = parseInt(match[1], 16);
  return [(intVal >> 16) & 255, (intVal >> 8) & 255, intVal & 255];
}

export function getRelativeLuminance(color: string): number {
  const rgb = parseHexToRgb(color);
  if (!rgb) return 0.1;
  const [r, g, b] = rgb.map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function getReadableForeground(bgHex: string): string {
  const lum = getRelativeLuminance(bgHex);
  return lum > 0.42 ? '#09090B' : '#FFFFFF';
}

export interface EffectivePalette {
  preset: ThemePreset;
  mode: 'dark' | 'light';
  backgroundColor: string;
  surfaceColor: string;
  surfaceMutedColor: string;
  borderColor: string;
  textPrimary: string;
  textSecondary: string;
  accentColor: string;
  accentForeground: string;
  positiveColor: string;
  negativeColor: string;
  warningColor: string;
  chartColors: string[];
  radiusPx: string;
  radiusSmPx: string;
  densityGap: string;
  densityPad: string;
  rowHeight: string;
}

const RADIUS_MAP: Record<BorderRadiusStyle, { main: string; sm: string }> = {
  sharp: { main: '2px', sm: '2px' },
  subtle: { main: '8px', sm: '6px' },
  rounded: { main: '14px', sm: '10px' },
  pill: { main: '20px', sm: '14px' },
};

const DENSITY_MAP: Record<UiDensity, { gap: string; pad: string; row: string }> = {
  compact: { gap: '12px', pad: '14px', row: '36px' },
  comfortable: { gap: '16px', pad: '20px', row: '42px' },
  spacious: { gap: '24px', pad: '26px', row: '48px' },
};

export function resolveEffectivePalette(prefs: UserPreferences): EffectivePalette {
  const preset = THEME_PRESETS[prefs.themeId] ?? THEME_PRESETS.bloomberg;
  const mode = prefs.mode;

  // Ensure light/dark coherence even if user switches mode manually on a dark or light preset
  const presetIsLight = preset.mode === 'light';
  const modeMatchesPreset = mode === preset.mode;

  let backgroundColor = prefs.backgroundColor || preset.backgroundColor;
  const bgLum = getRelativeLuminance(backgroundColor);

  let surfaceColor = preset.surfaceColor;
  let surfaceMutedColor = preset.surfaceMutedColor;
  let borderColor = preset.borderColor;
  let textPrimary = preset.textPrimary;
  let textSecondary = preset.textSecondary;
  let positiveColor = preset.positiveColor;
  let negativeColor = preset.negativeColor;

  if (!modeMatchesPreset) {
    if (mode === 'light') {
      if (bgLum < 0.5) backgroundColor = '#F4F6F9';
      surfaceColor = prefs.cardStyle === 'glass' ? 'rgba(255, 255, 255, 0.78)' : '#FFFFFF';
      surfaceMutedColor = '#EEF2F6';
      borderColor = '#DCE3EC';
      textPrimary = '#0F172A';
      textSecondary = '#475569';
      positiveColor = '#15803D';
      negativeColor = '#DC2626';
    } else {
      if (bgLum >= 0.5) backgroundColor = '#0A0B0E';
      surfaceColor = prefs.cardStyle === 'glass' ? 'rgba(20, 26, 40, 0.72)' : '#12141A';
      surfaceMutedColor = '#1A1D25';
      borderColor = '#272B36';
      textPrimary = '#F4F4F5';
      textSecondary = '#9CA3AF';
      positiveColor = '#10B981';
      negativeColor = '#EF4444';
    }
  } else if (prefs.cardStyle === 'glass' && !preset.glassBlur) {
    surfaceColor =
      mode === 'light' ? 'rgba(255, 255, 255, 0.74)' : 'rgba(20, 26, 40, 0.65)';
    surfaceMutedColor =
      mode === 'light' ? 'rgba(238, 242, 246, 0.7)' : 'rgba(30, 38, 58, 0.6)';
  }

  // If user customized backgroundColor directly without changing mode, ensure text matches actual luminance
  const effectiveLum = getRelativeLuminance(backgroundColor);
  if (effectiveLum > 0.55 && mode === 'dark') {
    textPrimary = '#0F172A';
    textSecondary = '#475569';
    if (!presetIsLight) {
      surfaceColor = '#FFFFFF';
      surfaceMutedColor = '#F1F5F9';
      borderColor = '#CBD5E1';
    }
  }

  const accentColor = prefs.accentColor || preset.accentColor;
  const accentForeground = getReadableForeground(accentColor);
  const radius = RADIUS_MAP[prefs.borderRadius] ?? RADIUS_MAP.subtle;
  const density = DENSITY_MAP[prefs.density] ?? DENSITY_MAP.comfortable;

  return {
    preset,
    mode,
    backgroundColor,
    surfaceColor,
    surfaceMutedColor,
    borderColor,
    textPrimary,
    textSecondary,
    accentColor,
    accentForeground,
    positiveColor,
    negativeColor,
    warningColor: preset.warningColor,
    chartColors:
      prefs.chartColors && prefs.chartColors.length > 0
        ? prefs.chartColors
        : preset.chartColors,
    radiusPx: radius.main,
    radiusSmPx: radius.sm,
    densityGap: density.gap,
    densityPad: density.pad,
    rowHeight: density.row,
  };
}

export function getCardClasses(cardStyle: CardStyle): string {
  switch (cardStyle) {
    case 'flat':
      return 'border-0 shadow-none';
    case 'bordered':
      return 'border shadow-none';
    case 'elevated':
      return 'border shadow-[0_8px_24px_-12px_rgba(0,0,0,0.45)]';
    case 'glass':
      return 'border backdrop-blur-md shadow-[0_8px_30px_-14px_rgba(0,0,0,0.45)]';
  }
}

export function applyThemeToDocument(prefs: UserPreferences): EffectivePalette {
  const palette = resolveEffectivePalette(prefs);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (palette.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    root.dataset.theme = prefs.themeId;
    root.dataset.density = prefs.density;
    root.dataset.cardStyle = prefs.cardStyle;

    root.style.setProperty('--fos-bg', palette.backgroundColor);
    root.style.setProperty('--fos-surface', palette.surfaceColor);
    root.style.setProperty('--fos-surface-muted', palette.surfaceMutedColor);
    root.style.setProperty('--fos-border', palette.borderColor);
    root.style.setProperty('--fos-text', palette.textPrimary);
    root.style.setProperty('--fos-text-muted', palette.textSecondary);
    root.style.setProperty('--fos-accent', palette.accentColor);
    root.style.setProperty('--fos-accent-fg', palette.accentForeground);
    root.style.setProperty('--fos-positive', palette.positiveColor);
    root.style.setProperty('--fos-negative', palette.negativeColor);
    root.style.setProperty('--fos-warning', palette.warningColor);
    root.style.setProperty('--fos-radius', palette.radiusPx);
    root.style.setProperty('--fos-radius-sm', palette.radiusSmPx);
    root.style.setProperty('--fos-gap', palette.densityGap);
    root.style.setProperty('--fos-pad', palette.densityPad);
    root.style.setProperty('--fos-row-h', palette.rowHeight);

    const fontDisplayMap = {
      mono: '"JetBrains Mono", monospace',
      outfit: '"Outfit", "Plus Jakarta Sans", sans-serif',
      jakarta: '"Plus Jakarta Sans", sans-serif',
    };
    const fontBodyMap = {
      mono: '"JetBrains Mono", monospace',
      jakarta: '"Plus Jakarta Sans", sans-serif',
    };
    root.style.setProperty('--fos-font-display', fontDisplayMap[palette.preset.fontDisplay]);
    root.style.setProperty('--fos-font-body', fontBodyMap[palette.preset.fontBody]);
  }
  return palette;
}
