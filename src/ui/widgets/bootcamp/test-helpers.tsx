import { render } from 'preact';
import { act } from 'preact/test-utils';
import { vi } from 'vitest';
import type { StepConfig } from '../../../engine/types';
import { login } from '../../test/fixtures';
import { fakeDeps, identityStore, button } from '../../test/helpers';
import { StoreContext } from '../../store';
import { StepWidget } from '../Widget';
export async function mountWidget(config: StepConfig, showMe = false) {
  const root = document.createElement('div'); document.body.append(root);
  const deps = fakeDeps(), store = identityStore(deps), complete = vi.fn();
  const update = async (reveal: boolean) => {
    await act(() => render(<StoreContext.Provider value={store}><StepWidget
      config={config} step={{ ...login.steps[0]!, config }} onComplete={complete} showMe={reveal}
    /></StoreContext.Provider>, root));
  };
  await update(showMe);
  return { root, deps, store, complete, update };
}
export async function key(key: string, target: EventTarget = window, extra: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra });
  await act(() => { target.dispatchEvent(event); });
  return event;
}
export async function activate(root: HTMLElement, name: string, value = 'Enter') {
  const target = button(root, name);
  const event = await key(value, target);
  // jsdom does not implement native keyboard button activation.
  if (!event.defaultPrevented) await act(() => target.click());
}
export async function advance(time: number) { await act(() => { vi.advanceTimersByTime(time); }); }
export function motion(reduced: boolean) {
  const add = vi.fn(), remove = vi.fn();
  vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: reduced, addEventListener: add, removeEventListener: remove })));
  return { add, remove };
}
export async function pointer(target: HTMLElement, type: string, x: number, y: number, pointerId = 1) {
  const event = new Event(type, { bubbles: true });
  Object.assign(event, { clientX: x, clientY: y, button: 0, pointerId });
  await act(() => { target.dispatchEvent(event); });
}
