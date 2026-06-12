import { describe, expect, it } from 'vitest';
import { cursorTargetHintFor } from '../src/ui/cursorTargetHint';

describe('cursor target hint derivation', () => {
  it('treats point, area, and line targeting as ground commands', () => {
    expect(cursorTargetHintFor('point')).toBe('ground');
    expect(cursorTargetHintFor('area')).toBe('ground');
    expect(cursorTargetHintFor('line')).toBe('ground');
  });

  it('keeps explicit unit target team semantics', () => {
    expect(cursorTargetHintFor('unit', 'enemy')).toBe('enemy');
    expect(cursorTargetHintFor('unit', 'ally')).toBe('ally');
    expect(cursorTargetHintFor('unit', 'allyOrSelf')).toBe('allyOrSelf');
    expect(cursorTargetHintFor('unit', 'self')).toBe('self');
  });

  it('falls back unannotated unit targeting to any-unit semantics', () => {
    expect(cursorTargetHintFor('unit')).toBe('any');
  });

  it('does not assign a target hint to immediate or passive commands', () => {
    expect(cursorTargetHintFor('none')).toBeUndefined();
    expect(cursorTargetHintFor('passive')).toBeUndefined();
  });
});
