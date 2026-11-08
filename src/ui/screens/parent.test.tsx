import { webcrypto } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, expect, it, vi, type MockInstance } from 'vitest';
import { checkPin, loadProgress, setPin } from '../../engine/progress';
import { PLAYGROUND_KEY } from '../../engine/playground';
import { createStore, type AppStore } from '../store';
import { client, dependent } from '../test/fixtures';
import { button, click, fakeDeps, identityStore, mount, unmount } from '../test/helpers';

let root: HTMLElement;
let styles: HTMLStyleElement | undefined;
let digest: MockInstance<typeof webcrypto.subtle.digest>;
beforeEach(() => { vi.stubGlobal('crypto', webcrypto); digest = vi.spyOn(webcrypto.subtle, 'digest'); });
afterEach(async () => {
  if (root) await unmount(root);
  styles?.remove(); styles = undefined;
  vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers();
});
async function press(name: string) {
  const count = digest.mock.results.length;
  await act(async () => {
    button(root, name).click();
    for (const result of digest.mock.results.slice(count)) await result.value;
  });
}
async function digits(pin: string) { for (const digit of pin) await click(root, digit); }
async function setup(pin?: string, deps = fakeDeps()) {
  const store = identityStore(deps);
  if (pin) store.save(await setPin(store.progress.value, pin));
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  await open(store);
  return store;
}
async function open(store: AppStore) { await act(() => store.visit({ name: 'parent' })); }
async function signIn(pin = '1234') { await digits(pin); await press('Check PIN'); }
async function createPin(pin = '1234') {
  await digits(pin); await click(root, 'Next'); await digits(pin); await press('Save PIN');
}

it('sets a four digit PIN twice, handles mismatch, and never uses credential fields', async () => {
  const store = await setup();
  expect(root.textContent).toContain('Set a grown-up PIN');
  expect(root.querySelectorAll('input, form')).toHaveLength(0);
  expect(button(root, 'Next').disabled).toBe(true);
  await digits('1234'); await click(root, 'Next'); await digits('9999'); await press('Save PIN');
  expect(root.textContent).toContain('Those PINs differ. Try both again.');
  expect(store.progress.value.pin).toBeNull();
  await createPin();
  expect(root.textContent).toContain('Completed missions');
  expect(await checkPin(loadProgress(store.storage), '1234')).toBe(true);
  expect(store.progress.value.pin?.hash).toMatch(/^[\da-f]{64}$/);
  await click(root, 'Back'); expect(store.screen.value.name).toBe('map');
  await open(store); expect(root.textContent).not.toContain('Completed missions');
  await signIn(); expect(root.textContent).toContain('Completed missions');
});

it('Back abandons setup, unlock confirmation, reset confirmation and PIN changes', async () => {
  const store = await setup();
  const before = store.progress.value;
  await digits('1234'); await click(root, 'Next'); await click(root, 'Back');
  expect(store.progress.value).toBe(before);
  await open(store); await createPin();
  const saved = store.progress.value;
  await click(root, `Mark ${client.title} done`); await click(root, 'Back');
  expect(store.progress.value).toBe(saved);
  await open(store); await signIn(); await click(root, 'Reset all progress'); await click(root, 'Back');
  expect(store.progress.value).toBe(saved);
  await open(store); await signIn(); await click(root, 'Change PIN');
  await digits('9999'); await click(root, 'Next'); await click(root, 'Back');
  expect(store.progress.value).toBe(saved);
});

it('rejects wrong PINs and locks after five tries across closing and reopening', async () => {
  vi.useFakeTimers();
  let time = 0;
  const store = await setup('1234', { ...fakeDeps(), now: () => new Date(time) });
  for (let attempt = 0; attempt < 4; attempt++) {
    await signIn('0000'); expect(root.textContent).toContain('That PIN did not match. Try again.');
    expect(root.textContent).not.toContain('Completed missions');
  }
  await signIn('0000');
  expect(root.textContent).toContain('Please wait 30 seconds. Then try again.');
  expect(button(root, '1').disabled).toBe(true);
  await click(root, 'Back'); await open(store);
  expect(button(root, '1').disabled).toBe(true);
  expect(await store.parentAccess.check('1234')).toBe('locked');
  time = 29_999; await act(() => { vi.advanceTimersByTime(29_999); });
  expect(button(root, '1').disabled).toBe(true);
  time = 30_000; await act(() => { vi.advanceTimersByTime(1); });
  expect(button(root, '1').disabled).toBe(false);
  await signIn(); expect(root.textContent).toContain('Completed missions');
  await click(root, 'Back'); await open(store); await signIn('0000');
  expect(button(root, '1').disabled).toBe(false);
});

it('lists local completion dates and the highest hint rung and count per step', async () => {
  const store = await setup('1234');
  await act(() => {
    store.complete(client.id); store.hint(client.id, 'answer', 3); store.hint(client.id, 'answer', 1);
  });
  await open(store); await signIn();
  const completed = root.querySelector('[aria-label="Completed missions"]')!;
  expect(completed.textContent).toContain(client.title);
  expect(completed.textContent).toContain(new Date(store.progress.value.completed[client.id]!).toLocaleDateString());
  expect(root.querySelector('[aria-label="Hint usage"]')?.textContent)
    .toContain('Try answer: highest rung 3, count 2');
});

