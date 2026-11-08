import { readFileSync } from 'node:fs';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { codenameLines, SIGNUP_PROMPT } from '../../engine/codename';
import { toSaveCode } from '../../engine/progress';
import { encodeSaveCode } from '../../engine/savecode';
import { createStore } from '../store';
import { button, click, fakeDeps, fill, identityStore, mount, unmount } from '../test/helpers';
import { BOOT_LINES } from './boot';

let root: HTMLElement;
let styles: HTMLStyleElement | undefined;
afterEach(async () => { if (root) await unmount(root); styles?.remove(); vi.unstubAllGlobals(); });

// The DOM test runner needs matching media rules applied explicitly.
function layoutStyles(width: number, height: number) {
  styles = document.createElement('style');
  styles.textContent = ['src/styles/base.css', 'src/ui/screens/player.css',
    'src/ui/screens/startup.css', 'src/ui/screens/map.css', 'src/ui/components/sidekick.css']
    .map((path) => readFileSync(path, 'utf8')).join('\n')
    .replaceAll('var(--font-mono)', 'monospace').replaceAll('var(--font-sans)', 'sans-serif');
  document.head.append(styles);
  const activeRules = [...styles.sheet!.cssRules].flatMap((rule) => {
    if (!(rule instanceof CSSMediaRule)) return [rule.cssText];
    const matches = rule.conditionText.split(' and ').every((condition) => {
      const match = /^\((min|max)-(width|height):\s*(\d+)px\)$/.exec(condition);
      if (!match) return false;
      const size = match[2] === 'width' ? width : height;
      return match[1] === 'min' ? size >= Number(match[3]) : size <= Number(match[3]);
    });
    return matches ? [...rule.cssRules].map((child) => child.cssText) : [];
  });
  styles.textContent = activeRules.join('\n');
}

it.each([[390, 844], [1366, 650], [1920, 1080]])(
  'keeps map reading controls in flow with usable targets at %ix%i', async (width, height) => {
    layoutStyles(width, height);
    const deps = fakeDeps();
    root = await mount(identityStore(deps)); await click(root, 'Tap to begin, Agent!');
    const cards = [...root.querySelectorAll('.map-card')];
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(getComputedStyle(card).display).toBe('flex');
      expect(getComputedStyle(card).flexDirection).toBe('column');
      const reader = card.querySelector<HTMLButtonElement>('[aria-label="Read aloud"]')!;
      const mission = card.querySelector<HTMLButtonElement>('.map-mission')!;
      for (const control of [reader, mission]) {
        const css = getComputedStyle(control);
        expect(['', 'static', 'relative']).toContain(css.position);
        expect(parseFloat(css.minWidth)).toBeGreaterThanOrEqual(44);
        expect(parseFloat(css.minHeight)).toBeGreaterThanOrEqual(44);
      }
      await act(() => reader.click());
      expect(deps.voice.speak).toHaveBeenLastCalledWith(
        { text: expect.stringContaining(mission.querySelector('.map-blurb')!.textContent!) }, expect.any(Object));
    }
  });

it('gives the phone codename its own unclipped line and fully hides the comms identity', async () => {
  layoutStyles(390, 844);
  const store = identityStore(); store.go({ name: 'start' });
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  const pill = root.querySelector('.agent-pill')!;
  const bar = getComputedStyle(root.querySelector('.top-bar')!);
  const name = getComputedStyle(pill);
  expect(pill.textContent).toBe('Brave Star');
  expect(bar.display).toBe('grid');
  expect(bar.height).toBe('auto');
  expect(name.gridRow).toBe('2');
  expect(name.whiteSpace).toBe('nowrap');
  expect(['', 'static', 'relative']).toContain(name.position);
  expect(name.overflow).not.toBe('hidden');
  expect(name.textOverflow).not.toBe('ellipsis');
  expect(getComputedStyle(root.querySelector('.comms-identity')!).display).toBe('none');
  expect(root.querySelector('[aria-label$="crew tech, on comms"]')).toBeTruthy();
});

it('keeps every phone boot tag at least 14px with per-line reading', async () => {
  layoutStyles(390, 844);
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  root = await mount(createStore(fakeDeps())); await click(root, 'Tap to begin, Agent!');
  const tags = [...root.querySelectorAll('.boot-tag')];
  expect(tags).toHaveLength(BOOT_LINES.length);
  for (const tag of tags) {
    expect(parseFloat(getComputedStyle(tag).fontSize)).toBeGreaterThanOrEqual(14);
    expect(tag.parentElement!.querySelector('[aria-label="Read aloud"]')).toBeTruthy();
  }
});

