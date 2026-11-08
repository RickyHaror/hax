// @vitest-environment jsdom
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { m3Zoo } from '../../missions/m3-zoo';
import { fixtureRegistry } from '../test/fixtures';
import { button, click, fakeDeps, fill, identityStore, mount, unmount } from '../test/helpers';

async function setup() {
  const deps = { ...fakeDeps(), registry: fixtureRegistry([m3Zoo]) };
  const store = identityStore(deps);
  const root = await mount(store); await click(root, 'Tap to begin, Agent!'); root.dataset.testToolbar = 'true';
  return { root, store };
}
afterEach(async () => {
  for (const root of document.querySelectorAll<HTMLElement>('[data-test-toolbar]')) await unmount(root);
});
async function key(key: string, shiftKey = false) {
  const event = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, cancelable: true });
  await act(() => { document.activeElement!.dispatchEvent(event); });
  return event;
}
describe('toolbar decoder wheel', () => {
  it('unlocks only when a completed mission contains a decoder step', async () => {
    const { root, store } = await setup();
    expect(root.textContent).not.toContain('Open decoder wheel');
    await act(() => { store.save({ ...store.progress.value, completed: { unknown: '2026-11-07' } }); });
    expect(root.textContent).not.toContain('Open decoder wheel');
    await act(() => { store.save({ ...store.progress.value, completed: { [m3Zoo.id]: '2026-11-07' } }); });
    expect(button(root, 'Open decoder wheel')).not.toBeNull();
  });
  it('keeps the wheel hidden after a mission without decoder steps', async () => {
    const store = identityStore(); const root = await mount(store); await click(root, 'Tap to begin, Agent!'); root.dataset.testToolbar = 'true';
    await act(() => { store.complete('client'); });
    expect(root.textContent).not.toContain('Open decoder wheel');
  });
  it('opens an in-page modal, decodes text, and restores focus after Escape', async () => {
    const { root, store } = await setup();
    await act(() => { store.save({ ...store.progress.value, completed: { [m3Zoo.id]: '2026-11-07' } }); });
    const opener = button(root, 'Open decoder wheel'); opener.focus();
    await click(root, 'Open decoder wheel');
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-label')).toBe('Decoder wheel');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(opener.inert).toBe(true);
    await fill(dialog, 'Secret message', 'Cde!');
    await click(dialog, 'Turn right'); await click(dialog, 'Turn right');
    expect(dialog.querySelector('[aria-label="Decoded message"]')?.textContent).toContain('Abc!');
    expect(root.querySelector('main')!.inert).toBe(true);
    await key('Escape');
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(opener);
    expect(opener.inert).toBeFalsy();
    expect(root.querySelector('main')!.inert).toBeFalsy();
  });
  it('traps Tab at both ends, closes with Close, and cleans up', async () => {
    const { root, store } = await setup();
    await act(() => { store.save({ ...store.progress.value, completed: { [m3Zoo.id]: '2026-11-07' } }); });
    const opener = button(root, 'Open decoder wheel'); await click(root, 'Open decoder wheel');
    const dialog = root.querySelector<HTMLElement>('[role="dialog"]')!;
    const targets = [...dialog.querySelectorAll<HTMLElement>('button, input, [tabindex="0"]')];
    targets.at(-1)!.focus(); expect((await key('Tab')).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(targets[0]);
    expect((await key('Tab', true)).defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(targets.at(-1));
    await click(dialog, 'Close');
    expect(root.querySelector('[role="dialog"]')).toBeNull(); expect(document.activeElement).toBe(opener);
    expect((await key('Tab')).defaultPrevented).toBe(false);
    await click(root, 'Open decoder wheel'); expect(root.querySelector('[role="dialog"]')).not.toBeNull();
    await click(root.querySelector<HTMLElement>('[role="dialog"]')!, 'Close');
    expect(document.activeElement).toBe(opener);
  });
});