it.each(['', '0', 'not-a-date', '11/08/2026', '2026-02-30T12:00:00.000Z',
  '2026-13-01T12:00:00.000Z'])('shows Done without a date for invalid completion %j', async (date) => {
  const store = await setup('1234');
  await act(() => store.save({ ...store.progress.value, completed: { [client.id]: date } }));
  await signIn();
  const completed = root.querySelector('[aria-label="Completed missions"]')!;
  expect(completed.textContent).toContain(`${client.title}: Done`);
  expect(completed.querySelector('time')).toBeNull();
});

it('provides a named keyboard focus target for the settings sections', async () => {
  await setup('1234'); await signIn();
  const sections = root.querySelector<HTMLElement>('[aria-label="Grown-up settings sections"]')!;
  expect(sections.getAttribute('role')).toBe('region');
  sections.focus(); expect(document.activeElement).toBe(sections);
});

it('keeps a fixed header and contains scrolling and read aloud labels when music locks', async () => {
  styles = document.createElement('style');
  styles.textContent = ['src/styles/base.css', 'src/ui/screens/parent.css']
    .map((path) => readFileSync(path, 'utf8')).join('\n');
  document.head.append(styles);
  await setup('1234'); await signIn();
  const panel = root.querySelector<HTMLElement>('.panel')!;
  const screen = root.querySelector<HTMLElement>('.parent-screen')!;
  const header = screen.querySelector('header')!;
  const sections = root.querySelector<HTMLElement>('[aria-label="Grown-up settings sections"]')!;
  for (const locked of [false, true]) {
    if (locked) await click(root, 'Keep music off');
    for (const ancestor of [panel, screen]) {
      const style = getComputedStyle(ancestor);
      expect(style.display).toBe('flex');
      expect(style.flexDirection).toBe('column');
      expect(style.minHeight).toBe('0px');
      expect(style.overflow).toBe('hidden');
    }
    expect(getComputedStyle(screen).flexBasis).toBe('0px');
    expect(getComputedStyle(screen).flexGrow).toBe('1');
    expect(getComputedStyle(header).flexShrink).toBe('0');
    const style = getComputedStyle(sections);
    expect(style.flex).toBe('1 1 auto');
    expect(style.minHeight).toBe('0px');
    expect(style.overflow).toBe('auto');
    expect(style.position).toBe('relative');
    expect(sections.textContent?.includes('Music is locked off by a grown-up.')).toBe(locked);
  }
  const label = sections.querySelector<HTMLElement>('.visually-hidden')!;
  expect(label.textContent).toBe('Read aloud');
  expect(getComputedStyle(label).position).toBe('absolute');
  let container = label.parentElement!;
  while (['', 'static'].includes(getComputedStyle(container).position)) container = container.parentElement!;
  expect(container).toBe(sections);
});

it('saves every session choice, all audio channels, auto read, mute and the music lock', async () => {
  const store = await setup('1234'); await signIn();
  for (const minutes of [15, 30, 45, 60, 0]) {
    await click(root, minutes ? `${minutes} minutes` : 'Off');
    expect(loadProgress(store.storage).settings.sessionMinutes).toBe(minutes);
  }
  for (const [key, name] of [['voices', 'Voices'], ['sounds', 'Sounds'], ['music', 'Music']] as const) {
    const before = loadProgress(store.storage).settings;
    await click(root, `${name} on`); await click(root, `${name} loud`);
    expect(loadProgress(store.storage).settings[key]).toEqual({ on: false, level: 'loud' });
    for (const other of ['voices', 'sounds', 'music'] as const) {
      if (other !== key) expect(loadProgress(store.storage).settings[other]).toEqual(before[other]);
    }
  }
  await click(root, 'Read to me'); await click(root, 'Sound on'); await click(root, 'Keep music off');
  expect(loadProgress(store.storage).settings).toMatchObject({ autoRead: false, muted: true, musicLocked: true });
  expect(button(root, 'Music off').disabled).toBe(true);
  await click(root, 'Keep music off'); expect(button(root, 'Music off').disabled).toBe(false);
  await click(root, 'Keep music off');
  await unmount(root);
  const restarted = createStore(fakeDepsWithStorage(store)); root = await mount(restarted);
  await click(root, 'Tap to begin, Agent!');
  expect(root.textContent).not.toContain('Completed missions');
  await open(restarted); await signIn();
  expect(button(root, 'Keep music off').getAttribute('aria-checked')).toBe('true');
  expect(button(root, 'Music off').disabled).toBe(true);
  expect(restarted.progress.value.settings).toEqual(store.progress.value.settings);
});
function fakeDepsWithStorage(store: AppStore) { return { ...fakeDeps(), storage: store.storage! }; }

