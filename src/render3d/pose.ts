/**
 * 程序化动作姿态(纯数据,无 Three.js 依赖,可单测)。
 * 由 sim 字段(移动/前摇/施法/引导/死亡)推导各部件的局部旋转/位移。
 * 程序化模型与外部 3D 素材模型共用同一套动作驱动。
 */
export type AnimState = 'idle' | 'walk' | 'attack' | 'cast' | 'channel' | 'death';

export interface Pose {
  legL: number;        // 大腿绕 X 旋转(弧度)
  legR: number;
  armL: number;        // 上臂绕 X 旋转
  armR: number;
  torsoBob: number;    // 躯干 Y 微移(世界单位)
  torsoTwist: number;  // 躯干旋转强调攻击/施法方向
  rootSink: number;    // 死亡下沉 0..1
  weaponSwing: number; // 攻击挥砍附加角
  castGlow: number;    // 施法手部/武器发光强度 0..1+
  channelPulse: number; // 引导脉冲强度 0..1+
  hitFlash: number;    // 受击闪白强度 0..1
  stunOrbit: number;   // 眩晕星环相位/显隐强度
  invisibilityAlpha: number; // 隐身透明度建议值
}

export interface PoseInput {
  state: AnimState;
  t: number;        // 渲染时间(秒,连续)
  phase: number;    // 走路相位(累计移动距离 × 系数)
  progress: number; // 动作进度 0..1(攻击/死亡)
  status?: {
    hit?: boolean;
    stunned?: boolean;
    invisible?: boolean;
  };
}

export function poseFor(i: PoseInput): Pose {
  const p: Pose = {
    legL: 0, legR: 0, armL: 0, armR: 0,
    torsoBob: Math.sin(i.t * 2.2) * 0.6, // idle 呼吸
    torsoTwist: 0,
    rootSink: 0, weaponSwing: 0,
    castGlow: 0,
    channelPulse: 0,
    hitFlash: i.status?.hit ? 0.85 : 0,
    stunOrbit: i.status?.stunned ? 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(i.t * 8)) : 0,
    invisibilityAlpha: i.status?.invisible ? 0.42 : 1,
  };
  switch (i.state) {
    case 'walk': {
      const s = Math.sin(i.phase) * 0.6;
      p.legL = s; p.legR = -s;
      p.armL = -s * 0.8; p.armR = s * 0.8;
      p.torsoBob = Math.abs(Math.sin(i.phase)) * 1.2;
      return p;
    }
    case 'attack': {
      // 0→举起,0.5→下劈,1→收回
      p.weaponSwing = Math.sin(i.progress * Math.PI) * (i.progress < 0.5 ? -1 : 1) * 1.4;
      p.armR = -Math.sin(i.progress * Math.PI) * 1.2;
      p.torsoTwist = Math.sin(i.progress * Math.PI) * 0.18;
      return p;
    }
    case 'cast':
      p.armL = -1.2; p.armR = -1.2; p.torsoBob = Math.sin(i.t * 6) * 0.4;
      p.castGlow = 0.7 + 0.25 * (0.5 + 0.5 * Math.sin(i.t * 10));
      p.torsoTwist = 0.12 * Math.sin(i.t * 4);
      return p;
    case 'channel':
      p.armL = -1.0; p.armR = -1.0; p.torsoBob = Math.sin(i.t * 4) * 0.8;
      p.channelPulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(i.t * 9));
      p.castGlow = 0.45 + p.channelPulse * 0.55;
      return p;
    case 'death':
      p.rootSink = Math.min(1, i.progress); p.legL = 0.3; p.legR = 0.3;
      return p;
    default:
      return p; // idle
  }
}
