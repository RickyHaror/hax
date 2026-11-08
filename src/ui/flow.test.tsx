import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { loadProgress, isUnlocked, rank, toSaveCode } from '../engine/progress';
import { createStore } from './store';
import { buildRegistry } from './registry';
import { client, dependent, fixtureRegistry, login } from './test/fixtures';
import { button, click, fakeDeps, fill, identityStore, input, mount, submit, unmount } from './test/helpers';
let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); vi.restoreAllMocks(); });
describe('start and onboarding', () => {
  it('accepts a normalized password, gives kind feedback, and saves login', async () => {
    const deps = fakeDeps(); const store = createStore(deps); root = await mount(store);
    expect(root.querySelector('h1')?.textContent).toBe('AGENT HQ');
    expect(input(root, 'Username').value).toBe('agent');
    await fill(root, 'Password', 'wrong'); await click(root, 'Check');
    expect(root.textContent).toContain('Good try.'); expect(store.progress.value.completed).toEqual({});
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
    await fill(root, 'Password', '  bLue    stAR  '); await submit(root);
    expect(root.textContent).toContain('You did it!');
    expect(loadProgress(deps.storage).completed.login).toBeTruthy();
    await click(root, 'Next'); expect(store.screen.value.name).toBe('onboarding');
    await click(root, 'Next'); expect(store.screen.value.name).toBe('map');
  });
  it('accepts alternate spellings and login hints reveal the password', async () => {
    const store = createStore(fakeDeps()); root = await mount(store);
    await click(root, 'Help me'); await click(root, 'Help me'); await click(root, 'Help me');
    expect(input(root, 'Password').value).toBe('Blue Star');
    await fill(root, 'Password', ' gREEn   Moon '); await click(root, 'Check');
    expect(store.progress.value.completed.login).toBeTruthy();
  });
  it('empty registries still support identity, fresh word choices, and the map', async () => {
    const deps = fakeDeps(); deps.registry = buildRegistry({ missions: [], sidekicks: [], firstWords: [], secondWords: [], art: {} });
    const store = createStore(deps); root = await mount(store);
    await click(root, 'Start');
    const before = root.querySelector('fieldset')?.textContent;
    await click(root, 'Shuffle'); expect(root.querySelector('fieldset')?.textContent).not.toBe(before);
    await click(root, 'Pixel'); await click(root, 'Next');
    expect(store.progress.value.sidekick).toBe(1);
    expect(root.textContent).toContain('Missions coming soon');
    expect(root.querySelector('svg[aria-label="Pixel"]')).toBeTruthy();
  });
});

