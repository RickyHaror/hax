import type { Line } from '../../engine/types';

export const BOOT_LINES: readonly { tag: 'OK' | 'INFO'; line: Line }[] = [
  { tag: 'OK', line: { text: 'Crew tools are ready.' } },
  { tag: 'OK', line: { text: 'The practice computer is ready.' } },
  { tag: 'INFO', line: { text: 'It is all pretend here. Nothing real can break.' } },
];
