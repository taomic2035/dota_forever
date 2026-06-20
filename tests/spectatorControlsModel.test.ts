import { describe, expect, it } from 'vitest';
import { buildSpectatorControlsModel } from '../src/ui/spectatorControlsModel';
import { Team } from '../src/sim/map';

describe('spectatorControlsModel', () => {
  it('builds pause, speed, follow, and fog perspective controls', () => {
    const model = buildSpectatorControlsModel({
      enabled: true,
      paused: false,
      speed: 2,
      minSpeed: 0.5,
      maxSpeed: 8,
      following: false,
      followTargets: [
        { id: 1, name: '黎明剑士', kind: 'hero', team: Team.Dawn },
        { id: 2, name: '永夜法师', kind: 'hero', team: Team.Night },
      ],
      followTargetId: 1,
      viewerTeam: null,
      playerTeam: Team.Dawn,
    });

    expect(model.visible).toBe(true);
    expect(model.summary).toBe('LIVE · 2x · 全视野 · 跟随 黎明剑士');
    expect(model.actions).toEqual([
      expect.objectContaining({ id: 'togglePause', label: '暂停', enabled: true, tone: 'normal' }),
      expect.objectContaining({ id: 'slower', label: '- 速度', enabled: true }),
      expect.objectContaining({ id: 'faster', label: '+ 速度', enabled: true }),
      expect.objectContaining({ id: 'toggleFollow', label: '跟随 黎明剑士', enabled: true, active: false }),
      expect.objectContaining({ id: 'cycleFollowTarget', label: '下个目标', enabled: true }),
      expect.objectContaining({ id: 'cycleFog', label: '全视野', enabled: true, active: true }),
    ]);
  });

  it('disables impossible speed edges and explains current fog perspective', () => {
    const model = buildSpectatorControlsModel({
      enabled: true,
      paused: true,
      speed: 8,
      minSpeed: 0.5,
      maxSpeed: 8,
      following: true,
      followTargets: [
        { id: 2, name: '永夜法师', kind: 'hero', team: Team.Night },
      ],
      followTargetId: 2,
      viewerTeam: Team.Night,
      playerTeam: Team.Dawn,
    });

    expect(model.summary).toBe('PAUSED · 8x · 永夜视角 · 跟随 永夜法师');
    expect(model.actions.find((action) => action.id === 'faster')).toMatchObject({
      enabled: false,
      reason: '已是最快',
    });
    expect(model.actions.find((action) => action.id === 'toggleFollow')).toMatchObject({
      active: true,
      label: '取消跟随',
    });
    expect(model.actions.find((action) => action.id === 'cycleFollowTarget')).toMatchObject({
      enabled: false,
      reason: '没有其他可跟随目标',
    });
    expect(model.actions.find((action) => action.id === 'cycleFog')).toMatchObject({
      label: '永夜视角',
      detail: '点击切换雾视角',
    });
  });

  it('stays hidden outside spectate/debug mode', () => {
    expect(buildSpectatorControlsModel({
      enabled: false,
      paused: false,
      speed: 1,
      minSpeed: 0.5,
      maxSpeed: 8,
      following: false,
      followTargets: [],
      viewerTeam: Team.Dawn,
      playerTeam: Team.Dawn,
    })).toEqual({
      visible: false,
      summary: '',
      actions: [],
    });
  });
});
