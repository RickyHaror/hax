// @vitest-environment jsdom
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { button, click, fill, input, submit } from '../../test/helpers';
import { mountTool, removeTools, webConfig } from './test-helpers';
import { tokenizeSource } from './tokenize-source';

afterEach(removeTools);
describe('pretend browser', () => {
  it('keeps its address uneditable and renders the pretend page blocks', async () => {
    const { root, deps } = await mountTool(webConfig);
    const address = root.querySelector('[aria-label="Pretend address"]')!;
    expect(address.textContent).toBe(webConfig.page.address);
    expect(address.matches('input, textarea, a, [contenteditable]')).toBe(false);
    expect(root.querySelectorAll('input')).toHaveLength(1);
    expect(root.querySelector('h3')?.textContent).toContain(webConfig.page.blocks[0]!.text);
    expect(root.querySelector('[role="paragraph"]')?.textContent).toContain(webConfig.page.blocks[1]!.text);
    await click(root, 'Meet the toys');
    expect(root.textContent).toContain('This is just a pretend page.');
    expect(deps.sound.play).toHaveBeenCalledWith('click');
    expect(root.querySelectorAll('a, iframe')).toHaveLength(0);
  });
  it('toggles View Code and renders token colours without running source', async () => {
    const source = '<h1 title="Toys">Toys</h1>\n<!-- password: wobblebeans -->\n<img src="bad" onerror="oops()">';
    const { root } = await mountTool({ ...webConfig, source });
    expect(button(root, 'View Code').getAttribute('aria-pressed')).toBe('false');
    await click(root, 'View Code');
    expect(button(root, 'View Code').getAttribute('aria-pressed')).toBe('true');
    const panel = root.querySelector('[aria-label="Page source"]')!;
    expect(panel.textContent?.trim()).toBe(source);
    for (const kind of ['tag', 'attribute', 'string', 'comment']) {
      expect([...panel.querySelectorAll(`.source-${kind}`)].map((node) => node.textContent).join(''))
        .toBe(tokenizeSource(source).filter((token) => token.kind === kind).map((token) => token.text).join(''));
    }
    expect(panel.querySelectorAll('h1, img')).toHaveLength(0);
    await click(root, 'View Code');
    expect(root.querySelector('[aria-label="Page source"]')).toBeNull();
    expect(root.querySelector('[aria-label="Pretend page"]')).not.toBeNull();
  });
  it('nudges wrong answers, accepts case and spaces, and completes once', async () => {
    const { root, deps, complete } = await mountTool(webConfig);
    expect(input(root, 'Answer').type).toBe('text');
    expect(button(root, 'Check').type).toBe('submit');
    expect(input(root, 'Answer').form).toBe(button(root, 'Check').form);
    await fill(root, 'Answer', 'oops'); await submit(root);
    expect(root.textContent).toContain('Good try. Look at the clue and try again.');
    expect(deps.sound.play).toHaveBeenCalledWith('tryAgain');
    expect(complete).not.toHaveBeenCalled();
    await fill(root, 'Answer', '  WOBBLEBEANS  '); await submit(root); await submit(root);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(vi.mocked(deps.sound.play).mock.calls.filter(([name]) => name === 'success')).toHaveLength(1);
  });
  it('showMe opens code, highlights the answer line and fills without completing', async () => {
    const { root, store, complete, reveal } = await mountTool(webConfig);
    await reveal(true);
    expect(button(root, 'View Code').getAttribute('aria-pressed')).toBe('true');
    expect(root.querySelector('mark')?.textContent).toBe('<!-- admin password: wobblebeans -->');
    expect(input(root, 'Answer').value).toBe(webConfig.answer);
    expect(complete).not.toHaveBeenCalled();
    await click(root, 'View Code'); await fill(root, 'Answer', '');
    await act(() => { store.revealCount.value += 1; });
    expect(button(root, 'View Code').getAttribute('aria-pressed')).toBe('true');
    expect(input(root, 'Answer').value).toBe(webConfig.answer);
    await submit(root); await submit(root);
    expect(complete).toHaveBeenCalledTimes(1);
  });
});
