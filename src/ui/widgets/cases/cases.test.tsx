import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { button, click, fill, input, unmount } from '../../test/helpers';
import { caseWidgets } from './index';
import { PasswordGuess } from './PasswordGuess';
import { LogRead } from './LogRead';
import { PhishSpot } from './PhishSpot';
import { logConfig, passwordConfig, phishConfig } from './fixtures';
import { clue, mountCase, press } from './testHelpers';

afterEach(async () => {
  for (const root of [...document.body.children]) await unmount(root as HTMLElement);
});

it('registers all three case widgets', () => {
  expect(caseWidgets['password-guess']).toBe(PasswordGuess);
  expect(caseWidgets['log-read']).toBe(LogRead);
  expect(caseWidgets['phish-spot']).toBe(PhishSpot);
});

describe('PasswordGuess', () => {
  it('shows a read only username, profile art, heading, and readable facts', async () => {
    const { root } = await mountCase(PasswordGuess, passwordConfig);
    expect(root.textContent).toContain('Username: pete');
    expect(root.querySelectorAll('input')).toHaveLength(1);
    expect(root.querySelector('h3')?.textContent).toBe('Pete Pie');
    expect(root.querySelector('svg')?.getAttribute('aria-label')).toBe('Pete Pie');
    expect(root.querySelectorAll('.case-profile .speech-line button')).toHaveLength(3);
  });
  it('nudges wrong tries, accepts alternatives, and completes once with Enter or Check', async () => {
    const { root, deps, onComplete, redraw } = await mountCase(PasswordGuess, passwordConfig);
    await fill(root, 'Password', 'pizza'); await click(root, 'Check');
    expect(root.textContent).toContain('Look at the profile card for a clue.');
    expect(deps.sound.play).toHaveBeenLastCalledWith('tryAgain');
    expect(onComplete).not.toHaveBeenCalled();
    await fill(root, 'Password', ' NOODLES ');
    input(root, 'Password').focus();
    expect(document.activeElement).toBe(input(root, 'Password'));
    expect(button(root, 'Check').type).toBe('button');
    await press(input(root, 'Password'), 'Enter');
    expect(root.textContent).toContain('Access granted');
    expect(root.textContent).not.toContain('Good try.');
    expect(deps.sound.play).toHaveBeenLastCalledWith('success');
    expect(onComplete).toHaveBeenCalledTimes(1);
    const changedCallback = vi.fn();
    await redraw(false, changedCallback); await click(root, 'Check');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(changedCallback).not.toHaveBeenCalled();
  });
  it('toggles password letters with a stable accessible name', async () => {
    const { root } = await mountCase(PasswordGuess, passwordConfig);
    await fill(root, 'Password', 'Noodle');
    expect(input(root, 'Password').type).toBe('text');
    expect(input(root, 'Password').classList.contains('pretend-secret-mask')).toBe(true);
    await click(root, 'Show letters');
    expect(input(root, 'Password').type).toBe('text');
    expect(input(root, 'Password').classList.contains('pretend-secret-mask')).toBe(false);
    expect(input(root, 'Password').value).toBe('Noodle');
    expect(button(root, 'Show letters').getAttribute('aria-pressed')).toBe('true');
    await click(root, 'Show letters');
    expect(input(root, 'Password').type).toBe('text');
    expect(input(root, 'Password').classList.contains('pretend-secret-mask')).toBe(true);
    expect(input(root, 'Password').value).toBe('Noodle');
    expect(button(root, 'Show letters').getAttribute('aria-pressed')).toBe('false');
  });
  it('reveals the clue and refills on each extra third rung without completing', async () => {
    const { root, store, onComplete, redraw } = await mountCase(PasswordGuess, passwordConfig);
    await redraw(true);
    expect(input(root, 'Password').value).toBe('Noodle');
    expect(root.querySelector('.case-highlight')?.textContent).toContain('My cat is called Noodle.');
    expect(onComplete).not.toHaveBeenCalled();
    await fill(root, 'Password', 'changed');
    await act(() => { store.revealCount.value += 1; });
    expect(input(root, 'Password').value).toBe('Noodle');
    await click(root, 'Check');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it('highlights the first fact when no fact contains the password', async () => {
    const { root } = await mountCase(PasswordGuess, { ...passwordConfig, password: 'secret' }, true);
    expect(root.querySelector('.case-highlight')?.textContent).toContain('I bake pizza.');
  });
});

describe('LogRead', () => {
  it('keeps wrong options available, nudges kindly, and completes once', async () => {
    const { root, deps, onComplete } = await mountCase(LogRead, logConfig);
    expect(root.querySelector('h3')?.textContent).toBe('pizza.log');
    await click(root, 'Mia'); await click(root, 'Mia');
    expect(button(root, 'Mia').disabled).toBe(false);
    expect(root.textContent).toContain('Good try. Read the log for a clue.');
    expect(deps.sound.play).toHaveBeenLastCalledWith('tryAgain');
    expect(onComplete).not.toHaveBeenCalled();
    button(root, 'Pete').focus();
    expect(document.activeElement).toBe(button(root, 'Pete'));
    expect(button(root, 'Pete').tabIndex).toBe(0);
    await click(root, 'Pete'); await click(root, 'Pete'); await click(root, 'Mia');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(deps.sound.play).toHaveBeenLastCalledWith('success');
  });
  it('reveals only the correct option and related case insensitive log lines', async () => {
    const { root, onComplete, redraw } = await mountCase(LogRead, logConfig);
    expect(root.querySelectorAll('.case-highlight')).toHaveLength(0);
    await redraw(true);
    expect(button(root, 'Pete').classList.contains('case-glow')).toBe(true);
    expect(button(root, 'Mia').classList.contains('case-glow')).toBe(false);
    expect(root.textContent).toContain('This one!');
    const highlighted = [...root.querySelectorAll('.case-log-lines .case-highlight')];
    expect(highlighted).toHaveLength(2);
    expect(highlighted.every((line) => line.textContent?.includes('PETE'))).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
    await click(root, 'Pete');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it('highlights nothing when the correct label has no matching long word', async () => {
    const { root } = await mountCase(LogRead, { ...logConfig, correct: 'mia' }, true);
    expect(root.querySelectorAll('.case-log-lines .case-highlight')).toHaveLength(0);
  });
});

describe('PhishSpot', () => {
  it('counts unique clues, reads explanations, and completes once at the needed count', async () => {
    const { root, deps, onComplete } = await mountCase(PhishSpot, phishConfig);
    await act(() => { root.querySelector('.case-email')!.dispatchEvent(new MouseEvent('click', { bubbles: true })); });
    expect(root.textContent).toContain('Found 0 of 2');
    expect(deps.sound.play).not.toHaveBeenCalled();
    await act(() => { clue(root, 'your password').click(); clue(root, 'your password').click(); });
    expect(root.textContent).toContain('Found 1 of 2');
    expect(root.textContent).toContain('Keep your password to yourself.');
    expect(onComplete).not.toHaveBeenCalled();
    await click(root.querySelector('.case-found li') as HTMLElement, 'Read aloud');
    expect(deps.voice.speak).toHaveBeenLastCalledWith({ text: 'Keep your password to yourself.' });
    await act(() => { clue(root, 'Hurry now!').click(); clue(root, 'Claim a prize').click(); });
    expect(root.textContent).toContain('Found 2 of 2');
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(deps.sound.play).toHaveBeenCalledTimes(2);
    expect(deps.sound.play).toHaveBeenLastCalledWith('success');
  });
  it('supports focus and Enter or Space for each clue span', async () => {
    const { root, onComplete } = await mountCase(PhishSpot, { ...phishConfig, needed: 3 });
    for (const [index, name] of ['your password', 'Hurry now!', 'Claim a prize'].entries()) {
      const target = clue(root, name);
      expect(target.tabIndex).toBe(0);
      await press(target, 'Escape');
      expect(target.getAttribute('aria-pressed')).toBe('false');
      await press(target, index === 1 ? ' ' : 'Enter');
      expect(document.activeElement).toBe(target);
      expect(target.getAttribute('aria-pressed')).toBe('true');
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it('reveals unfound clues without finding them and stops glowing after discovery', async () => {
    const { root, onComplete, redraw } = await mountCase(PhishSpot, phishConfig);
    await act(() => { clue(root, 'your password').click(); });
    await redraw(true);
    expect(clue(root, 'your password').classList.contains('case-glow')).toBe(false);
    expect(clue(root, 'Hurry now!').classList.contains('case-glow')).toBe(true);
    expect(clue(root, 'Claim a prize').classList.contains('case-glow')).toBe(true);
    expect(onComplete).not.toHaveBeenCalled();
    await press(clue(root, 'Hurry now!'), 'Enter');
    expect(clue(root, 'Hurry now!').classList.contains('case-glow')).toBe(false);
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it('renders pretend link text without any anchor or href', async () => {
    const { root, deps } = await mountCase(PhishSpot, phishConfig);
    expect(root.querySelector('.case-pretend-link')?.textContent).toContain('Claim a prize');
    expect(root.querySelectorAll('a, [href]')).toHaveLength(0);
    const read = root.querySelector('.case-pretend-link button') as HTMLButtonElement;
    await act(() => { read.click(); });
    expect(deps.voice.speak).toHaveBeenLastCalledWith({ text: 'Claim a prize' });
  });
  it('finds from, subject and missing clues, preserving the matched case', async () => {
    const config = { ...phishConfig, needed: 3, email: { from: 'PRIZE Club', subject: 'Free pizza!', body: [] },
      clues: [
        { id: 'from', match: 'prize', explain: { text: 'Check who sent this.' } },
        { id: 'subject', match: 'Free pizza', explain: { text: 'Free gifts can be a trick.' } },
        { id: 'missing', match: 'Secret code', explain: { text: 'Keep codes safe.' } },
      ] };
    const { root, onComplete } = await mountCase(PhishSpot, config, true);
    expect(root.querySelector('.case-pretend-link')).toBeNull();
    for (const name of ['PRIZE', 'Free pizza', 'Secret code']) {
      expect(clue(root, name).classList.contains('case-glow')).toBe(true);
      await press(clue(root, name), 'Enter');
    }
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
  it('keeps overlapping clues reachable through separate fallback buttons', async () => {
    const config = { ...phishConfig, needed: 2,
      clues: [phishConfig.clues[0]!, { id: 'overlap', match: 'PASSWORD', explain: { text: 'Keep it safe.' } }] };
    const { root, onComplete } = await mountCase(PhishSpot, config, true);
    const email = root.querySelector('.case-email')!;
    expect(email.textContent?.match(/Send your password to win\./g)).toHaveLength(1);
    expect(email.contains(clue(root, 'password'))).toBe(false);
    await press(clue(root, 'your password'), 'Enter');
    await press(clue(root, 'password'), 'Enter');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});
