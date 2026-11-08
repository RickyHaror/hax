import type { WidgetMap } from '../Widget';
import { FileExplorer } from './FileExplorer';
import { Choice } from './Choice';
import { Passphrase } from './Passphrase';
import './explorer.css';

export const explorerWidgets: WidgetMap = {
  'file-explorer': FileExplorer,
  choice: Choice,
  passphrase: Passphrase,
};
