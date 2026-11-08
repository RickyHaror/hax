import { render, type ComponentType } from 'preact';
import { act } from 'preact/test-utils';
import { vi } from 'vitest';
import type { StepConfig } from '../../../engine/types';
import { createStore, StoreContext } from '../../store';
import { fakeDeps } from '../../test/helpers';
import type { WidgetProps } from '../Widget';
import { caseStep } from './fixtures';

export async function mountCase<C extends StepConfig>(Widget: ComponentType<WidgetProps<C>>, config: C, showMe = false) {
  const deps = fakeDeps();
  const store = createStore(deps);
  const onComplete = vi.fn();
  const root = document.createElement('div');
  document.body.append(root);
  const draw = (reveal: boolean, complete = onComplete) => <StoreContext.Provider value={store}>
    <Widget step={caseStep(config)} config={config} showMe={reveal} onComplete={complete} />
  </StoreContext.Provider>;
  await act(() => { render(draw(showMe), root); });
  return { root, store, deps, onComplete,
    async redraw(reveal: boolean, complete = onComplete) {
      await act(() => { render(draw(reveal, complete), root); });
    },
  };
}

export function clue(root: HTMLElement, name: string): HTMLElement {
  const element = [...root.querySelectorAll<HTMLElement>('[role="button"]')]
    .find((span) => span.getAttribute('aria-label') === name);
  if (!element) throw new Error(`Missing clue: ${name}`);
  return element;
}
export async function press(element: HTMLElement, key: string) {
  await act(() => {
    element.focus();
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  });
}
