// @vitest-environment jsdom
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import type { PassphraseConfig } from '../../../engine/types';
import { b5Passwords } from '../../../missions/b5-passwords';
import { button, click } from '../../test/helpers';
import { Passphrase } from './Passphrase';
import { activate, mountWidget } from './testHelpers';

let mounted: Awaited<ReturnType<typeof mountWidget<PassphraseConfig>>>;
afterEach(async () => { await mounted?.unmount(); });
const config = b5Passwords.steps[2]!.config as PassphraseConfig;
describe('passphrase', () => {
  it('adds and removes distinct words, grows strength, and completes only on Check', async () => {
    mounted = await mountWidget(Passphrase, config);
    expect(button(mounted.root, 'Check').disabled).toBe(true);
    await click(mounted.root, 'Check');
    expect(mounted.onComplete).not.toHaveBeenCalled();
    await activate(mounted.root, 'kite', ' ');
    expect(mounted.root.querySelector('meter')?.value).toBe(1);
    expect(mounted.root.textContent).toContain('Pick 2 more words.');
    await click(mounted.root, 'kite');
    expect(mounted.root.querySelector('meter')?.value).toBe(0);
    await click(mounted.root, 'kite'); await click(mounted.root, 'frog');
    expect(mounted.root.textContent).toContain('Pick 1 more word.');
    await click(mounted.root, 'moon');
    expect(mounted.root.textContent).toContain('kite-frog-moon');
    expect(mounted.root.querySelector('meter')?.getAttribute('aria-label')).toBe('Strength');
    expect(mounted.root.querySelector('meter')?.value).toBe(3);
    expect(button(mounted.root, 'Check').disabled).toBe(false);
    await click(mounted.root, 'duck');
    expect(mounted.root.textContent).toContain('kite-frog-moon');
    expect(mounted.root.textContent).toContain('Your team is full. Tap a word to swap it.');
    expect(mounted.deps.sound.play).toHaveBeenLastCalledWith('tryAgain');
    await activate(mounted.root, 'Check'); await click(mounted.root, 'Check');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
    expect(mounted.deps.sound.play).toHaveBeenLastCalledWith('success');
  });
  it('fills the remaining words, lets him change them, and handles repeated help', async () => {
    mounted = await mountWidget(Passphrase, config);
    await click(mounted.root, 'star'); await mounted.reveal();
    expect(mounted.root.textContent).toContain('star-kite-frog');
    expect(mounted.onComplete).not.toHaveBeenCalled();
    await click(mounted.root, 'kite');
    expect(button(mounted.root, 'Check').disabled).toBe(true);
    await act(() => { mounted.store.revealCount.value++; });
    expect(mounted.root.textContent).toContain('star-frog-kite');
    await click(mounted.root, 'Check');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
  });
  it('keeps all words, reading controls, and Check in the native tab order', async () => {
    mounted = await mountWidget(Passphrase, config);
    await mounted.reveal();
    for (const element of mounted.root.querySelectorAll('button')) {
      expect(element.tabIndex).toBe(0); element.focus(); expect(document.activeElement).toBe(element);
    }
  });
});
