import type { AccessibilityMode } from '../engine/controlSettings';

export interface HudMeterPalette {
  fg: string;
  bg: string;
}

export interface HudAccessibilityPalette {
  health: HudMeterPalette;
  mana: HudMeterPalette;
  dangerVignette: string;
}

const STANDARD_PALETTE: HudAccessibilityPalette = {
  health: { fg: '#4caf50', bg: '#1f6b2b' },
  mana: { fg: '#42a5f5', bg: '#14569a' },
  dangerVignette: 'rgba(200,10,10,0.85)',
};

const COLORBLIND_PALETTE: HudAccessibilityPalette = {
  health: { fg: '#e69f00', bg: '#5f3f00' },
  mana: { fg: '#0072b2', bg: '#073f63' },
  dangerVignette: 'rgba(204,121,167,0.85)',
};

export function hudAccessibilityPalette(mode: AccessibilityMode): HudAccessibilityPalette {
  return mode === 'colorblind' ? COLORBLIND_PALETTE : STANDARD_PALETTE;
}
