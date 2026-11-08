// @vitest-environment jsdom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HackConfig } from '../../../engine/types';
import { StoreContext, createStore } from '../../store';
import { click, fakeDeps, mount, unmount } from '../../test/helpers';
import { fixtureRegistry } from '../../test/fixtures';
import { hackMission } from '../../test/hack-mission';
import { widgets } from '../Widget';
import { createHackRun, Hack, HackContext } from './Hack';

let root: HTMLDivElement;
afterEach(async () => { if (root) await unmount(root); vi.unstubAllGlobals(); });
function field() { return root.querySelector<HTMLInputElement>('input')!; }
function output() { return root.querySelector<HTMLElement>('[role="log"]')!; }
async function type(value: string) {
  await act(() => { field().value = value; field().dispatchEvent(new Event('input', { bubbles: true })); });
}
async function key(key: string, isComposing = false) {
  const event = new KeyboardEvent('keydown', { key, isComposing, bubbles: true, cancelable: true });
  await act(() => { field().dispatchEvent(event); });
  return event.defaultPrevented;
}
async function run(value: string) { await type(value); await key('Enter'); }
function meter() { return root.querySelector('[role="meter"]'); }

async function setup(showMe = false, config?: Partial<HackConfig>) {
  const mission = hackMission();
  const step = mission.steps[0]!;
  step.config = { ...step.config as HackConfig, goal: { type: 'flag' }, ...config };
  const session = createHackRun(mission);
  const deps = fakeDeps();
  const store = createStore(deps);
  const onComplete = vi.fn();
  root = document.createElement('div'); document.body.append(root);
  await act(() => render(<StoreContext.Provider value={store}><HackContext.Provider value={session}>
    <Hack step={step} config={step.config as HackConfig} showMe={showMe} onComplete={onComplete} />
  </HackContext.Provider></StoreContext.Provider>, root));
  return { session, store, deps, onComplete };
}
async function login() {
  await run('connect shop-pc'); await run('admin'); await run('apple-code');
}
function expectSecret(secret: string) {
  expect(field().type).toBe('text');
  expect(field().value).toBe('*'.repeat(secret.length));
  expect(root.textContent).not.toContain(secret);
  expect(root.innerHTML).not.toContain(secret);
  expect(root.querySelector('input[type="password"]')).toBeNull();
}

