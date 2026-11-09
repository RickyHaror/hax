import { speechCatalog } from '../speech-catalog';
import type { ComponentType } from 'preact';
import { useRef } from 'preact/hooks';
import type { Step, StepKind, StepConfig } from '../../engine/types';
import { BigButton } from '../components/BigButton';
import { SpeechLine } from '../components/SpeechLine';
import { Answer } from './Answer';
import { bootcampWidgets } from './bootcamp';
import { explorerWidgets } from './explorer';
import { terminalWidgets } from './terminal';
import { hackWidgets } from './hack';
import { toolWidgets } from './tools';
import { caseWidgets } from './cases';
export interface WidgetProps<C extends StepConfig = StepConfig> {
  step: Step; config: C; onComplete: () => void; showMe: boolean;
}
export type WidgetMap = Partial<{ [K in StepKind]: ComponentType<WidgetProps<Extract<StepConfig, { kind: K }>>> }>;
function Story({ onComplete }: WidgetProps<Extract<StepConfig, { kind: 'story' }>>) {
  const completed = useRef(false);
  return <BigButton onClick={() => { if (!completed.current) { completed.current = true; onComplete(); } }}>Next</BigButton>;
}
export const widgets: WidgetMap = {
  story: Story, answer: Answer,
  ...bootcampWidgets, ...explorerWidgets, ...terminalWidgets, ...hackWidgets, ...toolWidgets, ...caseWidgets,
};
export function StepWidget(props: WidgetProps) {
  const completed = useRef(false);
  const Widget = (Object.hasOwn(widgets, props.config.kind)
    ? widgets[props.config.kind] : undefined) as ComponentType<WidgetProps> | undefined;
  if (Widget) return <Widget {...props} />;
  return <><SpeechLine line={speechCatalog.widgets.unfinished} />
    <BigButton onClick={() => { if (!completed.current) { completed.current = true; props.onComplete(); } }}>Next</BigButton></>;
}
