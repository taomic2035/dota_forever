import type { UxFeedback } from './uxFeedback';

export class CommandCursor {
  private root: HTMLDivElement;

  constructor(parent: HTMLElement) {
    this.root = document.createElement('div');
    this.root.style.cssText = [
      'position:fixed;left:0;top:0;z-index:60;pointer-events:none;',
      'font:700 11px "Segoe UI", Arial, sans-serif;letter-spacing:0;',
      'color:#f7f1d0;text-shadow:0 1px 2px #000;',
      'transform:translate(-999px,-999px);',
    ].join('');
    parent.appendChild(this.root);
  }

  update(now: number, ux: UxFeedback): void {
    const pos = ux.cursorPosition;
    const intent = ux.cursorIntentAt(now);
    const message = ux.commandMessageAt(now);
    if (!pos || (!intent && !message)) {
      this.root.style.transform = 'translate(-999px,-999px)';
      this.root.innerHTML = '';
      return;
    }

    const color = intent ? (intent.color ?? (
      intent.kind === 'attackmove' ? '#ffd45a' :
      intent.kind === 'item' ? '#d9b44a' :
      '#5aa2ff'
    )) : '#ff3040';
    const icon =
      !intent ? '!' :
      intent.kind === 'attackmove' ? '+' :
      intent.kind === 'item' ? 'I' :
      'Q';
    const intentHtml = intent ? `
      <div style="display:flex;align-items:center;gap:5px;background:#081006e8;border:1px solid ${color};border-radius:5px;padding:3px 7px;box-shadow:0 0 10px ${color}55;">
        <span style="display:flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:${color};color:#111;font-size:10px;">${icon}</span>
        <span style="white-space:nowrap">${intent.label}</span>
      </div>` : '';
    const messageColor = message?.color ?? '#ff3040';
    const messageHtml = message ? `
      <div style="display:flex;align-items:center;gap:5px;background:#160807ee;border:1px solid ${messageColor};border-radius:5px;padding:3px 7px;box-shadow:0 0 10px ${messageColor}66;color:#ffd6d6;">
        <span style="display:flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:${messageColor};color:#160807;font-size:11px;">!</span>
        <span style="white-space:nowrap">${message.label}</span>
      </div>` : '';
    this.root.style.transform = `translate(${Math.round(pos.x + 16)}px,${Math.round(pos.y + 18)}px)`;
    this.root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:3px;">
        ${intentHtml}
        ${messageHtml}
      </div>`;
  }
}
