import type { WidgetMap } from '../Widget';
import { Terminal } from './Terminal';
import './terminal.css';
export { TerminalView } from './TerminalView';
export type { TerminalViewProps } from './TerminalView';
export const terminalWidgets: WidgetMap = { terminal: Terminal };