describe('mission journey', () => {
  it('shows a readable save failure with the secret key and Next', async () => {
    const deps = fakeDeps();
    deps.storage.setItem = () => { throw new Error('Storage unavailable'); };
    const store = identityStore(deps); root = await mount(store);
    await act(() => store.complete(client.id));
    const message = 'Write your secret key in your notebook. This computer could not save.';
    expect(root.querySelector('h1')?.textContent).toBe('Great work, Agent!');
    expect(root.textContent).not.toContain('Mission saved.');
    expect(root.textContent).toContain(message);
    expect(root.querySelector('output')?.textContent).toBe(toSaveCode(store.progress.value, deps.registry.missions));
    const read = [...root.querySelectorAll('button')].find((b) =>
      b.getAttribute('aria-label') === 'Read aloud' && b.parentElement?.textContent?.includes(message));
    expect(read).toBeTruthy();
    await act(() => read!.click());
    expect(deps.voice.speak).toHaveBeenCalledWith({ text: message });
    await click(root, 'Next'); expect(store.screen.value.name).toBe('map');
  });

  it('plays every phase, saves hints and completion, and unlocks the next mission without dialogs', async () => {
    const dialogs = [vi.spyOn(window, 'alert'), vi.spyOn(window, 'confirm'), vi.spyOn(window, 'prompt')];
    const deps = fakeDeps(); const store = identityStore(deps); root = await mount(store);
    await act(() => store.openMission(client.id));
    await click(root, 'Start mission'); expect(root.textContent).toContain('Permission slip');
    expect(root.textContent).toContain('Only hack what you own or have permission to hack.');
    expect(root.textContent).toContain('Pete Pie'); await click(root, 'I accept');
    await click(root, 'Next'); await click(root, 'Next');
    await click(root, 'Help me'); await click(root, 'Help me'); await click(root, 'Help me'); await click(root, 'Help me');
    expect(store.progress.value.hints.client?.answer).toEqual({ rung: 3, count: 4 });
    expect(input(root, 'Answer').value).toBe('Blue Box');
    expect(deps.sound.play).toHaveBeenCalledWith('hint'); await click(root, 'Check'); await click(root, 'Next');
    expect(root.textContent).toContain('This part is still being built.');
    await click(root, 'Next'); await click(root, 'Next'); expect(root.textContent).toContain('Lock it down!');
    await click(root, 'Next'); await click(root, 'Next'); expect(root.textContent).toContain('The pizza box is safe!');
    await click(root, 'Next'); expect(root.textContent).toContain('Great work, Agent! Mission saved.');
    expect(root.textContent).toContain('Pizza Shield'); expect(root.textContent).toContain(rank(1));
    expect(root.querySelector('output')?.textContent).toMatch(/^HAX-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(loadProgress(deps.storage).completed.client).toBeTruthy();
    expect(isUnlocked(store.progress.value, dependent)).toBe(true);
    await click(root, 'Next');
    const next = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Toy Patrol'))!;
    expect(next.disabled).toBe(false);
    for (const spy of dialogs) expect(spy).not.toHaveBeenCalled();
  });
  it('locked missions cannot open and explain the missing mission', async () => {
    const store = identityStore(); root = await mount(store);
    expect(root.textContent).toContain('Finish Pizza Patrol first');
    const locked = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Toy Patrol'))!;
    expect(locked.disabled).toBe(true); await act(() => locked.click());
    expect(store.screen.value.name).toBe('map');
  });
  it('resumes the same phase through the UI after reload', async () => {
    const deps = fakeDeps(); const store = identityStore(deps); root = await mount(store);
    await act(() => store.openMission(client.id)); await click(root, 'Start mission');
    await unmount(root); root = await mount(createStore(deps));
    expect(root.textContent).toContain('Permission slip'); await click(root, 'I accept');
    await click(root, 'Next'); await unmount(root); root = await mount(createStore(deps));
    expect(root.textContent).toContain('You did it!');
    await click(root, 'Next'); expect(root.textContent).toContain('What is the key?');
  });
});

describe('keys and controls', () => {
  it('restores a key into a fresh store and explains a checksum typo', async () => {
    const source = identityStore(); source.complete(client.id);
    const code = toSaveCode(source.progress.value, source.registry.missions);
    const store = createStore(fakeDeps()); root = await mount(store);
    await click(root, 'I have a secret key');
    const typo = `${code.slice(0, -1)}${code.endsWith('0') ? '1' : '0'}`;
    await fill(root, 'Secret key', typo); await click(root, 'Check');
    expect(root.textContent).toContain('One letter looks different. Check your notebook again.');
    await fill(root, 'Secret key', code); await click(root, 'Check');
    expect(store.screen.value.name).toBe('map'); expect(store.progress.value.completed.client).toBeTruthy();
    expect(store.progress.value.firstWord).toBe(source.progress.value.firstWord);
    expect(store.progress.value.secondWord).toBe(source.progress.value.secondWord);
    expect(store.progress.value.sidekick).toBe(source.progress.value.sidekick);
    expect(root.textContent).toContain('Your key worked. Welcome back!');
  });
  it('reads lines and auto-reads new lines, cancels speech, and toggles mute', async () => {
    const deps = fakeDeps(); deps.registry = fixtureRegistry([client]);
    const store = identityStore(deps); root = await mount(store);
    await act(() => store.openMission(client.id));
    expect(deps.voice.speakAll).toHaveBeenCalledWith(expect.arrayContaining([{ text: 'Our pizza box needs help.' }]));
    await click(root, 'Read aloud'); expect(deps.voice.speak).toHaveBeenCalled();
    expect(button(root, 'Read everything to me').getAttribute('aria-pressed')).toBe('true');
    await click(root, 'Read everything to me'); expect(deps.voice.cancel).toHaveBeenCalled();
    expect(button(root, 'Read everything to me').getAttribute('aria-pressed')).toBe('false');
    const reads = vi.mocked(deps.voice.speakAll).mock.calls.length;
    await click(root, 'Start mission'); await click(root, 'I accept');
    expect(vi.mocked(deps.voice.speakAll).mock.calls).toHaveLength(reads);
    await click(root, 'Read everything to me'); expect(vi.mocked(deps.voice.speakAll).mock.calls.length).toBeGreaterThan(reads);
    await click(root, 'Sound on'); expect(button(root, 'Sound off')).toBeTruthy();
    expect(deps.sound.setMuted).toHaveBeenLastCalledWith(true);
    await click(root, 'Sound off'); expect(deps.sound.setMuted).toHaveBeenLastCalledWith(false);
  });
  it('offers stop, settings, a secret key, and Back without losing the player phase', async () => {
    const store = identityStore(); root = await mount(store);
    await click(root, 'Settings'); await click(root, 'Show my secret key');
    expect(root.querySelector('output')?.textContent).toMatch(/^HAX-/); await click(root, 'Back');
    await act(() => store.openMission(client.id)); await click(root, 'Stop for today');
    expect(root.textContent).toContain('See you soon!'); expect(root.querySelector('output')).toBeTruthy();
    await click(root, 'Back'); expect(root.textContent).toContain('Start mission');
  });
});

describe('answer submission', () => {
  it.each(['login', 'player'])('refills an erased answer on each top-rung Help me press in %s', async (screen) => {
    const store = screen === 'login' ? createStore(fakeDeps()) : identityStore();
    if (screen === 'player') {
      store.openMission(client.id); store.phase(client.id, { phase: 'step', index: 1 });
    }
    root = await mount(store);
    const label = screen === 'login' ? 'Password' : 'Answer';
    const answer = screen === 'login' ? 'Blue Star' : 'Blue Box';
    await click(root, 'Help me'); await click(root, 'Help me'); await click(root, 'Help me');
    expect(input(root, label).value).toBe(answer);
    for (const value of ['', 'My try']) {
      await fill(root, label, value);
      expect(input(root, label).value).toBe(value);
      await click(root, 'Help me');
      expect(input(root, label).value).toBe(answer);
    }
    const missionId = screen === 'login' ? login.id : client.id;
    const stepId = screen === 'login' ? 'password' : 'answer';
    expect(store.progress.value.hints[missionId]?.[stepId]).toEqual({ rung: 3, count: 5 });
  });

  it.each(['login', 'player'])('rejects blank input and blank accepted answers in %s', async (screen) => {
    const source = screen === 'login' ? login : client;
    const step = { ...login.steps[0]!, config: {
      kind: 'answer' as const, question: { text: 'Read the note.' }, answer: '', accept: ['  '],
    } };
    const mission = { ...source, steps: [step] };
    const deps = fakeDeps(); deps.registry = fixtureRegistry([mission]);
    const store = screen === 'login' ? createStore(deps) : identityStore(deps);
    if (screen === 'player') {
      store.openMission(mission.id); store.phase(mission.id, { phase: 'step', index: 0 });
    }
    root = await mount(store);
    await submit(root);
    await fill(root, screen === 'login' ? 'Password' : 'Answer', '  '); await submit(root);
    expect(root.textContent).toContain('Good try.');
    expect(store.progress.value.completed).toEqual({});
    if (screen === 'player') expect(store.position.value.phase).toBe('step');
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
  });
  it('keeps progress on a wrong answer and accepts normalized inner spaces', async () => {
    const deps = fakeDeps(); const store = identityStore(deps);
    store.openMission(client.id); store.phase(client.id, { phase: 'step', index: 1 });
    root = await mount(store);
    await fill(root, 'Answer', 'a red box'); await submit(root);
    expect(store.position.value.phase).toBe('step');
    expect(root.textContent).toContain('Good try. Look at the clue and try again.');
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
    await fill(root, 'Answer', '  bLUe   bOx '); await submit(root);
    expect(store.position.value.phase).toBe('success');
  });
});

it('treats inherited names as missing art and unknown widgets', async () => {
  const mission = { ...client, client: { ...client.client!, art: 'toString' },
    steps: [{ ...client.steps[2]!, config: { kind: 'toString' } as unknown as typeof client.steps[number]['config'] }] };
  const deps = fakeDeps(); deps.registry = fixtureRegistry([mission]);
  const store = identityStore(deps); store.openMission(mission.id); root = await mount(store);
  await click(root, 'Start mission');
  expect(root.querySelector('svg[aria-label="Pizza Pals"]')).toBeTruthy();
  await click(root, 'I accept'); expect(root.textContent).toContain('This part is still being built.');
  await click(root, 'Next'); expect(store.position.value.phase).toBe('success');
});
