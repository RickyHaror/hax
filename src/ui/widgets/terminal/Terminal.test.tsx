// @vitest-environment jsdom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Mission, TerminalConfig, TerminalGoal } from '../../../engine/types';
import { VirtualFs } from '../../../engine/fs';
import { Shell } from '../../../engine/shell';
import { StoreContext, createStore } from '../../store';
import { fakeDeps, click, button, mount, submit, unmount } from '../../test/helpers';
import { fixtureRegistry, login } from '../../test/fixtures';
import { Terminal } from './Terminal';
import { TerminalView } from './TerminalView';
import { terminalWidgets } from './index';
import { terminalConfig } from './fixtures';

let root: HTMLDivElement;
afterEach(async () => { if (root) await unmount(root); });
async function setup(config = terminalConfig(), showMe = false) {
  root = document.createElement('div'); document.body.append(root);
  const deps = fakeDeps();
  const store = createStore(deps);
  const complete = vi.fn();
  const step = { ...login.steps[0]!, id: 'terminal-test', config };
  const draw = async (reveal = showMe, nextStep = step) => {
    await act(() => render(<StoreContext.Provider value={store}>
      <Terminal step={nextStep} config={nextStep.config} showMe={reveal} onComplete={complete} />
    </StoreContext.Provider>, root));
  };
  await draw();
  return { complete, deps, store, draw, step };
}
function field() { return root.querySelector<HTMLInputElement>('input[aria-label="Command"]')!; }
function output() { return root.querySelector<HTMLElement>('[role="log"]')!; }
function folders() { return root.querySelector<HTMLElement>('[aria-label="Folders"]')!; }
async function type(value: string) {
  await act(() => { field().value = value; field().dispatchEvent(new Event('input', { bubbles: true })); });
}
async function key(key: string) {
  await act(() => { field().dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })); });
}
async function run(value: string) { await type(value); await key('Enter'); }

describe('terminal input', () => {
  it('keeps Command focused inside the app and restores panel focus on other screens', async () => {
    const mission: Mission = { ...login, id: 'terminal', chapter: 'bootcamp',
      steps: [{ ...login.steps[0]!, config: terminalConfig() }] };
    const store = createStore({ ...fakeDeps(), registry: fixtureRegistry([mission]) });
    store.identify(0, 0, 0); store.openMission(mission.id);
    root = await mount(store); await click(root, 'Tap to begin, Agent!');
    expect(document.activeElement).toBe(root.querySelector('main'));
    await click(root, 'Start mission');
    expect(document.activeElement).toBe(field());
    await act(() => {
      const focused = document.activeElement as HTMLInputElement;
      focused.value = 'ls'; focused.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await act(() => {
      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }),
      );
    });
    expect(output().textContent).toContain('agent@hax:~$ ls');
    expect(output().textContent).toContain('notes.txt');
    await click(root, 'Back');
    expect(document.activeElement).toBe(root.querySelector('main'));
    await click(root, 'Settings');
    expect(document.activeElement).toBe(root.querySelector('main'));
  });

  it('registers the widget, focuses Command and runs Enter with a prompt echo', async () => {
    const { complete, deps } = await setup();
    expect(terminalWidgets.terminal).toBe(Terminal);
    expect(document.activeElement).toBe(field());
    expect(field().getAttribute('autocomplete')).toBe('off');
    expect(field().getAttribute('autocorrect')).toBe('off');
    expect(field().getAttribute('autocapitalize')).toBe('off');
    expect(field().getAttribute('spellcheck')).toBe('false');
    await type('cat notes.txt');
    expect(deps.sound.play).not.toHaveBeenCalled();
    await key('Enter');
    expect(output().textContent).toContain('agent@hax:~$ cat notes.txt');
    expect(output().textContent).toContain('The duck wears tiny boots.');
    expect(output().textContent).toContain('Nice boots!');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.sound.play).mock.calls.filter(([name]) => name === 'key')).toHaveLength(1);
    expect(deps.sound.play).toHaveBeenCalledWith('success');
  });

  it('runs through Run and ignores blank input', async () => {
    const { complete, deps } = await setup();
    await type('   '); await click(root, 'Run');
    expect(deps.sound.play).not.toHaveBeenCalled();
    await type('cat notes.txt'); await click(root, 'Run');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(output().textContent).toContain('agent@hax:~$ cat notes.txt');
  });

  it('types a chip visibly and runs it', async () => {
    const { complete } = await setup({ ...terminalConfig(), chips: ['cat notes.txt'] });
    await click(root, 'cat notes.txt');
    expect(field().value).toBe('cat notes.txt');
    expect(output().textContent).toContain('The duck wears tiny boots.');
    expect(document.activeElement).toBe(field());
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('walks command history both ways and clamps its ends', async () => {
    await setup();
    await run('pwd'); await run('ls');
    await key('ArrowUp'); expect(field().value).toBe('ls');
    await key('ArrowUp'); expect(field().value).toBe('pwd');
    await key('ArrowUp'); expect(field().value).toBe('pwd');
    await key('ArrowDown'); expect(field().value).toBe('ls');
    await key('ArrowDown'); expect(field().value).toBe('');
    await key('ArrowDown'); expect(field().value).toBe('');
  });

  it('focuses the input when the output is clicked and reads lines aloud', async () => {
    const { deps } = await setup();
    button(root, 'Run').focus();
    await act(() => output().click());
    expect(document.activeElement).toBe(field());
    await click(root, 'Read aloud');
    expect(deps.voice.speak).toHaveBeenCalledWith({ text: 'Type a command, or click a chip.' }, expect.objectContaining({ onEnd: expect.any(Function) }));
  });

  it('keeps the latest output in view after each command', async () => {
    const { draw } = await setup();
    Object.defineProperty(output(), 'scrollHeight', { configurable: true, value: 800 });
    await run('ls');
    expect(output().scrollTop).toBe(800);
    Object.defineProperty(output(), 'scrollHeight', { configurable: true, value: 1200 });
    await run('pwd');
    expect(output().scrollTop).toBe(1200);
    output().scrollTop = 0;
    await draw(true);
    expect(output().scrollTop).toBe(1200);
  });
});

