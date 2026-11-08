// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { act } from 'preact/test-utils';
import type { ClickTargetsConfig } from '../../../engine/types';
import { button, click, unmount } from '../../test/helpers';
import { activate, mountWidget } from './test-helpers';
const config: ClickTargetsConfig = { kind: 'click-targets', action: 'click', targets: [
  { id: 'star', label: 'Star', art: 'missing' }, { id: 'moon', label: 'Moon', art: 'missing' },
] };
afterEach(async () => { for (const root of [...document.body.children]) await unmount(root as HTMLElement); });
describe('click targets', () => {
  it('keeps hits and completes just once after every target', async () => {
    const { root, complete, deps } = await mountWidget(config);
    await click(root, 'Star'); await click(root, 'Star'); expect(complete).not.toHaveBeenCalled();
    expect(button(root, 'Star').getAttribute('aria-pressed')).toBe('true');
    await click(root, 'Moon'); await click(root, 'Moon'); expect(complete).toHaveBeenCalledTimes(1);
    expect(deps.sound.play).toHaveBeenCalledWith('success');
  });
  it('gently teaches two clicks and accepts double clicks', async () => {
    const { root, complete, deps } = await mountWidget({ ...config, action: 'double-click' });
    await click(root, 'Star'); expect(root.textContent).toContain('Click two times, fast!');
    expect(complete).not.toHaveBeenCalled(); expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
    for (const label of ['Star', 'Moon', 'Moon']) await act(() => { button(root, label).dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); });
    expect(complete).toHaveBeenCalledTimes(1);
    await click(root, 'Read aloud'); expect(deps.voice.speak).toHaveBeenCalledWith({ text: 'Click two times, fast!' }, expect.objectContaining({ onEnd: expect.any(Function) }));
  });
  it('supports Enter and Space even for double click tasks', async () => {
    const { root, complete } = await mountWidget({ ...config, action: 'double-click' });
    await activate(root, 'Star'); await activate(root, 'Moon', ' '); await activate(root, 'Moon');
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('show me makes a single click enough, including later reveals', async () => {
    const { root, complete, update } = await mountWidget({ ...config, action: 'double-click' });
    await update(true); await click(root, 'Star'); await update(false); await update(true);
    await click(root, 'Moon'); await click(root, 'Moon'); expect(complete).toHaveBeenCalledTimes(1);
  });
});
