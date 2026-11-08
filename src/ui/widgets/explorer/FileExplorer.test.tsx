// @vitest-environment jsdom
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FileExplorerConfig } from '../../../engine/types';
import { b4Files } from '../../../missions/b4-files';
import { button, click } from '../../test/helpers';
import { FileExplorer } from './FileExplorer';
import { activate, mountWidget, openEntry, pointer } from './testHelpers';

let mounted: Awaited<ReturnType<typeof mountWidget<FileExplorerConfig>>>;
afterEach(async () => { await mounted?.unmount(); vi.useRealTimers(); vi.restoreAllMocks(); });
const sorting = b4Files.steps[2]!.config as FileExplorerConfig;
const opening: FileExplorerConfig = { kind: 'file-explorer', fs: {
  type: 'dir', children: {
    Pictures: { type: 'dir', children: {
      'Cat picture': { type: 'file', content: 'A cat in a hat.' },
      'Small folder': { type: 'dir', children: {} },
    } },
    Locked: { type: 'file', content: 'A secret.', locked: true },
  },
}, task: { type: 'open', path: '/Pictures/Cat picture' } };
async function advance(ms: number) { await act(() => { vi.advanceTimersByTime(ms); }); }
async function dragFile(file: string, folder: string, pointerId = 1) {
  await pointer(button(mounted.root, file), 'pointerdown', 10, 10, pointerId);
  await pointer(window, 'pointermove', 130, 20, pointerId);
  await pointer(button(mounted.root, folder), 'pointerup', 130, 20, pointerId);
}
describe('file explorer opening', () => {
  it('selects on one click, teaches two clicks, navigates breadcrumbs, and opens with Enter', async () => {
    mounted = await mountWidget(FileExplorer, opening);
    await click(mounted.root, 'Pictures');
    expect(button(mounted.root, 'Pictures').getAttribute('aria-pressed')).toBe('true');
    expect(mounted.root.textContent).toContain('Click two times to open it.');
    expect(mounted.root.querySelector('[aria-current="location"]')?.textContent).toBe('This computer');
    await openEntry(mounted.root, 'Pictures');
    await openEntry(mounted.root, 'Small folder', true);
    await activate(mounted.root, 'Pictures');
    expect(button(mounted.root, 'Cat picture')).toBeDefined();
    await activate(mounted.root, 'This computer', ' ');
    expect(button(mounted.root, 'Locked')).toBeDefined();
    await openEntry(mounted.root, 'Pictures', true);
    await click(mounted.root, 'Cat picture');
    expect(mounted.onComplete).not.toHaveBeenCalled();
    await openEntry(mounted.root, 'Cat picture', true);
    expect(mounted.root.textContent).toContain('A cat in a hat.');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
    await click(mounted.root, 'Close file');
    expect(mounted.root.textContent).not.toContain('A cat in a hat.');
    await openEntry(mounted.root, 'Cat picture');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
  });
  it('completes a folder task on entry, and gently refuses a locked file', async () => {
    mounted = await mountWidget(FileExplorer, { ...opening, task: { type: 'open', path: '/Pictures' } });
    await openEntry(mounted.root, 'Locked');
    expect(mounted.root.textContent).toContain('This file is locked. Try another file.');
    expect(mounted.deps.sound.play).toHaveBeenLastCalledWith('tryAgain');
    expect(mounted.onComplete).not.toHaveBeenCalled();
    await openEntry(mounted.root, 'Pictures');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
    expect(mounted.deps.sound.play).toHaveBeenLastCalledWith('success');
  });
  it('shows and opens a nested target after a short delay', async () => {
    vi.useFakeTimers();
    mounted = await mountWidget(FileExplorer, opening);
    await mounted.reveal();
    expect(button(mounted.root, 'Cat picture').classList.contains('file-highlight')).toBe(true);
    expect(mounted.onComplete).not.toHaveBeenCalled();
    await advance(600);
    expect(mounted.root.textContent).toContain('A cat in a hat.');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
    await mounted.reveal(); await advance(3000);
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
  });
  it('cancels delayed help on unmount or when help is withdrawn', async () => {
    vi.useFakeTimers();
    mounted = await mountWidget(FileExplorer, opening);
    await mounted.reveal(); await mounted.hide(); await advance(1000);
    expect(mounted.onComplete).not.toHaveBeenCalled();
    await mounted.reveal(); await mounted.unmount(); await advance(1000);
    expect(mounted.onComplete).not.toHaveBeenCalled();
  });
});
describe('file explorer moving', () => {
  it('nudges wrong click moves and completes all the correct click moves once', async () => {
    mounted = await mountWidget(FileExplorer, sorting);
    await click(mounted.root, 'Cat picture');
    await activate(mounted.root, 'Move to Music');
    expect(mounted.root.textContent).toContain('Good try. Let us find this file a different home.');
    expect(button(mounted.root, 'Cat picture')).toBeDefined();
    expect(mounted.deps.sound.play).toHaveBeenLastCalledWith('tryAgain');
    await activate(mounted.root, 'Move to Pictures', ' ');
    expect(mounted.root.querySelector('[aria-label="Cat picture"]')).toBeNull();
    expect(mounted.onComplete).not.toHaveBeenCalled();
    await click(mounted.root, 'Sun picture'); await click(mounted.root, 'Move to Pictures');
    await click(mounted.root, 'Happy song'); await click(mounted.root, 'Move to Music');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
    expect(mounted.deps.sound.play).toHaveBeenLastCalledWith('success');
    await openEntry(mounted.root, 'Pictures');
    await openEntry(mounted.root, 'Cat picture');
    expect(mounted.root.textContent).toContain('A cat in a hat.');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
    expect(Object.hasOwn(sorting.fs.children, 'Cat picture')).toBe(true);
  });
  it('uses pointer drag, floats back on a wrong folder, and ignores another pointer', async () => {
    mounted = await mountWidget(FileExplorer, sorting);
    await pointer(button(mounted.root, 'Cat picture'), 'pointerdown', 10, 10);
    await pointer(window, 'pointermove', 120, 30, 2);
    await pointer(button(mounted.root, 'Pictures'), 'pointerup', 120, 30, 2);
    expect(button(mounted.root, 'Cat picture')).toBeDefined();
    await pointer(window, 'pointercancel', 10, 10);
    await dragFile('Cat picture', 'Music');
    expect(button(mounted.root, 'Cat picture').style.transform).toBe('translate(0, 0)');
    expect(mounted.root.textContent).toContain('Good try.');
    await dragFile('Cat picture', 'Pictures');
    await dragFile('Sun picture', 'Pictures');
    await dragFile('Happy song', 'Music');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
  });
  it('hit tests the release point and rejects a drop outside a folder', async () => {
    mounted = await mountWidget(FileExplorer, sorting);
    const hit = vi.fn((): Element => document.body);
    Object.defineProperty(document, 'elementFromPoint', { configurable: true, value: hit });
    await dragFile('Cat picture', 'Pictures');
    expect(button(mounted.root, 'Cat picture')).toBeDefined();
    expect(mounted.onComplete).not.toHaveBeenCalled();
    hit.mockReturnValue(button(mounted.root, 'Pictures').querySelector('svg')!);
    await dragFile('Cat picture', 'Pictures');
    expect(mounted.root.querySelector('[aria-label="Cat picture"]')).toBeNull();
    Reflect.deleteProperty(document, 'elementFromPoint');
  });
  it('suppresses the release click but allows the next folder or keyboard choice', async () => {
    mounted = await mountWidget(FileExplorer, sorting);
    await dragFile('Cat picture', 'Music');
    await act(() => { button(mounted.root, 'Cat picture').dispatchEvent(
      new MouseEvent('click', { bubbles: true, detail: 1 })); });
    expect(button(mounted.root, 'Cat picture').getAttribute('aria-pressed')).toBe('false');
    await dragFile('Cat picture', 'Music');
    await click(mounted.root, 'Music');
    expect(button(mounted.root, 'Music').getAttribute('aria-pressed')).toBe('true');
    await dragFile('Cat picture', 'Music');
    await activate(mounted.root, 'Cat picture', ' ');
    expect(button(mounted.root, 'Cat picture').getAttribute('aria-pressed')).toBe('true');
  });
  it('does not move on a click or pointer cancellation, and removes listeners on unmount', async () => {
    mounted = await mountWidget(FileExplorer, sorting);
    await pointer(button(mounted.root, 'Cat picture'), 'pointerdown', 10, 10);
    await pointer(button(mounted.root, 'Pictures'), 'pointerup', 12, 10);
    expect(button(mounted.root, 'Cat picture')).toBeDefined();
    await pointer(button(mounted.root, 'Cat picture'), 'pointerdown', 10, 10);
    await pointer(window, 'pointermove', 120, 20);
    await pointer(window, 'pointercancel', 120, 20);
    await pointer(button(mounted.root, 'Pictures'), 'pointerup', 120, 20);
    expect(button(mounted.root, 'Cat picture')).toBeDefined();
    await mounted.unmount();
    await pointer(window, 'pointermove', 140, 20);
    await pointer(window, 'pointerup', 140, 20);
    expect(mounted.onComplete).not.toHaveBeenCalled();
    expect(mounted.deps.sound.play).not.toHaveBeenCalledWith('success');
  });
  it('helps with remaining moves one by one without repeating a manual move', async () => {
    vi.useFakeTimers();
    mounted = await mountWidget(FileExplorer, sorting);
    await click(mounted.root, 'Cat picture'); await click(mounted.root, 'Move to Pictures');
    await mounted.reveal();
    expect(button(mounted.root, 'Sun picture').classList.contains('file-highlight')).toBe(true);
    await advance(600);
    expect(mounted.root.querySelector('[aria-label="Sun picture"]')).toBeNull();
    expect(button(mounted.root, 'Happy song')).toBeDefined();
    expect(mounted.onComplete).not.toHaveBeenCalled();
    await mounted.reveal(); await advance(600);
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
    await advance(3000);
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
    expect(mounted.deps.sound.play).not.toHaveBeenCalledWith('tryAgain');
  });
  it('does not repeat a scheduled move the player has already made', async () => {
    vi.useFakeTimers();
    mounted = await mountWidget(FileExplorer, sorting);
    await mounted.reveal();
    await click(mounted.root, 'Cat picture'); await click(mounted.root, 'Move to Pictures');
    await advance(600);
    expect(mounted.deps.sound.play).not.toHaveBeenCalledWith('tryAgain');
    await advance(2000);
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
  });
  it('makes entries, breadcrumbs, readers, and move controls tabbable', async () => {
    mounted = await mountWidget(FileExplorer, sorting);
    await click(mounted.root, 'Cat picture');
    for (const element of mounted.root.querySelectorAll('button')) {
      expect(element.tabIndex).toBe(0); element.focus(); expect(document.activeElement).toBe(element);
    }
  });
});
