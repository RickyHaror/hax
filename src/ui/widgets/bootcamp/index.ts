import type { WidgetMap } from '../Widget';
import { ClickTargets } from './ClickTargets';
import { DragDrop } from './DragDrop';
import { KeyFind } from './KeyFind';
import { TypingGame } from './TypingGame';
import './bootcamp.css';
export const bootcampWidgets: WidgetMap = {
  'click-targets': ClickTargets, 'drag-drop': DragDrop, 'key-find': KeyFind, 'typing-game': TypingGame,
};
