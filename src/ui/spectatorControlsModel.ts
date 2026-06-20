import { Team } from '../sim/map';

export type SpectatorControlActionId = 'togglePause' | 'slower' | 'faster' | 'toggleFollow' | 'cycleFollowTarget' | 'cycleFog';
export type SpectatorControlTone = 'normal' | 'active' | 'disabled' | 'danger';

export interface SpectatorControlAction {
  id: SpectatorControlActionId;
  label: string;
  detail: string;
  enabled: boolean;
  active?: boolean;
  reason?: string;
  tone: SpectatorControlTone;
}

export interface SpectatorControlsModel {
  visible: boolean;
  summary: string;
  actions: SpectatorControlAction[];
}

export interface SpectatorControlsInput {
  enabled: boolean;
  paused: boolean;
  speed: number;
  minSpeed: number;
  maxSpeed: number;
  following: boolean;
  followTargets?: SpectatorFollowTargetInput[];
  followTargetId?: number;
  viewerTeam: Team | null;
  playerTeam: Team;
}

export interface SpectatorFollowTargetInput {
  id: number;
  name: string;
  kind: string;
  team: Team;
}

export function buildSpectatorControlsModel(input: SpectatorControlsInput): SpectatorControlsModel {
  if (!input.enabled) return { visible: false, summary: '', actions: [] };

  const speed = normalizeSpeed(input.speed);
  const fog = fogLabel(input.viewerTeam, input.playerTeam);
  const atMin = speed <= input.minSpeed + 0.001;
  const atMax = speed >= input.maxSpeed - 0.001;
  const followTargets = input.followTargets ?? [];
  const followTarget = currentFollowTarget(followTargets, input.followTargetId);
  const followName = followTarget?.name ?? '玩家英雄';
  const canCycleFollowTarget = followTargets.length > 1;

  return {
    visible: true,
    summary: `${input.paused ? 'PAUSED' : 'LIVE'} · ${formatSpeed(speed)} · ${fog} · 跟随 ${followName}`,
    actions: [
      {
        id: 'togglePause',
        label: input.paused ? '继续' : '暂停',
        detail: input.paused ? '继续模拟' : '暂停模拟',
        enabled: true,
        active: input.paused,
        tone: input.paused ? 'danger' : 'normal',
      },
      {
        id: 'slower',
        label: '- 速度',
        detail: '降低观战速度',
        enabled: !atMin,
        reason: atMin ? '已是最慢' : undefined,
        tone: atMin ? 'disabled' : 'normal',
      },
      {
        id: 'faster',
        label: '+ 速度',
        detail: '提高观战速度',
        enabled: !atMax,
        reason: atMax ? '已是最快' : undefined,
        tone: atMax ? 'disabled' : 'normal',
      },
      {
        id: 'toggleFollow',
        label: input.following ? '取消跟随' : `跟随 ${followName}`,
        detail: input.following ? `解除镜头跟随 ${followName}` : `跟随 ${followName}`,
        enabled: true,
        active: input.following,
        tone: input.following ? 'active' : 'normal',
      },
      {
        id: 'cycleFollowTarget',
        label: '下个目标',
        detail: canCycleFollowTarget ? '切换观战跟随目标' : '需要至少两个可跟随目标',
        enabled: canCycleFollowTarget,
        reason: canCycleFollowTarget ? undefined : '没有其他可跟随目标',
        tone: canCycleFollowTarget ? 'normal' : 'disabled',
      },
      {
        id: 'cycleFog',
        label: fog,
        detail: '点击切换雾视角',
        enabled: true,
        active: true,
        tone: 'active',
      },
    ],
  };
}

function currentFollowTarget(targets: SpectatorFollowTargetInput[], id: number | undefined): SpectatorFollowTargetInput | undefined {
  if (id !== undefined) {
    const selected = targets.find((target) => target.id === id);
    if (selected) return selected;
  }
  return targets[0];
}

function normalizeSpeed(speed: number): number {
  return Number.isFinite(speed) && speed > 0 ? speed : 1;
}

function formatSpeed(speed: number): string {
  return `${Number.isInteger(speed) ? speed.toFixed(0) : speed.toFixed(1)}x`;
}

function fogLabel(viewerTeam: Team | null, playerTeam: Team): string {
  if (viewerTeam === null) return '全视野';
  if (viewerTeam === Team.Dawn) return '晨曦视角';
  if (viewerTeam === Team.Night) return '永夜视角';
  return viewerTeam === playerTeam ? '己方视角' : '指定视角';
}