it('Back cancels a pending PIN save and double presses cannot submit twice', async () => {
  const store = await setup();
  await digits('1234'); await click(root, 'Next'); await digits('1234');
  let finish!: (buffer: ArrayBuffer) => void;
  const pending = new Promise<ArrayBuffer>((resolve) => { finish = resolve; });
  digest.mockImplementationOnce(() => pending);
  await click(root, 'Save PIN');
  expect(button(root, 'Save PIN').disabled).toBe(true);
  await click(root, 'Save PIN'); await click(root, 'Back');
  await act(async () => { finish(new ArrayBuffer(32)); await pending; });
  expect(store.progress.value.pin).toBeNull();
  expect(store.screen.value.name).toBe('map');
});

it('confirms an unlock before marking the mission and opening its dependent', async () => {
  const store = await setup('1234'); await signIn();
  await click(root, `Mark ${client.title} done`); expect(store.progress.value.completed).toEqual({});
  await click(root, 'Cancel'); expect(store.progress.value.completed).toEqual({});
  await click(root, `Mark ${client.title} done`); await click(root, 'Yes, mark done');
  expect(loadProgress(store.storage).completed[client.id]).toBeTruthy();
  await click(root, 'Back'); await act(() => store.openMission(dependent.id));
  expect(store.screen.value).toEqual({ name: 'player', missionId: dependent.id });
});

it('confirms reset, clears progress and eggs, keeps the PIN and returns to start', async () => {
  const store = await setup('1234'); await signIn();
  await act(() => {
    store.complete(client.id); store.hint(client.id, 'answer', 2); store.settings({ sessionMinutes: 15 });
  });
  store.storage!.setItem(PLAYGROUND_KEY, JSON.stringify({ found: ['egg'], discovered: ['joke'] }));
  await open(store); await signIn();
  const pin = store.progress.value.pin;
  await click(root, 'Reset all progress'); expect(store.storage!.getItem(PLAYGROUND_KEY)).not.toBeNull();
  await click(root, 'Yes, reset everything');
  expect(store.screen.value.name).toBe('start');
  expect(store.storage!.getItem(PLAYGROUND_KEY)).toBeNull();
  expect(loadProgress(store.storage)).toMatchObject({ completed: {}, hints: {}, firstWord: null,
    current: null, extraBits: 0, pin, settings: { sessionMinutes: 0 } });
  await open(store); await signIn(); expect(root.textContent).toContain('Completed missions');
});

it('changes a PIN only after matching both entries', async () => {
  const store = await setup('1234'); await signIn(); await click(root, 'Change PIN');
  await createPin('2468');
  expect(await checkPin(loadProgress(store.storage), '2468')).toBe(true);
  expect(await checkPin(loadProgress(store.storage), '1234')).toBe(false);
  await click(root, 'Back'); await open(store); await signIn('1234');
  expect(root.textContent).toContain('That PIN did not match. Try again.');
  await signIn('2468'); expect(root.textContent).toContain('Completed missions');
});

it('shows the session nudge on Done at the boundary, never interrupting a step', async () => {
  vi.useFakeTimers(); let time = 0;
  const deps = { ...fakeDeps(), now: () => new Date(time) };
  const store = identityStore(deps);
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  store.settings({ sessionMinutes: 15 });
  await act(() => { store.openMission(client.id); store.phase(client.id, { phase: 'step', index: 0 }); });
  time = 15 * 60_000; await act(() => { vi.advanceTimersByTime(time); });
  expect(store.screen.value.name).toBe('player');
  expect(root.textContent).not.toContain('Great time to stop.');
  await act(() => store.complete(client.id));
  expect(root.textContent).toContain('Great time to stop. Your mission is saved.');
  const line = [...root.querySelectorAll('.speech-line')].find((line) => line.textContent?.includes('Great time to stop.'))!;
  expect(line.querySelector('[aria-label="Read aloud"]')).toBeTruthy();
  await click(root, 'Stop for today'); expect(store.screen.value.name).toBe('stop');
  expect(root.textContent).not.toContain('Great time to stop.');
  await click(root, 'Back'); expect(store.screen.value.name).toBe('done');
});

it('keeps an off timer silent and updates a Done screen when time runs out', async () => {
  vi.useFakeTimers(); let time = 0;
  const store = identityStore({ ...fakeDeps(), now: () => new Date(time) });
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  await act(() => store.complete(client.id));
  time = 900_000; await act(() => { vi.advanceTimersByTime(time); });
  expect(root.textContent).not.toContain('Great time to stop.');
  await act(() => store.settings({ sessionMinutes: 30 }));
  time = 1_799_999; await act(() => { vi.advanceTimersByTime(899_999); });
  expect(root.textContent).not.toContain('Great time to stop.');
  time++; await act(() => { vi.advanceTimersByTime(1); });
  expect(root.textContent).toContain('Great time to stop. Your mission is saved.');
  await click(root, 'Next'); expect(store.screen.value.name).toBe('map');
  expect(root.textContent).not.toContain('Great time to stop.');
});
