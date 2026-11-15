import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_PREFERENCES,
  THEME_LIST,
  getReadableForeground,
  preferencesFromPreset,
  resolveEffectivePalette,
} from './themes';

test('all 10 required themes are defined with complete properties', () => {
  assert.equal(THEME_LIST.length, 10);
  const ids = THEME_LIST.map((t) => t.id);
  for (const required of [
    'bloomberg',
    'tradingview',
    'apple_finance',
    'cyberpunk',
    'monochrome',
    'emerald',
    'midnight_blue',
    'light_professional',
    'glassmorphism',
    'amoled',
  ]) {
    assert.ok(ids.includes(required as typeof ids[number]), `Missing theme: ${required}`);
  }
});

test('getReadableForeground returns dark ink on bright backgrounds and white on dark', () => {
  assert.equal(getReadableForeground('#FFFFFF'), '#09090B');
  assert.equal(getReadableForeground('#FF9900'), '#09090B');
  assert.equal(getReadableForeground('#1D4ED8'), '#FFFFFF');
  assert.equal(getReadableForeground('#000000'), '#FFFFFF');
});

test('resolveEffectivePalette adapts surface and text when mode flips from preset default', () => {
  const lightBloomberg = {
    ...DEFAULT_PREFERENCES,
    mode: 'light' as const,
  };
  const palette = resolveEffectivePalette(lightBloomberg);
  assert.equal(palette.textPrimary, '#0F172A');
  assert.equal(palette.surfaceColor, '#FFFFFF');
});

test('preferencesFromPreset preserves chosen currency while switching theme defaults', () => {
  const prefs = preferencesFromPreset('light_professional', 'USD');
  assert.equal(prefs.themeId, 'light_professional');
  assert.equal(prefs.mode, 'light');
  assert.equal(prefs.currency, 'USD');
});
