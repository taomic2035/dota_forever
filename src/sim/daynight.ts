/** 昼夜循环:0:00 起白昼 5 分钟、黑夜 5 分钟交替;准备期为白昼。 */
import { DAY_LENGTH, NIGHT_LENGTH } from '../data/balance';
import type { World, WorldSystem } from './world';

export function isNightAt(time: number): boolean {
  if (time < 0) return false;
  const cycle = time % (DAY_LENGTH + NIGHT_LENGTH);
  return cycle >= DAY_LENGTH;
}

export function installDayNight(w: World): void {
  const system: WorldSystem = (world) => {
    const night = isNightAt(world.time);
    if (night !== world.isNight) {
      world.isNight = night;
      world.emit({ kind: 'fx', fx: night ? 'nightfall' : 'daybreak', pos: { x: 7520, y: 7520 } });
    }
  };
  w.systems.push(system);
}
