import { createElement, render, type FunctionComponent } from 'preact';
import { describe, expect, it } from 'vitest';
import { art } from '../art';
import { missions } from './index';
import { playground } from './playground';
import { season1Missions } from './season1';
import { sidekicks } from './sidekicks';

const PLAYGROUND_ART_KEYS = ['playground-door', 'badge-egg'];

interface ArtReference {
  key: string;
  path: string;
}

function collectArt(value: unknown, path: string): ArtReference[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => collectArt(item, `${path}[${index}]`));
  }
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([property, child]) => {
    const childPath = `${path}.${property}`;
    if (property === 'art' && typeof child === 'string') {
      return [{ key: child, path: childPath }];
    }
    return collectArt(child, childPath);
  });
}

describe('art registry', () => {
  it('finds art keys inside nested objects and arrays', () => {
    const data = { steps: [{ config: { targets: [{ art: 'test-key', label: 'Skip' }] } }] };
    expect(collectArt(data, 'mission')).toEqual([
      { key: 'test-key', path: 'mission.steps[0].config.targets[0].art' },
    ]);
    expect(collectArt({ art: null, label: 'test-key' }, 'mission')).toEqual([]);
  });

  it('registers every art key used by sidekicks, missions and Season 1', () => {
    const references = [
      ...sidekicks.flatMap((sidekick) => collectArt(sidekick, `sidekicks[${sidekick.id}]`)),
      ...missions.flatMap((mission) => collectArt(mission, `missions[${mission.id}]`)),
      ...season1Missions.flatMap((mission) => collectArt(mission, `season1Missions[${mission.id}]`)),
    ];
    for (const { key, path } of references) {
      expect(Object.hasOwn(art, key), `Missing art key "${key}" at ${path}`).toBe(true);
    }
  });

  it('registers the fixed playground keys and any art used by playground data', () => {
    for (const key of PLAYGROUND_ART_KEYS) {
      expect(Object.hasOwn(art, key), `Missing playground art key "${key}"`).toBe(true);
    }
    if (playground !== null) {
      for (const { key, path } of collectArt(playground, 'playground')) {
        expect(Object.hasOwn(art, key), `Missing art key "${key}" at ${path}`).toBe(true);
      }
    }
  });

  for (const [key, ArtPiece] of Object.entries(art)) {
    const Component = ArtPiece as FunctionComponent<{ size?: number; title?: string }>;
    it(`${key} renders an inline SVG without throwing`, () => {
      expect(typeof Component).toBe('function');
      const container = document.createElement('div');
      try {
        expect(() => render(createElement(Component, {}), container)).not.toThrow();
        const svg = container.querySelector('svg');
        expect(svg).not.toBeNull();
        expect(svg?.getAttribute('viewBox')).toBeTruthy();
        expect(svg?.getAttribute('role')).toBe('img');
        expect(svg?.querySelector('title')?.textContent).toBeTruthy();
        render(createElement(Component, { size: 64, title: 'Your helpful pal' }), container);
        expect(container.querySelector('svg')?.getAttribute('width')).toBe('64');
        expect(container.querySelector('svg')?.getAttribute('height')).toBe('64');
        expect(container.querySelector('title')?.textContent).toBe('Your helpful pal');
      } finally {
        render(null, container);
      }
    });
  }
});
