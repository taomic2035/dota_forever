import { describe, expect, it } from 'vitest';
import { hudAccessibilityPalette } from '../src/ui/accessibilityPalette';

describe('hudAccessibilityPalette', () => {
  it('keeps the existing standard HP/MP colors by default', () => {
    expect(hudAccessibilityPalette('standard')).toMatchObject({
      health: { fg: '#4caf50', bg: '#1f6b2b' },
      mana: { fg: '#42a5f5', bg: '#14569a' },
      dangerVignette: 'rgba(200,10,10,0.85)',
    });
  });

  it('uses distinct high-contrast colors in colorblind mode', () => {
    expect(hudAccessibilityPalette('colorblind')).toMatchObject({
      health: { fg: '#e69f00', bg: '#5f3f00' },
      mana: { fg: '#0072b2', bg: '#073f63' },
      dangerVignette: 'rgba(204,121,167,0.85)',
    });
  });
});
