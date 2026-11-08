import type { TargetedKeyboardEvent } from 'preact';
import { ALPHABET, caesarDecode, normalizeShift } from '../../../engine/cipher';
import { BigButton } from '../../components/BigButton';
import { SpeechLine } from '../../components/SpeechLine';
import { useStore } from '../../store';

export interface DecoderWheelProps { message?: string; shift: number; onShift: (shift: number) => void }
function Ring({ radius }: { radius: number }) {
  return <>{[...ALPHABET].map((letter, index) => {
    const angle = (index * 2 * Math.PI / 26) - Math.PI / 2;
    return <text key={letter} x={170 + radius * Math.cos(angle)} y={170 + radius * Math.sin(angle)}
      text-anchor="middle" dominant-baseline="central">{letter}</text>;
  })}</>;
}
export function DecoderWheel({ message, shift, onShift }: DecoderWheelProps) {
  const store = useStore();
  const current = normalizeShift(shift);
  function turn(amount: number) { onShift(normalizeShift(current + amount)); store.sound.play('click'); }
  function keyDown(event: TargetedKeyboardEvent<HTMLDivElement>) {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') { event.preventDefault(); turn(-1); }
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') { event.preventDefault(); turn(1); }
  }
  return <section class="decoder-wheel">
    <div class="wheel-layout">
      <div class="wheel-control" role="slider" tabIndex={0} aria-label="Decoder wheel"
        aria-valuemin={0} aria-valuemax={25} aria-valuenow={current} aria-valuetext={`Shift: ${current}`}
        onKeyDown={keyDown}>
        <svg viewBox="0 0 340 340" width="300" height="300" aria-hidden="true">
          <circle cx="170" cy="170" r="164" class="wheel-outer" />
          <Ring radius={146} />
          <g class="wheel-inner" style={{ transform: `rotate(${current * 360 / 26}deg)` }}>
            <circle cx="170" cy="170" r="125" /><Ring radius={105} />
          </g>
          <path d="M170 8 L164 22 L176 22 Z" class="wheel-pointer" />
        </svg>
      </div>
      <div class="wheel-actions">
        <BigButton onClick={() => turn(-1)}>Turn left</BigButton>
        <BigButton onClick={() => turn(1)}>Turn right</BigButton>
        <div aria-live="polite"><SpeechLine line={{ text: `Shift: ${current}` }} /></div>
      </div>
    </div>
    {message !== undefined && <div class="decoded-preview" aria-label="Decoded message" aria-live="polite">
      <SpeechLine line={{ text: caesarDecode(message, current) }} />
    </div>}
  </section>;
}
