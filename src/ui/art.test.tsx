import { afterEach, describe, expect, it } from 'vitest';
import type { ArtComponent } from '../engine/types';
import { createStore } from './store';
import { client, fixtureRegistry, login } from './test/fixtures';
import { click, fakeDeps, identityStore, mount, unmount } from './test/helpers';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

function picture(label: string): ArtComponent {
  return ({ size, title }) => <svg width={size} height={size} role="img" aria-label={title}>
    <text>{label}</text>
  </svg>;
}

describe('step pictures', () => {
  it.each(['step-picture', 'missing-picture', undefined])('renders optional player art: %s', async (art) => {
    const step = { ...client.steps[0]!, art };
    const mission = { ...client, steps: [step] };
    const deps = fakeDeps(); deps.registry = fixtureRegistry([mission]);
    deps.registry.art = { 'step-picture': picture('Step picture') };
    const store = identityStore(deps);
    store.openMission(mission.id); store.phase(mission.id, { phase: 'step', index: 0 });
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    const image = root.querySelector(`[role="img"][aria-label="${step.title}"]`);
    if (!art) expect(image).toBeNull();
    else {
      expect(image).not.toBeNull();
      if (art === 'step-picture') expect(image?.textContent).toContain('Step picture');
      else expect(image?.textContent).not.toContain('Step picture');
    }
  });

  it.each([
    { art: 'login-screen', expected: 'Login picture' },
    { art: undefined, expected: 'Badge picture' },
    { art: 'missing-picture', expected: null },
  ])('chooses login art with a safe fallback: $art', async ({ art, expected }) => {
    const mission = { ...login, badge: { ...login.badge, art: 'badge-picture' },
      steps: [{ ...login.steps[0]!, art }] };
    const deps = fakeDeps(); deps.registry = fixtureRegistry([mission]);
    deps.registry.art = { 'login-screen': picture('Login picture'), 'badge-picture': picture('Badge picture') };
    root = await mount(createStore(deps)); await click(root, 'Tap to begin, Agent!');
    const image = root.querySelector(`[role="img"][aria-label="${mission.title}"]`);
    expect(image).not.toBeNull();
    if (expected) expect(image?.textContent).toContain(expected);
    else {
      expect(image?.textContent).not.toContain('Login picture');
      expect(image?.textContent).not.toContain('Badge picture');
    }
  });
});
