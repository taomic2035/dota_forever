/** 技能程序化图标(共享):按主导标签 + 家族色绘制 SVG。HUD 技能槽与英雄选择页共用。 */
import type { AbilityDef } from '../data/heroes/types';
import { fxStyle } from '../render/fxStyle';

export function abilityIconSvg(def: AbilityDef, size = 30): string {
  const c = fxStyle(def.key || def.name).color;
  const has = (t: string) => (def.tags as readonly string[]).includes(t);
  const s = `stroke="${c}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"`;
  let inner: string;
  if (has('stun')) inner = `<path ${s} d="M14 3 L8 13 L13 13 L10 21 L18 10 L13 10 Z"/>`;
  else if (has('heal')) inner = `<path ${s} d="M12 5 V19 M5 12 H19"/>`;
  else if (has('nuke')) inner = `<g ${s}><circle cx="12" cy="12" r="3.2" fill="${c}" stroke="none"/><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M5 5 L7 7 M19 5 L17 7 M5 19 L7 17 M19 19 L17 17"/></g>`;
  else if (has('slow')) inner = `<path ${s} d="M12 3 V21 M3.8 7.5 L20.2 16.5 M20.2 7.5 L3.8 16.5"/>`;
  else if (has('escape')) inner = `<path ${s} d="M4 12 H16 M11 7 L18 12 L11 17"/>`;
  else if (has('channel')) inner = `<path ${s} d="M7 4 H17 M7 20 H17 M8 4 C8 9 16 11 16 12 C16 13 8 15 8 20"/>`;
  else if (has('aoe')) inner = `<g ${s}><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/></g>`;
  else if (has('buff')) inner = `<path ${s} d="M6 13 L12 6 L18 13 M6 19 L12 12 L18 19"/>`;
  else if (has('orb')) inner = `<g ${s}><circle cx="12" cy="12" r="5.5" fill="${c}" stroke="none"/><circle cx="12" cy="12" r="9"/></g>`;
  else inner = `<circle cx="12" cy="12" r="7" ${s}/>`;
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" style="display:block">${inner}</svg>`;
}
