import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'preact/test-utils';
import { loadProgress, isUnlocked, rank, toSaveCode } from '../engine/progress';
import { createVoice } from '../engine/voice';
import { SIGNUP_PROMPT } from '../engine/codename';
import { sidekicks } from '../missions/sidekicks';
import { createStore } from './store';
import { buildRegistry } from './registry';
import { client, dependent, fixtureRegistry, login } from './test/fixtures';
import { button, click, fakeDeps, fill, identityStore, input, mount, submit, unmount } from './test/helpers';
let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); vi.restoreAllMocks(); });
describe('start and onboarding', () => {
  it.each([true, false])('reads only the signup prompt on load with auto-read %s', async (autoRead) => {
    const deps = fakeDeps(); deps.registry = { ...deps.registry, sidekicks };
    const store = createStore(deps);
    store.settings({ autoRead }); store.go({ name: 'onboarding' });
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    expect(root.querySelector('.onboarding-heading h1')?.textContent).toBe('Pick your agent name');
    expect(root.querySelector('h1 button')).toBeNull();
    expect(vi.mocked(deps.voice.speakAll).mock.calls).toEqual(autoRead ? [[[SIGNUP_PROMPT]]] : []);
    expect(deps.voice.speak).not.toHaveBeenCalled();
    if (autoRead) {
      expect(vi.mocked(deps.voice.cancel).mock.invocationCallOrder.at(-1))
        .toBeLessThan(vi.mocked(deps.voice.speakAll).mock.invocationCallOrder[0]!);
    }
    for (const index of [0, 1, 1, 2, 0]) {
      vi.mocked(deps.voice.speakAll).mockClear(); vi.mocked(deps.voice.cancel).mockClear();
      const buddy = sidekicks[index]!;
      await click(root, buddy.name);
      expect(vi.mocked(deps.voice.speakAll).mock.calls).toEqual(autoRead
        ? [[buddy.greeting, { sidekick: buddy.id }]] : []);
      expect(deps.voice.cancel).not.toHaveBeenCalled();
      const bubble = root.querySelector('.sidekick-comms')!;
      expect(bubble.getAttribute('aria-label')).toBe(`${buddy.name}, crew tech, on comms`);
      for (const line of buddy.greeting) expect(bubble.textContent).toContain(line.text);
      expect(bubble.querySelectorAll('button[aria-label="Read aloud"]')).toHaveLength(buddy.greeting.length);
    }
  });

  it('keeps the prompt button working when automatic reading is off', async () => {
    const deps = fakeDeps(); const store = createStore(deps);
    store.settings({ autoRead: false }); store.go({ name: 'onboarding' });
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    const heading = root.querySelector('.onboarding-heading h1')!;
    const read = heading.parentElement!.querySelector<HTMLButtonElement>('[aria-label="Read aloud"]')!;
    await act(() => read.click());
    expect(deps.voice.speak).toHaveBeenCalledExactlyOnceWith(SIGNUP_PROMPT,
      expect.objectContaining({ onEnd: expect.any(Function), onUnavailable: expect.any(Function) }));
    expect(deps.voice.speakAll).not.toHaveBeenCalled();
  });

  it('reads the displayed name as recorded parts and uses newly picked words', async () => {
    const clips: HTMLAudioElement[] = [], sources: string[] = [];
    const AudioStub = vi.fn(function (src: string) {
      const clip = document.createElement('audio');
      clip.play = vi.fn(() => Promise.resolve()); clip.pause = vi.fn();
      clips.push(clip); sources.push(src); return clip;
    });
    const speak = vi.fn();
    const synth = { cancel: vi.fn(), speak, getVoices: () => [
      { lang: 'en-US', localService: false } as SpeechSynthesisVoice,
    ] } as unknown as SpeechSynthesis;
    const voice = createVoice({ synth, Utterance: class {} as typeof SpeechSynthesisUtterance,
      Audio: AudioStub as unknown as typeof Audio });
    voice.setManifest({ lines: {
      'narrator|Your name is': 'prefix.mp3', 'narrator|Brave': 'brave.mp3',
      'narrator|Otter': 'otter.mp3', 'narrator|Swift': 'swift.mp3', 'narrator|Star': 'star.mp3',
    }, sfx: {} });
    const store = createStore({ ...fakeDeps(), voice });
    store.settings({ autoRead: false }); store.go({ name: 'onboarding' });
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    const preview = root.querySelector('.name-preview')!;
    const read = preview.querySelector<HTMLButtonElement>('[aria-label="Read aloud"]')!;
    expect(preview.querySelector('.speech-line > span')?.textContent).toBe('Your name: Brave Otter');
    await act(() => read.click());
    expect(clips).toHaveLength(1);
    for (let index = 0; index < 3; index++) {
      expect(read.getAttribute('aria-pressed')).toBe('true');
      await act(() => { clips[index]!.dispatchEvent(new Event('ended')); });
    }
    expect(read.getAttribute('aria-pressed')).toBe('false');
    await click(root, 'Swift'); await click(root, 'Star');
    expect(preview.querySelector('.speech-line > span')?.textContent).toBe('Your name: Swift Star');
    await act(() => read.click());
    for (let index = 3; index < 6; index++) {
      await act(() => { clips[index]!.dispatchEvent(new Event('ended')); });
    }
    expect(sources).toEqual(['prefix', 'brave', 'otter', 'prefix', 'swift', 'star']
      .map((name) => `/audio/lines/${name}.mp3`));
    expect(speak).not.toHaveBeenCalled();
    expect(root.querySelector('.speech-unavailable')).toBeNull();
    expect(read.getAttribute('aria-pressed')).toBe('false');
  });

  it('accepts a normalized password, gives kind feedback, and saves login', async () => {
    const deps = fakeDeps(); const store = createStore(deps); root = await mount(store); await click(root, 'Tap to begin, Agent!');
    expect(root.querySelector('h1')?.textContent).toBe('AGENT HQ');
    expect(root.textContent).toContain('Username: agent');
    expect(root.querySelectorAll('input')).toHaveLength(1);
    await fill(root, 'Password', 'wrong'); await click(root, 'Check');
    expect(root.textContent).toContain('Good try.'); expect(store.progress.value.completed).toEqual({});
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
    await fill(root, 'Password', '  bLue    stAR  ');
    await act(() => { input(root, 'Password').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); });
    expect(root.textContent).toContain('You did it!');
    expect(loadProgress(deps.storage).completed.login).toBeTruthy();
    await click(root, 'Next'); expect(store.screen.value.name).toBe('onboarding');
    await click(root, 'Next'); expect(store.screen.value.name).toBe('map');
  });
  it('accepts alternate spellings and login hints reveal the password', async () => {
    const store = createStore(fakeDeps()); root = await mount(store); await click(root, 'Tap to begin, Agent!');
    await click(root, 'Help me'); await click(root, 'Help me'); await click(root, 'Help me');
    expect(input(root, 'Password').value).toBe('Blue Star');
    await fill(root, 'Password', ' gREEn   Moon '); await click(root, 'Check');
    expect(store.progress.value.completed.login).toBeTruthy();
  });
  it('empty registries still support identity, fresh word choices, and the map', async () => {
    const deps = fakeDeps(); deps.registry = buildRegistry({ missions: [], sidekicks: [], firstWords: [], secondWords: [], art: {} });
    const store = createStore(deps); root = await mount(store); await click(root, 'Tap to begin, Agent!');
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
  it.each([false, true])('reads ethics once in the intro and slip, already included: %s', async (included) => {
    const ethics = { text: 'Only hack what you own or have permission to hack.', say: 'Ask first.' };
    const mission = { ...client,
      intro: included ? [...client.intro, ethics] : client.intro,
      client: { ...client.client!, notAllowed: included
        ? [...client.client!.notAllowed, ethics] : client.client!.notAllowed },
    };
    const deps = fakeDeps(); deps.registry = fixtureRegistry([mission]);
    const store = identityStore(deps); root = await mount(store); await click(root, 'Tap to begin, Agent!');
    await act(() => store.openMission(mission.id));
    const spoken = vi.mocked(deps.voice.speakAll).mock.lastCall![0];
    expect(spoken.filter((line) => line.text === ethics.text)).toEqual([
      included ? ethics : { text: ethics.text },
    ]);
    for (const phase of ['intro', 'permission']) {
      const lines = [...root.querySelectorAll('.speech-line')].filter((line) =>
        line.querySelector('span')?.textContent === ethics.text);
      expect(lines).toHaveLength(1);
      const read = lines[0]!.querySelector<HTMLButtonElement>('button[aria-label="Read aloud"]')!;
      await act(() => read.click());
      expect(deps.voice.speak).toHaveBeenLastCalledWith(
        included ? ethics : { text: ethics.text }, expect.any(Object));
      if (phase === 'intro') await click(root, 'Start mission');
    }
    await click(root, 'I accept');
    expect(store.position.value.phase).toBe('step');
  });

  it('shows a readable save failure with the secret key and Next', async () => {
    const deps = fakeDeps();
    deps.storage.setItem = () => { throw new Error('Storage unavailable'); };
    const store = identityStore(deps); root = await mount(store); await click(root, 'Tap to begin, Agent!');
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
    expect(deps.voice.speak).toHaveBeenCalledWith({ text: message }, expect.objectContaining({ onEnd: expect.any(Function) }));
    await click(root, 'Next'); expect(store.screen.value.name).toBe('map');
  });

  it('plays every phase, saves hints and completion, and unlocks the next mission without dialogs', async () => {
    const dialogs = [vi.spyOn(window, 'alert'), vi.spyOn(window, 'confirm'), vi.spyOn(window, 'prompt')];
    const deps = fakeDeps(); const store = identityStore(deps); root = await mount(store); await click(root, 'Tap to begin, Agent!');
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
    const store = identityStore(); root = await mount(store); await click(root, 'Tap to begin, Agent!');
    expect(root.textContent).toContain('Finish Pizza Patrol first');
    const locked = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Toy Patrol'))!;
    expect(locked.disabled).toBe(true); await act(() => locked.click());
    expect(store.screen.value.name).toBe('map');
  });
  it('resumes the same phase through the UI after reload', async () => {
    const deps = fakeDeps(); const store = identityStore(deps); root = await mount(store); await click(root, 'Tap to begin, Agent!');
    await act(() => store.openMission(client.id)); await click(root, 'Start mission');
    await unmount(root); root = await mount(createStore(deps)); await click(root, 'Tap to begin, Agent!');
    expect(root.textContent).toContain('Permission slip'); await click(root, 'I accept');
    await click(root, 'Next'); await unmount(root); root = await mount(createStore(deps)); await click(root, 'Tap to begin, Agent!');
    expect(root.textContent).toContain('You did it!');
    await click(root, 'Next'); expect(root.textContent).toContain('What is the key?');
  });
});

describe('keys and controls', () => {
  it('restores a key into a fresh store and explains a checksum typo', async () => {
    const source = identityStore(); source.complete(client.id);
    const code = toSaveCode(source.progress.value, source.registry.missions);
    const store = createStore(fakeDeps()); root = await mount(store); await click(root, 'Tap to begin, Agent!');
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
    const store = identityStore(deps); root = await mount(store); await click(root, 'Tap to begin, Agent!');
    await act(() => store.openMission(client.id));
    expect(deps.voice.speakAll).toHaveBeenCalledWith(expect.arrayContaining([{ text: 'Our pizza box needs help.' }]));
    await click(root, 'Read aloud'); expect(deps.voice.speak).toHaveBeenCalled();
    expect(button(root, 'Read to me').getAttribute('aria-pressed')).toBe('true');
    await click(root, 'Read to me'); expect(deps.voice.cancel).toHaveBeenCalled();
    expect(button(root, 'Read to me').getAttribute('aria-pressed')).toBe('false');
    const reads = vi.mocked(deps.voice.speakAll).mock.calls.length;
    await click(root, 'Start mission'); await click(root, 'I accept');
    expect(vi.mocked(deps.voice.speakAll).mock.calls).toHaveLength(reads);
    await click(root, 'Read to me'); expect(vi.mocked(deps.voice.speakAll).mock.calls.length).toBeGreaterThan(reads);
    await click(root, 'Sound on'); expect(button(root, 'Sound off')).toBeTruthy();
    expect(deps.sound.setMuted).toHaveBeenLastCalledWith(true);
    await click(root, 'Sound off'); expect(deps.sound.setMuted).toHaveBeenLastCalledWith(false);
  });
  it('offers stop, settings, a secret key, and Back without losing the player phase', async () => {
    const store = identityStore(); root = await mount(store); await click(root, 'Tap to begin, Agent!');
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
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
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
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    await click(root, 'Check');
    await fill(root, screen === 'login' ? 'Password' : 'Answer', '  '); await click(root, 'Check');
    expect(root.textContent).toContain('Good try.');
    expect(store.progress.value.completed).toEqual({});
    if (screen === 'player') expect(store.position.value.phase).toBe('step');
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
  });
  it('keeps progress on a wrong answer and accepts normalized inner spaces', async () => {
    const deps = fakeDeps(); const store = identityStore(deps);
    store.openMission(client.id); store.phase(client.id, { phase: 'step', index: 1 });
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
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
  const store = identityStore(deps); store.openMission(mission.id); root = await mount(store); await click(root, 'Tap to begin, Agent!');
  await click(root, 'Start mission');
  expect(root.querySelector('svg[aria-label="Pizza Pals"]')).toBeTruthy();
  await click(root, 'I accept'); expect(root.textContent).toContain('This part is still being built.');
  await click(root, 'Next'); expect(store.position.value.phase).toBe('success');
});

it('keeps the chosen buddy and voice across intro, rail, hints, success and outro', async () => {
  const mission = { ...client, steps: [client.steps[0]!] };
  const deps = fakeDeps(); deps.registry = fixtureRegistry([mission]);
  const store = identityStore(deps); store.identify(0, 1, 2); store.openMission(mission.id);
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  const expectBuddy = (text: string) => {
    const line = [...root.querySelectorAll('.speech-line')].find((element) =>
      element.querySelector('span')?.textContent === text)!;
    expect(line).toBeTruthy();
    const comms = line.closest('[role="group"]');
    if (comms) expect(comms.getAttribute('aria-label')).toBe('Hoot says');
    else expect(line.closest('section')?.querySelector('svg[aria-label="Hoot"]')).toBeTruthy();
    expect(line.querySelector('button[aria-label="Read aloud"]')).toBeTruthy();
  };
  expectBuddy(mission.intro[0]!.text);
  await click(root, 'Start mission'); await click(root, 'I accept');
  expectBuddy(mission.steps[0]!.lines[0]!.text);
  const instructions = root.querySelector('[aria-label="Sidekick rail"]')!;
  expect(instructions.querySelector('[aria-label="Hoot, crew tech, on comms"]')).toBeTruthy();
  expect(instructions.textContent).toContain(mission.steps[0]!.lines[0]!.text);
  for (const hint of mission.steps[0]!.hints) {
    await click(root, 'Help me'); expectBuddy(hint.text);
    const hints = root.querySelector('section[aria-label="Hints"]')!;
    const read = [...hints.querySelectorAll<HTMLButtonElement>('button[aria-label="Read aloud"]')].at(-1)!;
    await act(() => read.click());
    expect(deps.voice.speak).toHaveBeenLastCalledWith(hint, expect.objectContaining({ sidekick: 'Hoot' }));
  }
  await click(root, 'Next'); expectBuddy(mission.steps[0]!.success[0]!.text);
  await click(root, 'Next'); expectBuddy(mission.outro[0]!.text);
});

it('honors client, narrator and player speakers across mission phases and hints', async () => {
  const lines = [
    { text: 'Please help.', speaker: 'client' as const },
    { text: 'The box glows.', speaker: 'narrator' as const },
    { text: 'My turn.', speaker: 'player' as const },
  ];
  const step = { ...client.steps[0]!, lines, success: lines,
    hints: [lines[0]!, lines[1]!, lines[2]!] as const };
  const mission = { ...client, intro: lines, outro: lines, steps: [step] };
  const deps = fakeDeps(); deps.registry = fixtureRegistry([mission]);
  const store = identityStore(deps); store.openMission(mission.id);
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  const expectSpeakers = (container: Element) => {
    for (const line of lines) {
      const spoken = [...container.querySelectorAll('.speech-line')].find((element) =>
        element.querySelector('span')?.textContent === line.text)!;
      const comms = spoken.closest('[role="group"]');
      const group = spoken.closest('section')!;
      if (comms) expect(comms.getAttribute('aria-label')).toBe(`${line.speaker === 'client' ? 'Pizza Pals'
        : line.speaker === 'narrator' ? 'Narrator' : 'Agent'} says`);
      else if (line.speaker === 'client') expect(group.querySelector('svg[aria-label="Pizza Pals"]')).toBeTruthy();
      else expect(group.querySelector('[role="img"]')).toBeNull();
      expect(spoken.querySelector('button[aria-label="Read aloud"]')).toBeTruthy();
    }
  };
  expectSpeakers(root.querySelector('.phase-story')!);
  await click(root, 'Start mission'); await click(root, 'I accept');
  expectSpeakers(root.querySelector('.step-story')!);
  for (const hint of step.hints) {
    await click(root, 'Help me');
    const hints = root.querySelector('section[aria-label="Hints"]')!;
    expect(hints.textContent).toContain(hint.text);
    const spoken = [...hints.querySelectorAll('.speech-line')].find((element) =>
      element.querySelector('span')?.textContent === hint.text)!;
    expect(spoken.closest('[role="group"]')?.getAttribute('aria-label')).toBe(`${hint.speaker === 'client' ? 'Pizza Pals'
      : hint.speaker === 'narrator' ? 'Narrator' : 'Agent'} says`);
    const read = spoken.querySelector<HTMLButtonElement>('button[aria-label="Read aloud"]')!;
    await act(() => read.click());
    expect(deps.voice.speak).toHaveBeenLastCalledWith(hint, expect.objectContaining({ sidekick: 'Bit' }));
  }
  await click(root, 'Next'); expectSpeakers(root.querySelector('.phase-story')!);
  await click(root, 'Next'); expectSpeakers(root.querySelector('.phase-story')!);
});
