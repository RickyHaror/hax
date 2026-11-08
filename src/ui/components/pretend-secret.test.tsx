import { render } from 'preact';
import { useState } from 'preact/hooks';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { button, click, fill, input, unmount } from '../test/helpers';
import { PretendSecretInput } from './PretendSecretInput';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

function Secret({ onCheck }: { onCheck: () => void }) {
  const [value, setValue] = useState('');
  return <PretendSecretInput value={value} onInput={(event) => setValue(event.currentTarget.value)} onCheck={onCheck} />;
}

it('keeps the value and Password label while Show letters toggles the mask', async () => {
  const onCheck = vi.fn();
  root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<Secret onCheck={onCheck} />, root); });
  const field = input(root, 'Password');
  await fill(root, 'Password', 'Blue Star');
  expect(field.type).toBe('text');
  expect(field.classList.contains('pretend-secret-mask')).toBe(true);
  expect(button(root, 'Show letters').getAttribute('aria-pressed')).toBe('false');
  expect(button(root, 'Show letters').type).toBe('button');
  await click(root, 'Show letters');
  expect(input(root, 'Password')).toBe(field);
  expect(field.classList.contains('pretend-secret-mask')).toBe(false);
  expect(button(root, 'Show letters').getAttribute('aria-pressed')).toBe('true');
  await click(root, 'Show letters');
  expect(field.classList.contains('pretend-secret-mask')).toBe(true);
  expect(field.value).toBe('Blue Star');
  expect(onCheck).not.toHaveBeenCalled();
});

it('checks only Enter, prevents submission, and gives each field a unique id', async () => {
  const onCheck = vi.fn();
  root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<><Secret onCheck={onCheck} /><Secret onCheck={vi.fn()} /></>, root); });
  const fields = [...root.querySelectorAll('input')];
  expect(new Set(fields.map((field) => field.id)).size).toBe(2);
  const field = fields[0]!;
  for (const options of [{ key: 'a' }, { key: 'Enter', isComposing: true }]) {
    await act(() => { field.dispatchEvent(new KeyboardEvent('keydown', { ...options, bubbles: true, cancelable: true })); });
  }
  expect(onCheck).not.toHaveBeenCalled();
  const enter = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  await act(() => { field.dispatchEvent(enter); });
  expect(enter.defaultPrevented).toBe(true);
  expect(onCheck).toHaveBeenCalledTimes(1);
  for (const element of fields) expect(element.labels?.[0]?.htmlFor).toBe(element.id);
});