describe('hack mission steps', () => {
  it('plays two steps in Player with one session and finishes the mission', async () => {
    const mission = hackMission();
    const store = createStore({ ...fakeDeps(), registry: fixtureRegistry([mission]) });
    store.identify(0, 0, 0); store.openMission(mission.id);
    root = await mount(store);
    await click(root, 'Tap to begin, Agent!'); await click(root, 'Start mission'); await click(root, 'I accept');
    expect(widgets.hack).toBe(Hack);
    await run('connect shop-pc');
    expect(field().getAttribute('aria-label')).toBe('User name:');
    await run('admin');
    expect(field().getAttribute('aria-label')).toBe('Password:');
    await type('apple-code'); expectSecret('apple-code'); await key('Enter');
    expect(store.position.value.phase).toBe('success');
    await click(root, 'Next');
    expect(root.querySelector('.command-row .prompt-full')?.textContent).toBe('admin@shop-pc:~$');
    expect(output().textContent).toContain('Password: **********');
    expect(output().textContent).toContain('Welcome to the shop.');
    await run('cat clue.txt'); expect(output().textContent).toContain('CLUE{shop-safe}');
    await run('submit clue.txt'); expect(store.position.value.phase).toBe('success');
    await click(root, 'Next'); await click(root, 'Next');
    expect(store.progress.value.completed[mission.id]).toBeDefined();
  });

  it('types chips and Show me without running, and completes commands, hosts and paths', async () => {
    const { session, deps, onComplete } = await setup(true);
    await click(root, 'connect shop-pc'); expect(field().value).toBe('connect shop-pc ');
    expect(root.textContent).toContain('visit our shop');
    await click(root, 'Show me'); expect(field().value).toBe('connect shop-pc');
    expect(session.session.events).toEqual([]);
    expect(deps.sound.play).not.toHaveBeenCalled(); expect(onComplete).not.toHaveBeenCalled();
    await type('con'); await key('Tab'); expect(field().value).toBe('connect ');
    await type('connect sh'); await click(root, 'Tab'); expect(field().value).toBe('connect shop-pc ');
    await key('Enter'); await run('admin'); await run('apple-code');
    await type('cat cl'); await key('Tab'); expect(field().value).toBe('cat clue.txt ');
    expect(output().textContent).not.toContain('CLUE{shop-safe}');
    await key('Enter'); expect(output().textContent).toContain('CLUE{shop-safe}');
    await run('submit clue.txt'); await run('pwd'); expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('types the Show me rung through Help me and waits for Enter', async () => {
    const mission = hackMission();
    const store = createStore({ ...fakeDeps(), registry: fixtureRegistry([mission]) });
    store.identify(0, 0, 0); store.openMission(mission.id); root = await mount(store);
    await click(root, 'Tap to begin, Agent!'); await click(root, 'Start mission'); await click(root, 'I accept');
    await click(root, 'Help me'); await click(root, '2 Bigger hint'); await click(root, '3 Show me');
    expect(field().value).toBe('connect shop-pc');
    expect(store.position.value.phase).toBe('step');
    expect(field().getAttribute('aria-label')).toBe('Command');
    expect(output().textContent).not.toContain('User name:');
    await click(root, 'Close hints'); await key('Enter');
    expect(field().getAttribute('aria-label')).toBe('User name:');
  });

  it('updates the alarm, calmly returns to HQ, and clears pending input', async () => {
    await setup();
    expect(meter()?.getAttribute('aria-valuenow')).toBe('0');
    expect(meter()?.getAttribute('aria-valuemax')).toBe('2');
    await run('connect shop-pc'); await run('admin'); await run('wrong-one');
    expect(meter()?.getAttribute('aria-valuenow')).toBe('1');
    await run('connect shop-pc'); await run('admin'); await run('wrong-two');
    expect(meter()?.getAttribute('aria-valuenow')).toBe('0');
    expect(output().textContent).toContain('HQ pulled you out. Your work is safe.');
    expect(output().querySelector('.terminal-hint [aria-label="Sidekick"]')).toBeTruthy();
    expect(field().getAttribute('aria-label')).toBe('Command');
    expect(root.querySelector('.command-row .prompt-full')?.textContent).toBe('agent@hq:~$');
    expect(root.innerHTML).not.toContain('wrong-one'); expect(root.innerHTML).not.toContain('wrong-two');
  });

  it('masks login, sudo, unlock, and both passwd answers without history or completion leaks', async () => {
    await setup(); await login();
    for (const [command, label, secret] of [
      ['sudo pwd', 'Password:', 'root-code'], ['unlock vault.txt', 'Password:', 'apple-code'],
      ['passwd', 'New passphrase:', 'sunshine-meadow-rocket'],
    ]) {
      await run(command!); expect(field().getAttribute('aria-label')).toBe(label);
      await type(secret!); expectSecret(secret!);
      expect(await key('Tab')).toBe(false); expectSecret(secret!);
      await key('Enter'); expect(root.innerHTML).not.toContain(secret!);
    }
    expect(field().getAttribute('aria-label')).toBe('Type it once more:');
    await type('sunshine-meadow-rocket'); expectSecret('sunshine-meadow-rocket'); await key('Enter');
    await key('ArrowUp'); expect(field().value).toBe('');
    expect(root.querySelector('.command-row .prompt-full')?.textContent).toBe('root@shop-pc:~#');
    expect(root.querySelector('[aria-label="Terminal"]')?.getAttribute('style')).toContain('var(--pc-shop)');
    await run('cd docs'); await run('pwd'); expect(output().textContent).toContain('root@shop-pc:~/docs# pwd');
  });

  it('keeps secret edits and pasted replacements masked while passing the real answer', async () => {
    await setup(); await run('connect shop-pc'); await run('admin');
    async function edit(start: number, end: number, text: string) {
      await act(() => {
        const input = field(); input.setSelectionRange(start, end);
        input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'insertText', data: text }));
        input.value = input.value.slice(0, start) + text + input.value.slice(end);
        input.setSelectionRange(start + text.length, start + text.length);
        input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
      });
    }
    await edit(0, 0, 'apple-coda'); expectSecret('apple-coda');
    await act(() => {
      const input = field(); input.setSelectionRange(10, 10);
      input.dispatchEvent(new InputEvent('beforeinput', { bubbles: true, inputType: 'deleteContentBackward' }));
      input.value = input.value.slice(0, 9); input.setSelectionRange(9, 9);
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'deleteContentBackward' }));
    });
    expectSecret('apple-cod');
    await edit(9, 9, 'x'); await edit(9, 10, 'e'); expectSecret('apple-code');
    await key('Enter'); expect(output().textContent).toContain('Welcome to the shop.');
  });

  it('ignores composing keys, focuses on desktop, and scrolls new output in the terminal body', async () => {
    await setup(); expect(document.activeElement).toBe(field());
    expect(await key('Tab')).toBe(false);
    await type('pw'); expect(await key('Tab', true)).toBe(false); expect(field().value).toBe('pw');
    expect(await key('Enter', true)).toBe(false); expect(output().textContent).not.toContain('pw');
    const reader = output().closest<HTMLElement>('.reading-box')!;
    Object.defineProperty(reader, 'scrollHeight', { configurable: true, value: 900 });
    await run('help'); expect(reader.scrollTop).toBe(900);
    expect(output().closest('.terminal-body')).toBeTruthy();
    await click(root, 'Read aloud');
  });

  it('leaves the phone keyboard closed and omits alarms when absent', async () => {
    vi.stubGlobal('matchMedia', () => ({ matches: true }));
    const mission = hackMission(); delete mission.alarm;
    const store = createStore({ ...fakeDeps(), registry: fixtureRegistry([mission]) });
    store.identify(0, 0, 0); store.openMission(mission.id); root = await mount(store);
    await click(root, 'Tap to begin, Agent!'); await click(root, 'Start mission'); await click(root, 'I accept');
    expect(document.activeElement).not.toBe(field()); expect(meter()).toBeNull();
  });

  it('drops machine state and alarms when the mission restarts', async () => {
    const mission = hackMission();
    const store = createStore({ ...fakeDeps(), registry: fixtureRegistry([mission]) });
    store.identify(0, 0, 0); store.openMission(mission.id); root = await mount(store);
    await click(root, 'Tap to begin, Agent!'); await click(root, 'Start mission'); await click(root, 'I accept');
    await run('connect shop-pc'); await run('admin'); await run('wrong');
    await login(); await click(root, 'Next'); expect(meter()?.getAttribute('aria-valuenow')).toBe('1');
    await act(() => { store.phase(mission.id, { phase: 'intro', index: 0 }); });
    await click(root, 'Start mission'); await click(root, 'I accept');
    expect(meter()?.getAttribute('aria-valuenow')).toBe('0');
    expect(root.querySelector('.command-row .prompt-full')?.textContent).toBe('agent@hq:~$');
    expect(output().textContent).not.toContain('Welcome to the shop.');
    await run('connect shop-pc'); expect(field().getAttribute('aria-label')).toBe('User name:');
  });
});
