import { createElement, render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { StepConfig } from '../../engine/types';
import { StoreContext } from '../store';
import { client } from '../test/fixtures';
import { click, fill, identityStore, submit, unmount } from '../test/helpers';
import { StepWidget, widgets } from './Widget';

let root: HTMLElement | undefined;
afterEach(async () => { if (root) await unmount(root); root = undefined; });

async function mountWidget(config: StepConfig) {
  const onComplete = vi.fn();
  const step = { ...client.steps[0]!, config };
  const container = document.createElement('div'); document.body.append(container); root = container;
  await act(() => {
    render(createElement(StoreContext.Provider, { value: identityStore() },
      createElement(StepWidget, { step, config, onComplete, showMe: false })), container);
  });
  return { container, onComplete };
}

describe('widget registry', () => {
  it('registers story and completes it through Next', async () => {
    expect(Object.hasOwn(widgets, 'story')).toBe(true);
    const { container, onComplete } = await mountWidget({ kind: 'story' });
    expect(container.textContent).not.toContain('This part is still being built.');
    await click(container, 'Next'); await click(container, 'Next');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('registers answer and completes it after the correct answer', async () => {
    expect(Object.hasOwn(widgets, 'answer')).toBe(true);
    const { container, onComplete } = await mountWidget({
      kind: 'answer', question: { text: 'What is the key?' }, answer: 'Blue Box',
    });
    expect(container.textContent).toContain('What is the key?');
    await fill(container, 'Answer', 'Blue Box'); await submit(container);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('shows the placeholder and Next for an unregistered kind', async () => {
    expect(Object.hasOwn(widgets, 'not-built-yet')).toBe(false);
    const { container, onComplete } = await mountWidget({ kind: 'not-built-yet' } as unknown as StepConfig);
    expect(container.textContent).toContain('This part is still being built.');
    expect(onComplete).not.toHaveBeenCalled();
    await click(container, 'Next'); await click(container, 'Next');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
