// @vitest-environment jsdom
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { caesarDecode } from '../../../engine/cipher';
import { button, click, fill, input, submit } from '../../test/helpers';
import { decoderConfig, mountTool, removeTools } from './test-helpers';

afterEach(removeTools);
function shift(root: HTMLElement) { return Number(root.querySelector('[role="slider"]')!.getAttribute('aria-valuenow')); }
function preview(root: HTMLElement) { return root.querySelector('[aria-label="Decoded message"] .speech-line > span')!.textContent; }
describe('decoder mission', () => {
  it('shares one coded line and read button at zero shift', async () => {
    const { root, deps } = await mountTool(decoderConfig);
    const codedLines = () => [...root.querySelectorAll('.speech-line > span')]
      .filter((line) => line.textContent === decoderConfig.message);
    const decoded = root.querySelector<HTMLElement>('[aria-label="Decoded message"]')!;
    const secret = root.querySelector<HTMLElement>('[aria-label="Secret message"]')!;
    expect(codedLines()).toHaveLength(1);
    expect(preview(root)).toBe(decoderConfig.message);
    expect(secret.textContent).toContain(decoderConfig.message);
    expect(decoded.querySelectorAll('button[aria-label="Read aloud"]')).toHaveLength(1);
    await click(secret, 'Read aloud');
    expect(deps.voice.speak).toHaveBeenCalledWith({ text: decoderConfig.message },
      expect.objectContaining({ onEnd: expect.any(Function) }));
    await click(root, 'Turn right');
    expect(codedLines()).toHaveLength(1);
    expect(preview(root)).toBe(caesarDecode(decoderConfig.message, 1));
    await click(root, 'Turn left');
    expect(codedLines()).toHaveLength(1);
    await click(decoded, 'Read aloud');
    expect(deps.voice.speak).toHaveBeenCalledTimes(2);
  });
  it('turns both ways with wrapping and updates the decoded message', async () => {
    const { root, deps } = await mountTool(decoderConfig);
    expect(root.querySelector('[aria-label="Secret message"]')?.textContent).toContain(decoderConfig.message);
    expect(root.textContent).toContain(decoderConfig.clue!.text);
    expect(shift(root)).toBe(0);
    await click(root, 'Turn left');
    expect(shift(root)).toBe(25);
    expect(preview(root)).toBe(caesarDecode(decoderConfig.message, 25));
    await click(root, 'Turn right'); expect(shift(root)).toBe(0);
    for (let i = 0; i < 3; i++) await click(root, 'Turn right');
    expect(root.textContent).toContain('Shift: 3');
    expect(preview(root)).toBe('FEED THE SEALS');
    expect(deps.sound.play).toHaveBeenCalledWith('click');
  });
  it('supports arrow keys on the focused wheel', async () => {
    const { root } = await mountTool(decoderConfig);
    const wheel = root.querySelector<HTMLElement>('[role="slider"]')!;
    wheel.focus(); expect(document.activeElement).toBe(wheel);
    async function press(key: string) {
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      await act(() => { wheel.dispatchEvent(event); });
      expect(event.defaultPrevented).toBe(true);
    }
    await press('ArrowLeft'); expect(shift(root)).toBe(25);
    await press('ArrowRight'); expect(shift(root)).toBe(0);
    await press('ArrowRight'); expect(preview(root)).toBe(caesarDecode(decoderConfig.message, 1));
  });
  it('nudges wrong answers and accepts spacing and case on native form submission', async () => {
    const { root, complete, deps } = await mountTool(decoderConfig);
    expect(input(root, 'Answer').form).toBe(button(root, 'Check').form);
    expect(button(root, 'Check').type).toBe('submit');
    await fill(root, 'Answer', 'lions'); await submit(root);
    expect(complete).not.toHaveBeenCalled();
    expect(root.textContent).toContain('Good try. Look at the clue and try again.');
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
    await fill(root, 'Answer', '  feed   the   seals '); await submit(root); await submit(root);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.sound.play).mock.calls.filter(([name]) => name === 'success')).toHaveLength(1);
  });
  it('showMe turns to the clue shift and refills on another reveal', async () => {
    const { root, store, complete, reveal } = await mountTool(decoderConfig);
    await reveal(true);
    expect(shift(root)).toBe(3);
    expect(preview(root)).toBe(decoderConfig.answer);
    expect(input(root, 'Answer').value).toBe(decoderConfig.answer);
    expect(complete).not.toHaveBeenCalled();
    await click(root, 'Turn left'); await fill(root, 'Answer', '');
    await act(() => { store.revealCount.value += 1; });
    expect(shift(root)).toBe(3);
    expect(input(root, 'Answer').value).toBe(decoderConfig.answer);
    await submit(root); await submit(root); expect(complete).toHaveBeenCalledTimes(1);
  });
  it('works without a clue and reads decoded words aloud', async () => {
    const { root, deps } = await mountTool({ ...decoderConfig, clue: undefined });
    const decoded = root.querySelector<HTMLElement>('[aria-label="Decoded message"]')!;
    await click(decoded, 'Read aloud');
    expect(deps.voice.speak).toHaveBeenCalledWith({ text: decoderConfig.message }, expect.objectContaining({ onEnd: expect.any(Function) }));
  });
});
