// @vitest-environment jsdom
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { caesarDecode } from '../../../engine/cipher';
import { m3Zoo } from '../../../missions/m3-zoo';
import { button, click, fill, input, submit } from '../../test/helpers';
import { fixtureRegistry } from '../../test/fixtures';
import { Toolbar } from '../../components/Toolbar';
import { createStore, StoreContext } from '../../store';
import { decoderConfig, mountTool, removeTools } from './test-helpers';

afterEach(removeTools);
function shift(root: HTMLElement) { return Number(root.querySelector('[role="slider"]')!.getAttribute('aria-valuenow')); }
function preview(root: HTMLElement) { return root.querySelector('[aria-label="Decoded message"] .speech-line > span')!.textContent; }
function letterCenter(letter: HTMLElement, diameter: number) {
  const x = (parseFloat(letter.style.left) / 100 - .5) * diameter;
  const y = (parseFloat(letter.style.top) / 100 - .5) * diameter;
  const angle = parseFloat(letter.parentElement!.style.transform.slice(7)) * Math.PI / 180 || 0;
  return { x: x * Math.cos(angle) - y * Math.sin(angle), y: x * Math.sin(angle) + y * Math.cos(angle) };
}
describe('decoder mission', () => {
  it.each([{ diameter: 340, font: 24 }, { diameter: 510, font: 36 }])(
    'spaces both alphabets apart at $diameter pixels through every shift', async ({ diameter, font }) => {
      const { root } = await mountTool(decoderConfig);
      const letters = [...root.querySelectorAll<HTMLElement>('.wheel-letter')];
      expect(letters).toHaveLength(52);
      for (const ring of [letters.slice(0, 26), letters.slice(26)]) {
        expect(ring.map((letter) => letter.textContent).join('')).toBe('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
        const points = ring.map((letter) => letterCenter(letter, diameter));
        const radius = Math.hypot(points[0]!.x, points[0]!.y);
        for (const [index, point] of points.entries()) {
          expect(Math.hypot(point.x, point.y)).toBeCloseTo(radius);
          const next = points[(index + 1) % 26]!;
          expect(Math.hypot(point.x - next.x, point.y - next.y)).toBeCloseTo(2 * radius * Math.sin(Math.PI / 26));
        }
      }
      // A circle around each monospace letter also covers its rotated corners.
      const letterDiagonal = Math.hypot(font * .61, font);
      for (let turn = 0; turn < 26; turn++) {
        const points = letters.map((letter) => letterCenter(letter, diameter));
        let gap = Infinity;
        for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
          gap = Math.min(gap, Math.hypot(points[a]!.x - points[b]!.x, points[a]!.y - points[b]!.y));
        }
        expect(gap).toBeGreaterThan(letterDiagonal);
        await click(root, 'Turn right');
      }
    });
  it('keeps the toolbar dialog preview, turns and close control working', async () => {
    const { root, deps } = await mountTool(decoderConfig);
    const store = createStore({ ...deps, registry: fixtureRegistry([m3Zoo]) });
    store.progress.value = { ...store.progress.value, completed: { [m3Zoo.id]: '2026-11-08T12:00:00.000Z' } };
    await act(() => { render(<StoreContext.Provider value={store}><Toolbar /></StoreContext.Provider>, root); });
    await click(root, 'Open decoder wheel');
    const dialog = root.querySelector<HTMLElement>('[role="dialog"][aria-label="Decoder wheel"]')!;
    await fill(dialog, 'Secret message', decoderConfig.message);
    await click(dialog, 'Turn right');
    expect(shift(dialog)).toBe(1);
    expect(preview(dialog)).toBe(caesarDecode(decoderConfig.message, 1));
    await click(dialog, 'Turn left');
    expect(preview(dialog)).toBe(decoderConfig.message);
    await click(dialog, 'Close');
    expect(root.querySelector('[role="dialog"]')).toBeNull();
    expect(document.activeElement).toBe(button(root, 'Open decoder wheel'));
  });
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
  it('drags across the angle boundary and stops on release or cancel', async () => {
    const { root } = await mountTool(decoderConfig);
    const wheel = root.querySelector<HTMLElement>('[role="slider"]')!;
    wheel.getBoundingClientRect = () => ({ x: 0, y: 0, width: 300, height: 300 } as DOMRect);
    wheel.setPointerCapture = vi.fn(); wheel.releasePointerCapture = vi.fn();
    async function pointer(type: string, degrees: number, pointerId = 1) {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.assign(event, { button: 0, pointerId,
        clientX: 150 + 100 * Math.cos(degrees * Math.PI / 180),
        clientY: 150 + 100 * Math.sin(degrees * Math.PI / 180) });
      await act(() => { wheel.dispatchEvent(event); });
    }
    await pointer('pointerdown', 170);
    await pointer('pointermove', -170, 2); expect(shift(root)).toBe(0);
    await pointer('pointermove', -170); expect(shift(root)).toBe(1);
    expect(preview(root)).toBe(caesarDecode(decoderConfig.message, 1));
    await pointer('pointermove', 170); expect(shift(root)).toBe(0);
    await pointer('pointerup', 170);
    expect(wheel.releasePointerCapture).toHaveBeenCalledWith(1);
    await pointer('pointermove', 90); expect(shift(root)).toBe(0);
    await pointer('pointerdown', 0); await pointer('pointermove', 90);
    const stopped = shift(root); expect(stopped).toBe(7);
    await pointer('pointercancel', 90); await pointer('pointermove', 180);
    expect(shift(root)).toBe(stopped);
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
