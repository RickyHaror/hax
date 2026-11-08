import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Line } from '../../engine/types';
import { art } from '../../art';
import { sidekicks } from '../../missions/sidekicks';
import { StoreContext } from '../store';
import { client } from '../test/fixtures';
import { click, fakeDeps, identityStore, unmount } from '../test/helpers';
import { SidekickBubble, SpeakerLines } from './SidekickBubble';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

async function show(lines: readonly Line[], index = 1, withClient = true) {
  const buddyArt = vi.fn(art[sidekicks[index]!.art]!);
  const clientArt = vi.fn(art['client-m1-pizza']!);
  const deps = fakeDeps(); deps.registry = { ...deps.registry, sidekicks,
    art: { ...art, [sidekicks[index]!.art]: buddyArt, 'client-m1-pizza': clientArt } };
  const customer = withClient ? { ...client.client!, art: 'client-m1-pizza' } : undefined;
  const store = identityStore(deps); store.identify(0, 1, index);
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<StoreContext.Provider value={store}>
    <SidekickBubble lines={lines} client={customer} bySpeaker />
  </StoreContext.Provider>, root));
  return { deps, store, buddyArt, clientArt };
}

function groupFor(text: string) {
  const line = [...root.querySelectorAll('.speech-line')].find((element) =>
    element.querySelector('span')?.textContent === text)!;
  return line.closest('section')!;
}

describe('speaker portraits', () => {
  it('opts out of automatic speech and cleanup without losing per-line reading', async () => {
    const deps = fakeDeps(); deps.registry = { ...deps.registry, sidekicks };
    const store = identityStore(deps);
    root = document.createElement('div'); document.body.append(root);
    const show = async (index: number) => act(() => render(<StoreContext.Provider value={store}>
      <SidekickBubble lines={sidekicks[index]!.greeting} sidekickIndex={index} autoRead={false} />
    </StoreContext.Provider>, root));
    vi.mocked(deps.voice.cancel).mockClear();
    await show(0);
    await show(1);
    expect(deps.voice.speakAll).not.toHaveBeenCalled();
    expect(deps.voice.cancel).not.toHaveBeenCalled();
    await click(root, 'Read aloud');
    expect(deps.voice.speak).toHaveBeenLastCalledWith(sidekicks[1]!.greeting[0],
      expect.objectContaining({ sidekick: sidekicks[1]!.id }));
    store.voice.speakAll([{ text: 'Keep reading.', speaker: 'narrator' }]);
    vi.mocked(deps.voice.cancel).mockClear();
    await unmount(root);
    expect(deps.voice.cancel).not.toHaveBeenCalled();
  });

  it('groups consecutive speakers, names the chosen art and hides repeated portraits', async () => {
    const lines: Line[] = [
      { text: 'Hello, Agent!' }, { text: 'We can help.', speaker: 'sidekick' },
      { text: 'Our box is stuck.', speaker: 'client' }, { text: 'Please help.', speaker: 'client' },
      { text: 'The box glows.', speaker: 'narrator' }, { text: 'I can help.', speaker: 'player' },
      { text: 'Let us try!' }, { text: 'Thank you.', speaker: 'client' },
    ];
    const { buddyArt, clientArt } = await show(lines);
    expect(buddyArt).toHaveBeenCalled();
    expect(clientArt).toHaveBeenCalled();
    const buddy = groupFor('Hello, Agent!');
    expect(buddy).toBe(groupFor('We can help.'));
    expect(buddy.getAttribute('aria-label')).toBe('Pixel says');
    expect(buddy.querySelector('svg[role="img"] title')?.textContent).toBe('Pixel');
    expect(buddy.querySelector('svg[role="img"]')?.getAttribute('width')).toBe('88');
    const customer = groupFor('Our box is stuck.');
    expect(customer).toBe(groupFor('Please help.'));
    expect(customer.querySelector('svg[role="img"] title')?.textContent).toBe('Pizza Pals');
    expect(groupFor('The box glows.').querySelector('[role="img"]')).toBeNull();
    expect(groupFor('I can help.').querySelector('[role="img"]')).toBeNull();
    for (const text of ['Let us try!', 'Thank you.']) {
      expect(groupFor(text).querySelector('[aria-hidden="true"] [role="img"]')).toBeTruthy();
    }
    expect(root.querySelectorAll('button[aria-label="Read aloud"]')).toHaveLength(lines.length);
  });

  it.each([0, 1, 2])('keeps every line and its voice for sidekick %s', async (index) => {
    const lines: Line[] = [
      { text: 'Read this.', say: 'Read the clue.' }, { text: 'Our clue.', speaker: 'client' },
      { text: 'A note.', speaker: 'narrator' }, { text: 'My turn.', speaker: 'player' },
    ];
    const { deps, buddyArt } = await show(lines, index);
    expect(buddyArt).toHaveBeenCalled();
    expect(groupFor('Read this.').querySelector('title')?.textContent).toBe(sidekicks[index]!.name);
    expect(deps.voice.speakAll).toHaveBeenCalledWith(lines);
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('button[aria-label="Read aloud"]')];
    for (const [i, button] of buttons.entries()) {
      await act(() => button.click());
      expect(deps.voice.speak).toHaveBeenLastCalledWith(lines[i],
        expect.objectContaining({ sidekick: sidekicks[index]!.id }));
    }
  });

  it('leaves client lines without art when no client exists', async () => {
    await show([{ text: 'Hello.', speaker: 'client' }], 1, false);
    expect(root.querySelector('[role="img"]')).toBeNull();
    expect(root.querySelectorAll('button[aria-label="Read aloud"]')).toHaveLength(1);
  });

  it('uses the smaller portrait for a compact hint without starting audio', async () => {
    const { store, deps } = await show([]);
    await act(() => render(<StoreContext.Provider value={store}>
      <SpeakerLines lines={[{ text: 'Try the clue.' }]} compact />
    </StoreContext.Provider>, root));
    expect(root.querySelector('svg[role="img"]')?.getAttribute('width')).toBe('64');
    expect(root.querySelector('title')?.textContent).toBe('Pixel');
    expect(root.querySelector('button[aria-label="Read aloud"]')).toBeTruthy();
    expect(deps.voice.speakAll).toHaveBeenCalledTimes(1);
  });
});