const goals: { name: string; goal: TerminalGoal; commands: string[] }[] = [
  { name: 'run', goal: { type: 'run', command: 'pwd' }, commands: ['pwd'] },
  { name: 'read', goal: { type: 'read', path: '/home/agent/notes.txt' }, commands: ['cat notes.txt'] },
  { name: 'cwd', goal: { type: 'cwd', path: '/home/agent/snacks' }, commands: ['cd snacks'] },
  { name: 'locked', goal: { type: 'locked', path: '/home/agent/notes.txt' }, commands: ['lock notes.txt'] },
  { name: 'deleted', goal: { type: 'deleted', path: '/home/agent/notes.txt' }, commands: ['rm notes.txt'] },
  { name: 'all', goal: { type: 'all', goals: [
    { type: 'cwd', path: '/home/agent/snacks' }, { type: 'read', path: '/home/agent/snacks/menu.txt' },
  ] }, commands: ['cd snacks', 'cat menu.txt'] },
];

describe('terminal goals and help', () => {
  it.each(goals)('completes $name once, after the final command', async ({ goal, commands }) => {
    const { complete, deps } = await setup(terminalConfig(goal));
    for (const command of commands) {
      expect(complete).not.toHaveBeenCalled();
      await run(command);
    }
    await run('pwd'); await run('help');
    expect(complete).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.sound.play).mock.calls.filter(([name]) => name === 'success')).toHaveLength(1);
  });

  it('shows solution chips and updates them as each part is met', async () => {
    const { complete, draw, store } = await setup(terminalConfig(goals[5]!.goal));
    expect(root.textContent).not.toContain('Try this:');
    await draw(true);
    expect(root.textContent).toContain('Try this:');
    await click(root, 'cd snacks');
    expect(complete).not.toHaveBeenCalled();
    expect(button(root, 'cat menu.txt')).toBeTruthy();
    await act(() => { store.revealCount.value += 1; });
    await click(root, 'cat menu.txt');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('recomputes help after wandering into another folder', async () => {
    const { complete } = await setup(terminalConfig(), true);
    await run('cd snacks');
    await click(root, 'cat ../notes.txt');
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('resets input, history, hidden files and completion for a new step', async () => {
    const { complete, draw, step } = await setup();
    await run('ls -a'); await run('cat notes.txt');
    await draw(false, { ...step, id: 'next-terminal', config: terminalConfig() });
    expect(field().value).toBe('');
    expect(folders().textContent).not.toContain('.secret');
    await key('ArrowUp'); expect(field().value).toBe('');
    await run('cat notes.txt');
    expect(complete).toHaveBeenCalledTimes(2);
  });
});

describe('terminal output and folders', () => {
  it('updates the current folder and prompt after cd, with the full home tree', async () => {
    await setup();
    expect(folders().textContent).toContain('menu.txt');
    expect(folders().textContent).not.toContain('outside.txt');
    expect(folders().querySelector('[aria-current="true"]')?.textContent).toContain('agent');
    await run('cd snacks');
    expect(folders().querySelector('[aria-current="true"]')?.textContent).toContain('snacks');
    await run('pwd');
    expect(output().textContent).toContain('agent@hax:~/snacks$ pwd');
    await run('cd /tmp/box'); await run('pwd');
    expect(output().textContent).toContain('agent@hax:/tmp/box$ pwd');
    expect(folders().textContent).toContain('outside.txt');
    expect(folders().textContent).not.toContain('notes.txt');
    expect(folders().querySelector('[aria-current="true"]')?.textContent).toContain('box');
  });

  it.each(['ls -a', 'ls -la', 'ls -l -a'])('reveals hidden entries only after %s', async (command) => {
    await setup();
    expect(folders().textContent).not.toContain('.secret');
    await run('ls'); await run('cat .secret');
    expect(folders().textContent).not.toContain('.secret');
    await run(command);
    expect(folders().textContent).toContain('.secret');
    await run('clear');
    expect(folders().textContent).toContain('.secret');
  });

  it('does not reveal hidden entries for a failed or disallowed listing', async () => {
    await setup({ ...terminalConfig(), commands: ['cat'] });
    await run('ls -a');
    expect(folders().textContent).not.toContain('.secret');
  });

  it('shows existing locks, new locks and deleted files', async () => {
    await setup();
    expect(folders().querySelectorAll('[aria-label="Locked"]')).toHaveLength(1);
    await run('lock notes.txt');
    expect(folders().querySelectorAll('[aria-label="Locked"]')).toHaveLength(2);
    await run('rm snacks/menu.txt');
    expect(folders().textContent).not.toContain('menu.txt');
  });

  it('clears output while keeping files and history', async () => {
    await setup(); await run('pwd'); await run('clear');
    expect(output().textContent).toBe('');
    expect(folders().textContent).toContain('notes.txt');
    await key('ArrowUp'); expect(field().value).toBe('clear');
  });

  it('keeps friendly unknown, typo and disallowed messages with a nudge sound', async () => {
    const { deps, complete } = await setup({ ...terminalConfig(), commands: ['ls', 'cat'] });
    await run('xyzzy');
    expect(output().textContent).toContain('Hmm, I do not know that one. Try help.');
    await run('sl');
    expect(output().textContent).toContain('Did you mean ls?');
    expect(output().querySelector('[aria-label="Sidekick"]')).toBeTruthy();
    await run('lock notes.txt');
    expect(output().textContent).toContain('You will learn that one soon!');
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
    expect(complete).not.toHaveBeenCalled();
  });

  it('exposes a reusable view with shell, chips and a run callback', async () => {
    const { store } = await setup();
    const config: TerminalConfig = terminalConfig();
    const shell = new Shell(new VirtualFs(config.fs, config.cwd), config.commands);
    const onRun = vi.fn();
    await act(() => render(<StoreContext.Provider value={store}>
      <TerminalView shell={shell} chips={['pwd']} onRun={onRun} />
    </StoreContext.Provider>, root));
    await click(root, 'pwd');
    expect(onRun).toHaveBeenCalledTimes(1);
    expect(shell.events.at(-1)).toMatchObject({ type: 'run', command: 'pwd', ok: true });
    await type('ls'); await submit(root);
    expect(onRun).toHaveBeenCalledTimes(2);
  });
});
