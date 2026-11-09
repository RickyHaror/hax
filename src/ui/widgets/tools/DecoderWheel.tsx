import { screenLines, speechCatalog } from '../../speech-catalog';
import type { ComponentChildren, TargetedKeyboardEvent, TargetedPointerEvent } from 'preact';
import { useRef } from 'preact/hooks';
import { ALPHABET, caesarDecode, normalizeShift } from '../../../engine/cipher';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { useStore } from '../../store';
import { ReadingBox } from './ReadingBox';

export interface DecoderWheelProps {
  message?: string; shift: number; onShift: (shift: number) => void;
  children?: ComponentChildren; secretMessage?: ComponentChildren; footer?: ComponentChildren;
}
function Ring({ radius, shift = 0 }: { radius: number; shift?: number }) {
  return <>{[...ALPHABET].map((letter, index) => {
    const angle = ((index + shift) * 2 * Math.PI / 26) - Math.PI / 2;
    return <span class="wheel-letter" key={letter} style={{
      left: `${(170 + radius * Math.cos(angle)) / 3.4}%`,
      top: `${(170 + radius * Math.sin(angle)) / 3.4}%`,
    }}>{letter}</span>;
  })}</>;
}
function WheelFace({ current }: { current: number }) {
  return <>
    <svg viewBox="0 0 340 340" width="340" height="340" aria-hidden="true">
      <circle cx="170" cy="170" r="164" class="wheel-outer" />
      <g class="wheel-inner" style={{ transform: `rotate(${current * 360 / 26}deg)` }}>
        <circle cx="170" cy="170" r="134" />
      </g>
      <path d="M170 66 L164 80 L176 80 Z" class="wheel-pointer" />
    </svg>
    <div class="wheel-letters" aria-hidden="true"><Ring radius={149} />
      <div class="wheel-inner-letters">
        <Ring radius={119} shift={current} />
      </div>
    </div>
  </>;
}
function useWheelDrag(current: number, onShift: (shift: number) => void) {
  const drag = useRef<{ id: number; angle: number; total: number; start: number } | null>(null);
  function angle(event: TargetedPointerEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    return Math.atan2(event.clientY - rect.y - rect.height / 2, event.clientX - rect.x - rect.width / 2);
  }
  return {
    onPointerDown(event: TargetedPointerEvent<HTMLDivElement>) {
      if (event.button !== 0 || drag.current) return;
      event.preventDefault();
      event.currentTarget.focus();
      event.currentTarget.setPointerCapture(event.pointerId);
      drag.current = { id: event.pointerId, angle: angle(event), total: 0, start: current };
    },
    onPointerMove(event: TargetedPointerEvent<HTMLDivElement>) {
      const state = drag.current;
      if (!state || state.id !== event.pointerId) return;
      const next = angle(event);
      state.total += Math.atan2(Math.sin(next - state.angle), Math.cos(next - state.angle));
      state.angle = next;
      const shift = normalizeShift(state.start + Math.round(state.total * 26 / (2 * Math.PI)));
      if (shift !== current) onShift(shift);
    },
    onPointerUp(event: TargetedPointerEvent<HTMLDivElement>) {
      if (drag.current?.id !== event.pointerId) return;
      drag.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    },
    onPointerCancel() { drag.current = null; },
    onLostPointerCapture() { drag.current = null; },
  };
}
export function DecoderWheel({ message, shift, onShift, children, secretMessage, footer }: DecoderWheelProps) {
  const store = useStore();
  const current = normalizeShift(shift);
  const drag = useWheelDrag(current, onShift);
  const sharedMessage = message !== undefined && current === 0 ? secretMessage : undefined;
  function turn(amount: number) { onShift(normalizeShift(current + amount)); store.sound.play('click'); }
  function keyDown(event: TargetedKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); turn(-1); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); turn(1); }
  }
  return <section class="decoder-wheel">
    <div class="wheel-layout">
      <div class="wheel-space"><div class="wheel-control" role="slider" tabIndex={0} aria-label={speechCatalog.tools.decoder.text}
        aria-valuemin={0} aria-valuemax={25} aria-valuenow={current} aria-valuetext={`Shift: ${current}`}
        onKeyDown={keyDown} {...drag}>
        <WheelFace current={current} />
      </div></div>
      <div class="wheel-actions">
        <ReadingBox>
          <div class="decoder-messages">
            {!sharedMessage && secretMessage}
            {message !== undefined && <div class="decoded-preview" aria-label="Decoded message" aria-live="polite">
              {sharedMessage || <SpeechLine line={{ text: caesarDecode(message, current) }} />}
            </div>}
          </div>
          {children}
        </ReadingBox>
        <div class="wheel-turns">
          <BigButton onClick={() => turn(-1)}>Turn left</BigButton>
          <BigButton onClick={() => turn(1)}>Turn right</BigButton>
        </div>
        <div aria-live="polite"><SpeechLine line={screenLines.shift(current)} /></div>
        {footer}
      </div>
    </div>
  </section>;
}
