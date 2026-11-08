// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { ChoiceConfig } from '../../../engine/types';
import { b4Files } from '../../../missions/b4-files';
import { b5Passwords } from '../../../missions/b5-passwords';
import { m2Toys } from '../../../missions/m2-toys';
import { m3Zoo } from '../../../missions/m3-zoo';
import { button, click } from '../../test/helpers';
import { Choice } from './Choice';
import { activate, mountWidget } from './testHelpers';

let mounted: Awaited<ReturnType<typeof mountWidget<ChoiceConfig>>>;
afterEach(async () => { await mounted?.unmount(); });
const config = b4Files.steps[0]!.config as ChoiceConfig;
describe('choice', () => {
  it('keeps wrong options available, reads feedback, and completes just once', async () => {
    mounted = await mountWidget(Choice, config);
    await click(mounted.root, 'File');
    expect(mounted.root.textContent).toContain('Close! A file is like the paper inside.');
    expect(button(mounted.root, 'File').disabled).toBe(false);
    expect(mounted.deps.sound.play).toHaveBeenLastCalledWith('tryAgain');
    expect(mounted.onComplete).not.toHaveBeenCalled();
    await click(mounted.root, 'File');
    const readers = mounted.root.querySelectorAll<HTMLButtonElement>('[aria-label="Read aloud"]');
    readers[readers.length - 1]!.click();
    expect(mounted.deps.voice.speak).toHaveBeenCalledWith(config.options[0]!.feedback, expect.objectContaining({ onEnd: expect.any(Function) }));
    await activate(mounted.root, 'Folder');
    await click(mounted.root, 'Folder');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
    expect(mounted.deps.sound.play).toHaveBeenLastCalledWith('success');
  });
  it('reveals every correct option while waiting for a click', async () => {
    mounted = await mountWidget(Choice, { ...config, correct: ['folder', 'mouse'] });
    await mounted.reveal();
    expect(mounted.root.textContent?.match(/This one!/g)).toHaveLength(2);
    expect(mounted.onComplete).not.toHaveBeenCalled();
    expect(button(mounted.root, 'Mouse').getAttribute('aria-label')).toBe('Mouse');
    await activate(mounted.root, 'Mouse', ' ');
    expect(mounted.onComplete).toHaveBeenCalledTimes(1);
  });
  it('uses native, tabbable buttons for every option and reading action', async () => {
    mounted = await mountWidget(Choice, config);
    for (const element of mounted.root.querySelectorAll('button')) {
      expect(element.tabIndex).toBe(0); element.focus(); expect(document.activeElement).toBe(element);
    }
  });
  it('plays the password, toy, and zoo choice data', async () => {
    for (const mission of [b5Passwords, m2Toys, m3Zoo]) {
      for (const step of mission.steps) {
        if (step.config.kind !== 'choice') continue;
        mounted = await mountWidget(Choice, step.config);
        const correct = step.config.options.find((option) => step.config.kind === 'choice'
          && step.config.correct.includes(option.id))!;
        await click(mounted.root, correct.label);
        expect(mounted.onComplete).toHaveBeenCalledTimes(1);
        await mounted.unmount();
      }
    }
  });
});
