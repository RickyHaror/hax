import { afterEach, describe, expect, it } from 'vitest';
import { client, fixtureRegistry } from './test/fixtures';
import { fakeDeps, identityStore, mount, unmount } from './test/helpers';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

describe('map chapters', () => {
  it('shows the coming soon message without empty chapter sections', async () => {
    const deps = fakeDeps(); deps.registry = fixtureRegistry([]);
    root = await mount(identityStore(deps));
    expect(root.textContent).toContain('Missions coming soon');
    expect(root.querySelectorAll('h2')).toHaveLength(0);
    expect(root.querySelectorAll('section[aria-label]')).toHaveLength(0);
  });

  it.each([
    ['login', 'Login'], ['bootcamp', 'Boot Camp'],
    ['terminal', 'Terminal Training'], ['missions', 'Missions'],
  ] as const)('shows only the populated %s chapter', async (chapter, title) => {
    const deps = fakeDeps(); deps.registry = fixtureRegistry([{ ...client, chapter }]);
    root = await mount(identityStore(deps));
    expect([...root.querySelectorAll('h2')].map((heading) => heading.textContent)).toEqual([title]);
    const sections = root.querySelectorAll('section[aria-label]');
    expect(sections).toHaveLength(1);
    expect(sections[0]?.getAttribute('aria-label')).toBe(title);
    expect(sections[0]?.textContent).toContain(client.title);
    expect(root.textContent).not.toContain('Missions coming soon');
  });
});
