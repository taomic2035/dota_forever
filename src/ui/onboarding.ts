/**
 * 开局操作引导:可关闭的提示面板(键位 + 关键机制),降低上手门槛。
 * 玩家实测反馈「不知道怎么操作」——本面板开局短暂展示核心操作,点击/按键/超时即关闭。
 */
import { DEFAULT_CONTROL_SETTINGS, type ControlSettings } from '../engine/controlSettings';
import { buildOnboardingSections } from './onboardingModel';

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]!));
}

export function showOnboarding(parent: HTMLElement, settings: ControlSettings = DEFAULT_CONTROL_SETTINGS): void {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:55;',
    'width:min(760px,calc(100vw - 28px));background:linear-gradient(#10130bf4,#1a2012f4);border:1px solid #5a4a25;',
    'border-radius:10px;padding:14px 18px;color:#e8e2c8;font-size:13px;line-height:1.55;',
    'box-shadow:0 8px 28px rgba(0,0,0,.55);pointer-events:auto;',
  ].join('');
  const sections = buildOnboardingSections(settings);
  const sectionsHtml = sections.map((section) => `
      <div style="min-width:0">
        <div style="font-size:12px;font-weight:800;color:#ffd54f;margin-bottom:4px">${escapeHtml(section.title)}</div>
        ${section.items.map((item) => `
          <div style="margin:2px 0">
            <b style="color:#8fd17a">${escapeHtml(item.keys)}</b>
            <span>${escapeHtml(item.text)}</span>
          </div>
        `).join('')}
      </div>`).join('');
  el.innerHTML = `
    <div style="font-size:15px;font-weight:800;color:#ffd54f;margin-bottom:8px">操作速览 — 点「知道了」或按任意键关闭</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:8px 18px">
      ${sectionsHtml}
    </div>
    <div style="text-align:center;margin-top:10px">
      <button id="ob-ok" style="padding:5px 24px;border-radius:6px;border:1px solid #8fd17a;background:#8fd17a22;color:#9fe87a;font-weight:700;cursor:pointer">知道了</button>
    </div>`;
  parent.appendChild(el);

  let done = false;
  const close = () => {
    if (done) return;
    done = true;
    el.style.transition = 'opacity .4s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 450);
    window.removeEventListener('keydown', onKey);
  };
  const onKey = () => close();
  el.querySelector('#ob-ok')!.addEventListener('click', close);
  window.addEventListener('keydown', onKey);
  window.setTimeout(close, 18000); // 18s 后自动关闭
}
