import { readFileSync } from 'node:fs';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { client, fixtureRegistry } from './test/fixtures';
import { click, fakeDeps, identityStore, mount, unmount } from './test/helpers';
import { createStore } from './store';

let root: HTMLElement;
let styles: HTMLStyleElement;
beforeEach(() => {
  styles = document.createElement('style');
  styles.textContent = readFileSync('src/styles/base.css', 'utf8');
  document.head.append(styles);
});
afterEach(async () => { if (root) await unmount(root); styles.remove(); });

describe('scroll containers and announcements', () => {
  it('keeps the login clue, spoken question, password and Check together', async () => {
    root = await mount(createStore(fakeDeps())); await click(root, 'Tap to begin, Agent!');
    const login = root.querySelector<HTMLElement>('.login-screen')!;
    expect(login.querySelector('.login-art svg[role="img"]')).toBeTruthy();
    expect(login.querySelector('.answer-form .speech-line')?.textContent).toContain('Read the note.');
    expect(login.querySelector('.answer-form button[aria-label="Read aloud"]')).toBeTruthy();
    expect(login.querySelector('input[aria-label="Password"], label input')).toBeTruthy();
    expect([...login.querySelectorAll('button')].some((b) => b.textContent === 'Check')).toBe(true);
  });

  it('keeps the empty update region rendered and reveals updates in the same region', async () => {
    const store = identityStore(); root = await mount(store); await click(root, 'Tap to begin, Agent!');
    const region = root.querySelector<HTMLElement>('.panel > [role="status"]')!;
    const empty = getComputedStyle(region);
    expect(empty.display).not.toBe('none');
    expect(empty.visibility).not.toBe('hidden');
    expect(empty.position).toBe('absolute');
    expect(empty.width).toBe('1px');
    expect(empty.height).toBe('1px');
    await act(() => { store.updatePending.value = true; });
    expect(root.querySelector('.panel > [role="status"]')).toBe(region);
    expect(region.textContent).toContain('New missions arrived!');
    expect(getComputedStyle(region).position).not.toBe('absolute');
    expect(region.querySelector('button[aria-label="Read aloud"]')).toBeTruthy();
  });

  it('contains absolute read aloud labels inside each scrolling player column', async () => {
    const store = identityStore(); store.openMission(client.id);
    store.phase(client.id, { phase: 'step', index: 1 });
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    for (const selector of ['.panel', '.step-story', '.step-work']) {
      const container = root.querySelector<HTMLElement>(selector)!;
      expect(container.querySelector('.visually-hidden')).toBeTruthy();
      expect(getComputedStyle(container).position).toBe('relative');
    }
  });
});

describe('map chapters', () => {
  it('shows the coming soon message without empty chapter sections', async () => {
    const deps = fakeDeps(); deps.registry = fixtureRegistry([]);
    root = await mount(identityStore(deps)); await click(root, 'Tap to begin, Agent!');
    expect(root.textContent).toContain('Missions coming soon');
    expect(root.querySelectorAll('h2')).toHaveLength(0);
    expect(root.querySelectorAll('section[aria-label]')).toHaveLength(0);
  });

  it.each([
    ['login', 'Login'], ['bootcamp', 'Boot Camp'],
    ['terminal', 'Terminal Training'], ['missions', 'Missions'],
  ] as const)('shows only the populated %s chapter', async (chapter, title) => {
    const deps = fakeDeps(); deps.registry = fixtureRegistry([{ ...client, chapter }]);
    root = await mount(identityStore(deps)); await click(root, 'Tap to begin, Agent!');
    expect([...root.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([title]);
    const sections = root.querySelectorAll('section[aria-label]');
    expect(sections).toHaveLength(1);
    expect(sections[0]?.getAttribute('aria-label')).toBe(title);
    expect(sections[0]?.textContent).toContain(client.title);
    expect(root.textContent).not.toContain('Missions coming soon');
  });
});
