import { render, type ComponentType } from 'preact';
import { act } from 'preact/test-utils';
import { vi } from 'vitest';
import type { StepConfig } from '../../../engine/types';
import type { WidgetProps } from '../Widget';
import { StoreContext, createStore } from '../../store';
import { fakeDeps, button } from '../../test/helpers';
import { login } from '../../test/fixtures';

export async function mountWidget<C extends StepConfig>(Widget: ComponentType<WidgetProps<C>>, config: C) {
  const root = document.createElement('div'); document.body.append(root);
  const deps = fakeDeps();
  const store = createStore(deps);
  const onComplete = vi.fn();
  let showMe = false;
  const draw = () => render(<StoreContext.Provider value={store}>
    <Widget step={{ ...login.steps[0]!, config }} config={config}
      onComplete={onComplete} showMe={showMe} />
  </StoreContext.Provider>, root);
  await act(draw);
  return { root, deps, store, onComplete,
    async reveal() { await act(() => { showMe = true; store.revealCount.value++; draw(); }); },
    async hide() { await act(() => { showMe = false; draw(); }); },
    async unmount() { await act(() => render(null, root)); root.remove(); },
  };
}
export async function openEntry(root: HTMLElement, name: string, keyboard = false) {
  await act(() => {
    button(root, name).dispatchEvent(keyboard
      ? new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })
      : new MouseEvent('dblclick', { bubbles: true }));
  });
}
export async function activate(root: HTMLElement, name: string, key: 'Enter' | ' ' = 'Enter') {
  await act(() => {
    const element = button(root, name); element.focus();
    element.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key, bubbles: true }));
    // jsdom does not synthesize native button activation from keyboard events.
    element.click();
  });
}
export async function pointer(target: EventTarget, type: string, x: number, y: number, pointerId = 1) {
  await act(() => {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, button: 0 });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    target.dispatchEvent(event);
  });
}
