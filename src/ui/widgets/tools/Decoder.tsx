import { speechCatalog } from '../../speech-catalog';
import { useEffect, useState } from 'preact/hooks';
import type { DecoderConfig } from '../../../engine/types';
import { normalizeShift } from '../../../engine/cipher';
import { SpeechLine } from '../../components/SpeechLine';
import { useStore } from '../../store';
import { Answer } from '../Answer';
import type { WidgetProps } from '../Widget';
import { DecoderWheel } from './DecoderWheel';

export function Decoder({ step, config, showMe, onComplete }: WidgetProps<DecoderConfig>) {
  const revealCount = useStore().revealCount.value;
  const [shift, setShift] = useState(0);
  useEffect(() => { if (showMe) setShift(normalizeShift(config.shift)); }, [showMe, config.shift, revealCount]);
  return <section class="mission-tool decoder-tool">
    <DecoderWheel message={config.message} shift={shift} onShift={setShift}
      footer={<Answer config={{ kind: 'answer', question: speechCatalog.tools.noteQuestion, answer: config.answer }}
        step={step} showMe={showMe} onComplete={onComplete} />}
      secretMessage={<div class="secret-message" aria-label="Secret message"><SpeechLine line={{ text: config.message }} /></div>}>
      {config.clue && <SpeechLine line={config.clue} />}
    </DecoderWheel>
  </section>;
}
