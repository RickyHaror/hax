import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, expect, it, vi } from 'vitest';
import { Start } from './screens/Start';
import { createStore, StoreContext } from './store';
import { login } from './test/fixtures';
import { fakeDeps, input, unmount } from './test/helpers';
import { Answer } from './widgets/Answer';
import { PasswordGuess } from './widgets/cases/PasswordGuess';
import { caseStep, passwordConfig } from './widgets/cases/fixtures';
import { Passphrase } from './widgets/explorer/Passphrase';

let root: HTMLElement;
afterEach(async () => { if (root) await unmount(root); });

it.each(['start', 'answer', 'guess', 'passphrase'] as const)('%s avoids real credential fields', async (scene) => {
  const store = createStore(fakeDeps());
  const step = login.steps[0]!;
  if (step.config.kind !== 'answer') throw new Error('Expected an answer fixture');
  const config = { kind: 'passphrase' as const, words: ['kite', 'frog', 'moon'], count: 3 };
  const onComplete = vi.fn();
  const scenes = {
    start: <Start />,
    answer: <Answer step={step} config={step.config} password showMe={false} onComplete={onComplete} />,
    guess: <PasswordGuess step={caseStep(passwordConfig)} config={passwordConfig} showMe={false} onComplete={onComplete} />,
    passphrase: <Passphrase step={caseStep(config)} config={config} showMe={false} onComplete={onComplete} />,
  };
  root = document.createElement('div'); document.body.append(root);
  await act(() => { render(<StoreContext.Provider value={store}>{scenes[scene]}</StoreContext.Provider>, root); });
  const fields = [...root.querySelectorAll('input')];
  expect(fields.some((field) => field.type === 'password')).toBe(false);
  expect(fields).toHaveLength(scene === 'passphrase' ? 0 : 1);
  if (scene === 'passphrase') expect(root.querySelector('meter')).toBeTruthy();
  else expect(fields[0]).toBe(input(root, 'Password'));
  for (const field of fields) {
    for (const [name, value] of Object.entries({
      type: 'text', autocomplete: 'off', autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false',
      'data-1p-ignore': 'true', 'data-lpignore': 'true', 'data-bwignore': 'true', 'data-form-type': 'other',
    })) expect(field.getAttribute(name), name).toBe(value);
    expect(field.name).not.toBe(''); expect(field.id).not.toBe('');
    expect(field.name).not.toMatch(/user|login|email|pass/i);
    expect(field.id).not.toMatch(/user|login|email|pass/i);
    expect(field.labels?.[0]?.textContent).toBe('Password');
    expect(field.closest('form')).toBeNull();
  }
  for (const form of root.querySelectorAll('form')) {
    const secrets = form.querySelectorAll('[data-form-type="other"]');
    if (secrets.length) expect(form.querySelectorAll('input[type="text"]')).toHaveLength(secrets.length);
  }
});
