import { render } from 'preact';
import { act } from 'preact/test-utils';
import { vi } from 'vitest';
import type { StorageLike } from '../../engine/progress';
import type { Voice } from '../../engine/voice';
import type { SoundPlayer } from '../../engine/sound';
import { App } from '../App';
import { createStore, type AppStore } from '../store';
import { fixtureRegistry } from './fixtures';
export function memoryStorage(): StorageLike {
  const data = new Map<string, string>();
  return { getItem: (key) => data.get(key) ?? null, setItem: vi.fn((key, value) => { data.set(key, value); }), removeItem: (key) => { data.delete(key); } };
}
export function fakeDeps() {
  const voice: Voice = { supported: true, speak: vi.fn(), speakAll: vi.fn(), cancel: vi.fn(), isSpeaking: () => false };
  const sound: SoundPlayer = { supported: true, muted: false, play: vi.fn(), setMuted: vi.fn() };
  return { registry: fixtureRegistry(), storage: memoryStorage(), voice, sound, now: () => new Date('2026-11-07T12:00:00Z') };
}
export async function mount(store: AppStore) {
  const root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<App store={store} />, root); });
  return root;
}
export async function unmount(root: HTMLElement) {
  await act(() => { render(null, root); }); root.remove();
}
export function button(root: HTMLElement, name: string): HTMLButtonElement {
  const result = [...root.querySelectorAll('button')].find((element) => (element.getAttribute('aria-label') ?? element.textContent?.trim()) === name);
  if (!result) throw new Error(`Missing button: ${name}`);
  return result;
}
export async function click(root: HTMLElement, name: string) {
  await act(() => { button(root, name).click(); });
}
export function input(root: HTMLElement, label: string): HTMLInputElement {
  const element = [...root.querySelectorAll('label')].find((element) => element.firstChild?.textContent === label)?.querySelector('input');
  if (!element) throw new Error(`Missing input: ${label}`);
  return element;
}
export async function fill(root: HTMLElement, label: string, value: string) {
  await act(() => { const element = input(root, label); element.value = value; element.dispatchEvent(new Event('input', { bubbles: true })); });
}
export async function submit(root: HTMLElement) {
  await act(() => { root.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
}
export function identityStore(deps = fakeDeps()) {
  const store = createStore(deps); store.identify(0, 1, 0); return store;
}
