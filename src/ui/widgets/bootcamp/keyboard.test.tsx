// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import type { KeyFindConfig, TypingGameConfig } from '../../../engine/types';
import { unmount } from '../../test/helpers';
import { key, mountWidget } from './test-helpers';

afterEach(async () => {
  for (const root of [...document.body.children]) await unmount(root as HTMLElement);
});

const configs: (KeyFindConfig | TypingGameConfig)[] = [
  { kind: 'key-find', keys: ['c', 'a', 't'] },
  { kind: 'typing-game', words: ['cat'], goal: 1 },
];

describe.each(configs)('$kind keyboard isolation', (config) => {
  it.each(['input', 'textarea', 'editable', 'dialog'])('leaves keys alone inside %s', async (kind) => {
    const { complete, deps } = await mountWidget(config);
    const container = document.createElement('div');
    const target = document.createElement(kind === 'input' || kind === 'textarea' ? kind : 'span');
    if (kind === 'editable') container.setAttribute('contenteditable', 'true');
    if (kind === 'dialog') container.setAttribute('role', 'dialog');
    container.append(target); document.body.append(container);
    for (const value of ['x', 'c', 'a', 't', ' ', 'Backspace']) {
      expect((await key(value, target)).defaultPrevented).toBe(false);
    }
    expect(complete).not.toHaveBeenCalled();
    expect(deps.sound.play).not.toHaveBeenCalled();
    for (const value of ['c', 'a', 't']) await key(value);
    expect(complete).toHaveBeenCalledOnce();
  });
});
