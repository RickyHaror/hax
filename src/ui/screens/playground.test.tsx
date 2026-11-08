import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PLAYGROUND_KEY, loadPlayground } from '../../engine/playground';
import { playground } from '../../missions/playground';
import { createStore } from '../store';
import { click, fakeDeps, identityStore, mount, unmount } from '../test/helpers';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });
async function setup() {
  if (!playground) throw new Error('Playground content is required for this test.');
  const deps = fakeDeps();
  const store = identityStore(deps);
  store.save({ ...store.progress.value, completed: { [playground.unlockedBy]: deps.now().toISOString() } });
  root = await mount(store); await click(root, 'Tap to begin, Agent!');
  await click(root, 'Agent Playground');
  return { deps, store, data: playground };
}
async function run(command: string) {
  const field = root.querySelector<HTMLInputElement>('input[aria-label="Command"]')!;
  await act(() => { field.value = command; field.dispatchEvent(new Event('input', { bubbles: true })); });
  await click(root, 'Enter');
}
function output() { return root.querySelector('[aria-label="Terminal output"]')!; }

describe('playground screen', () => {
  it('starts free play with readable intro, sidekick art and a map exit', async () => {
    const { data, store } = await setup();
    expect(store.screen.value.name).toBe('playground');
    expect(store.safeMoment.value).toBe(false);
    for (const line of data.intro) {
      const speech = [...root.querySelectorAll('.speech-line')].find((node) => node.textContent?.includes(line.text));
      expect(speech).toBeDefined();
      expect(speech!.querySelector('button[aria-label="Read aloud"]')).not.toBeNull();
    }
    expect(root.querySelector('.bubble svg')).not.toBeNull();
    await run('pwd'); expect(output().textContent).toContain(data.cwd);
    await click(root, 'Back to the map'); expect(store.screen.value.name).toBe('map');
  });
  it('finds every data egg, shows badges and found lines, and persists across remounts', async () => {
    const { data, deps } = await setup();
    const initialSave = deps.storage.getItem('hax.v1');
    for (const egg of data.eggs) {
      const trigger = egg.trigger;
      if (trigger.type === 'command') await run(trigger.command);
      else if (trigger.type === 'cwd') await run(`cd ${trigger.path}`);
      else await run(`cat ${trigger.path}`);
      expect(root.querySelector('[aria-label="Egg badges"]')?.textContent).toContain(egg.name);
      for (const line of egg.found) expect(root.textContent).toContain(line.text);
    }
    expect(root.textContent).toContain(`Eggs found: ${data.eggs.length} of ${data.eggs.length}`);
    expect(vi.mocked(deps.sound.play).mock.calls.filter(([name]) => name === 'success')).toHaveLength(data.eggs.length);
    await run(data.commands[0]!.name);
    expect(vi.mocked(deps.sound.play).mock.calls.filter(([name]) => name === 'success')).toHaveLength(data.eggs.length);
    expect(deps.storage.getItem('hax.v1')).toBe(initialSave);
    expect(deps.storage.getItem(PLAYGROUND_KEY)).not.toBeNull();
    await unmount(root);
    root = await mount(createStore(deps)); await click(root, 'Tap to begin, Agent!');
    await click(root, 'Agent Playground');
    expect(root.textContent).toContain(`Eggs found: ${data.eggs.length} of ${data.eggs.length}`);
    expect(loadPlayground(deps.storage).found).toHaveLength(data.eggs.length);
    await run('help'); expect(output().textContent).toContain(`${data.commands[0]!.name}:`);
  });
  it('hides secret help until discovery and keeps typing during an effect', async () => {
    const { data } = await setup();
    await run('help'); expect(output().textContent).not.toContain('whoami:');
    await run('whoami'); expect(output().textContent).toContain('Brave Star');
    await run('help'); expect(output().textContent).toContain('whoami:');
    await run('matrix'); expect(root.querySelector('[aria-label="Green code rain"]')).not.toBeNull();
    await run('ls -a'); expect(output().textContent).toContain('snacks/');
    expect(root.querySelector('[aria-label="Folders"]')?.textContent).toContain('.crumb');
    await run('cd snacks'); await run('cd ..'); await run('pwd');
    expect(output().textContent).toContain(data.cwd);
    await run('lock snacks/menu'); await run('cat snacks/menu');
    expect(output().textContent).toContain('is locked');
    await run('clear'); expect(output().textContent).toBe('');
  });
});
