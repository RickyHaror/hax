import { describe, expect, it } from 'vitest';
import type { Position, Screen } from '../store';
import { isSafeMoment } from './safe';

const phases: Position['phase'][] = ['intro', 'permission', 'step', 'success', 'outro'];
const screens: Screen[] = [
  { name: 'map' }, { name: 'settings' },
  { name: 'done', missionId: 'client' }, { name: 'stop' }, { name: 'savecode' },
];

describe('safe update moments', () => {
  it.each(phases)('defers updates during playground free play with a %s position', (phase) => {
    expect(isSafeMoment({ name: 'playground' }, { phase, index: 0 })).toBe(false);
  });
  it.each(screens.flatMap((screen) => phases.map((phase) => ({ screen, phase }))))(
    'allows $screen.name with a saved $phase position', ({ screen, phase }) => {
      expect(isSafeMoment(screen, { phase, index: 1 })).toBe(true);
    },
  );
  it.each(phases)('defers through onboarding with a %s position', (phase) => {
    expect(isSafeMoment({ name: 'onboarding' }, { phase, index: 0 })).toBe(false);
  });
  it.each([
    ['intro', true], ['permission', false], ['step', false], ['success', true], ['outro', true],
  ] as const)('allows player and start phase %s: %s', (phase, expected) => {
    expect(isSafeMoment({ name: 'player', missionId: 'client' }, { phase, index: 1 })).toBe(expected);
    expect(isSafeMoment({ name: 'start' }, { phase, index: 1 })).toBe(expected);
  });
});
