/**
 * 公屏播报:一血 / 连杀里程碑(大杀特杀…超越神迹)的中央大字 + 弹入淡出。
 * 纯展示,消费 world 事件(first_blood / hero_kill 含 streakText);全局(含敌方,作预警)。
 */
import type { World } from '../sim/world';
import type { AudioDirector } from '../audio/director';
import { buildAnnouncements, type AnnouncementAudioCue } from './announceModel';

export class Announce {
  private root: HTMLElement;
  private hideAt = 0;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%) scale(1);',
      'pointer-events:none;z-index:80;opacity:0;transition:opacity .4s, transform .25s;',
      'font-weight:800;font-size:34px;letter-spacing:2px;text-align:center;',
      'text-shadow:0 2px 8px #000,0 0 18px currentColor;white-space:nowrap;',
    ].join('');
    parent.appendChild(this.root);
  }

  private show(text: string, color: string): void {
    this.root.textContent = text;
    this.root.style.color = color;
    this.root.style.opacity = '1';
    this.root.style.transform = 'translate(-50%,-50%) scale(1.18)';
    // 下一帧回落到 1.0(弹入手感)
    requestAnimationFrame(() => { this.root.style.transform = 'translate(-50%,-50%) scale(1)'; });
    this.hideAt = performance.now() + 2400;
  }

  /** 每帧:到期淡出。 */
  update(): void {
    if (this.hideAt && performance.now() >= this.hideAt && this.root.style.opacity !== '0') {
      this.root.style.opacity = '0';
      this.hideAt = 0;
    }
  }

  /** 每 step 消费事件:一血 / 连杀里程碑 / 信使死亡。 */
  consume(world: World, audio?: AudioDirector, viewerTeam: number | null = null): void {
    const [announcement] = buildAnnouncements({
      viewerTeam,
      events: world.events,
      units: [...world.units.values()].map((unit) => ({
        id: unit.id,
        kind: unit.kind,
        team: unit.team,
        streak: unit.heroMeta?.streak,
      })),
    });
    if (!announcement) return;
    this.show(announcement.text, announcement.color);
    this.playAudioCue(audio, announcement.audioCue);
  }

  private playAudioCue(audio: AudioDirector | undefined, cue: AnnouncementAudioCue): void {
    if (cue === 'alert') audio?.alert();
    else audio?.announce();
  }
}
