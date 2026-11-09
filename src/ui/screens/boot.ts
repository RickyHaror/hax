import { speechCatalog } from '../speech-catalog';
import type { Line } from '../../engine/types';

export const BOOT_LINES: readonly { tag: 'OK' | 'INFO'; line: Line }[] = [
  { tag: 'OK', line: speechCatalog.boot.toolsReady },
  { tag: 'OK', line: speechCatalog.boot.computerReady },
  { tag: 'INFO', line: speechCatalog.boot.pretend },
];
