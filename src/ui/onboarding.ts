/**
 * 开局操作引导:可关闭的提示面板(键位 + 关键机制),降低上手门槛。
 * 玩家实测反馈「不知道怎么操作」——本面板开局短暂展示核心操作,点击/按键/超时即关闭。
 */
export function showOnboarding(parent: HTMLElement): void {
  const el = document.createElement('div');
  el.style.cssText = [
    'position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:55;',
    'max-width:580px;background:linear-gradient(#10130bf4,#1a2012f4);border:1px solid #5a4a25;',
    'border-radius:10px;padding:14px 18px;color:#e8e2c8;font-size:13px;line-height:1.7;',
    'box-shadow:0 8px 28px rgba(0,0,0,.55);pointer-events:auto;',
  ].join('');
  el.innerHTML = `
    <div style="font-size:15px;font-weight:700;color:#ffd54f;margin-bottom:8px">操作速览 — 点「知道了」或按任意键关闭</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 18px">
      <span><b style="color:#8fd17a">右键</b> 移动 · <b style="color:#8fd17a">A+左键</b> 攻击指定点</span>
      <span><b style="color:#ffd45a">QWER</b> 技能(先点技能上的 <b style="color:#ffd54f">+</b> 学习)</span>
      <span><b style="color:#7ec8e3">1-6</b> 用物品 · <b style="color:#7ec8e3">T</b> 回城卷轴</span>
      <span><b style="color:#ffd45a">F</b> 商店(需站在<b>泉水/基地</b>范围内买)</span>
      <span><b style="color:#8fd17a">S</b> 停 · <b style="color:#8fd17a">H</b> 原地 · <b>空格</b> 镜头回英雄</span>
      <span><b style="color:#7ec8e3">Tab</b> 记分牌 · <b style="color:#7ec8e3">滚轮</b> 缩放 · <b>P</b> 暂停/设置</span>
      <span><b style="color:#ffb74d">Shift+点商店物品</b> 预购(顶栏看还差多少金)</span>
      <span><b style="color:#7fe3d0">点顶栏英雄头像</b> 镜头跳转 · 顶栏看双方血蓝/复活</span>
      <span><b style="color:#c39cff">P 菜单</b> 可调 HUD 缩放 / 施法模式 / 改键</span>
      <span><b style="color:#ef9a9a">阵亡面板</b> 看伤害来源 + 控制链(学习死因)</span>
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
