import type { WidgetMap } from '../Widget';
import { WebSource } from './WebSource';
import { Decoder } from './Decoder';
import './tools.css';
export { DecoderWheel } from './DecoderWheel';
export const toolWidgets: WidgetMap = { 'web-source': WebSource, decoder: Decoder };