it('shows every boot line immediately under reduced motion with read aloud', async () => {
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
  root = await mount(createStore(fakeDeps())); await click(root, 'Tap to begin, Agent!');
  const boot = root.querySelector('.boot-lines')!;
  for (const { tag, line } of BOOT_LINES) {
    const entry = [...boot.children].find((element) => element.textContent?.includes(line.text))!;
    expect(entry.textContent).toContain(`[ ${tag} ]`);
    expect(entry.hasAttribute('hidden')).toBe(false);
    expect(entry.querySelector('[aria-label="Read aloud"]')).toBeTruthy();
  }
  expect(root.querySelector('h1')?.textContent).toBe('AGENT HQ');
});

it('offers the saved codename on Start and enters the map without login', async () => {
  const store = identityStore(); store.go({ name: 'start' });
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  const card = root.querySelector('[aria-label="Saved on this computer"]')!;
  expect(card.textContent).toContain('Brave Star');
  expect(root.querySelector('input')).toBeNull();
  await click(card as HTMLElement, 'Start'); expect(store.screen.value.name).toBe('map');
});

it('still goes straight into a returning game after Begin', async () => {
  const deps = fakeDeps(); identityStore(deps);
  const store = createStore(deps); root = await mount(store);
  await click(root, 'Tap to begin, Agent!');
  expect(store.screen.value.name).toBe('map');
  expect(root.querySelector('.hq-signin')).toBeNull();
});

it('reads the signup prompt and recorded name parts, then identifies picked indexes', async () => {
  const deps = fakeDeps(); deps.voice.speakParts = vi.fn();
  const store = createStore(deps); store.go({ name: 'onboarding' });
  const identify = vi.spyOn(store, 'identify');
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  expect(deps.voice.speakAll).toHaveBeenCalledExactlyOnceWith([SIGNUP_PROMPT]);
  await click(root, 'Swift'); await click(root, 'Pickle'); await click(root, 'Pixel');
  expect(button(root, 'Pixel').getAttribute('aria-label')).toBe('Pixel');
  expect(button(root, 'Swift').getAttribute('aria-pressed')).toBe('true');
  expect(button(root, 'Pickle').getAttribute('aria-pressed')).toBe('true');
  const preview = root.querySelector<HTMLElement>('.name-preview')!;
  await act(() => button(preview, 'Read aloud').click());
  expect(deps.voice.speakParts).toHaveBeenLastCalledWith(
    { text: 'Your name: Swift Pickle', speaker: 'narrator' }, codenameLines('Swift', 'Pickle'), expect.any(Object));
  await click(root, 'Next'); expect(identify).toHaveBeenCalledExactlyOnceWith(1, 2, 1);
});

it('restores through the prompt and returns Back to Start after an error', async () => {
  const source = identityStore(); const store = createStore(fakeDeps());
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  await click(root, 'I have a secret key'); await fill(root, 'Secret key', 'tiny');
  await click(root, 'Check'); expect(root.textContent).toContain('Your key looks too short or long.');
  await click(root, 'Back'); expect(store.screen.value.name).toBe('start');
  await click(root, 'I have a secret key');
  await fill(root, 'Secret key', toSaveCode(source.progress.value, source.registry.missions));
  await click(root, 'Check'); expect(store.screen.value.name).toBe('map');
  expect(store.progress.value.firstWord).toBe(0); expect(store.progress.value.secondWord).toBe(1);
});

it.each([
  ['v1', 'HAX-QRVQ-KEBZ-R8Q2', 0],
  ['v2', encodeSaveCode({ firstWord: 0, secondWord: 1, sidekick: 0,
    missionBits: 2 ** 47 + 2 ** 32 }), 2 ** 47 + 2 ** 32],
])('accepts a %s notebook key through the input', async (_version, code, extraBits) => {
  const store = createStore(fakeDeps());
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  await click(root, 'I have a secret key');
  await fill(root, 'Secret key', String(code)); await click(root, 'Check');
  expect(store.screen.value.name).toBe('map');
  expect(store.progress.value).toMatchObject({ firstWord: 0, secondWord: 1, sidekick: 0, extraBits });
});
