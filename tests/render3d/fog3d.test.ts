import { describe, it, expect } from 'vitest';
import { GameMap, Team } from '../../src/sim/map';
import { createWorld } from '../../src/sim/setup';
import { Fog3D } from '../../src/render3d/fog3d';

describe('Fog3D', () => {
  it('builds a hidden fog mesh, reveals + updates it per viewer team, hides in spectate', () => {
    const map = new GameMap();
    const fog = new Fog3D(map);
    expect(fog.mesh).toBeTruthy();
    expect(fog.mesh.visible).toBe(false); // 默认隐藏,update 才按 viewerTeam 开启

    const w = createWorld(map, { seed: 1, startTime: 60 });
    for (let i = 0; i < 10; i++) w.step(); // 让 vision 计算(每 8 tick 重算)

    fog.update(w, Team.Dawn, 100);
    expect(fog.mesh.visible).toBe(true); // 有观察队伍 → 显示纱罩

    fog.update(w, null, 200);
    expect(fog.mesh.visible).toBe(false); // 观战(无队伍)→ 隐藏,全可见

    fog.dispose();
  });
});
