// @vitest-environment jsdom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { button, unmount } from '../test/helpers';
import { CommandChip } from './CommandChip';

let root: HTMLDivElement;
afterEach(async () => { if (root) await unmount(root); });

it.each(['ls', 'ls '])('types %j with one trailing space and a command-only accessible name', async (command) => {
  root = document.createElement('div'); document.body.append(root);
  const onType = vi.fn();
  await act(() => render(<CommandChip command={command} hint="list files" onType={onType} />, root));
  const chip = button(root, command);
  expect(chip.textContent).toContain('list files');
  await act(() => chip.click());
  expect(onType).toHaveBeenCalledExactlyOnceWith('ls ');
});
