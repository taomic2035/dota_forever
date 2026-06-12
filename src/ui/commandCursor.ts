import type { UxFeedback } from './uxFeedback';
import { commandMessageVisual, cursorIntentVisual, renderCursorBadge } from './commandCursorTheme';

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

    const intentHtml = intent ? renderCursorBadge(intent.label, cursorIntentVisual(intent)) : '';
    const messageHtml = message ? renderCursorBadge(message.label, commandMessageVisual(message), 'message') : '';
    this.root.style.transform = `translate(${Math.round(pos.x + 16)}px,${Math.round(pos.y + 18)}px)`;
    this.root.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:flex-start;gap:3px;">
        ${intentHtml}
        ${messageHtml}
      </div>`;
  }
}
