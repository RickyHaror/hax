import type { ComponentType } from 'preact';
import { useRef } from 'preact/hooks';
import type { Step, StepKind, StepConfig } from '../../engine/types';
import { BigButton } from '../components/BigButton';
import { SpeechLine } from '../components/SpeechLine';
import { Answer } from './Answer';
export interface WidgetProps<C extends StepConfig = StepConfig> {
  step: Step; config: C; onComplete: () => void; showMe: boolean;
}
function Story({ onComplete }: WidgetProps<Extract<StepConfig, { kind: 'story' }>>) {
  const completed = useRef(false);
  return <BigButton onClick={() => { if (!completed.current) { completed.current = true; onComplete(); } }}>Next</BigButton>;
}
export const widgets: Partial<{ [K in StepKind]: ComponentType<WidgetProps<Extract<StepConfig, { kind: K }>>> }> = {
  story: Story, answer: Answer,
};
export function StepWidget(props: WidgetProps) {
  const completed = useRef(false);
  const Widget = (Object.hasOwn(widgets, props.config.kind)
    ? widgets[props.config.kind] : undefined) as ComponentType<WidgetProps> | undefined;
  if (Widget) return <Widget {...props} />;
  return <><SpeechLine line={{ text: 'This part is still being built.' }} />
    <BigButton onClick={() => { if (!completed.current) { completed.current = true; props.onComplete(); } }}>Next</BigButton></>;
}
