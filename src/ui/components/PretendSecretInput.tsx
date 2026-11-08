import type { TargetedInputEvent } from 'preact';
import { useId, useState } from 'preact/hooks';
import { BigButton } from './BigButton';

interface Props {
  value: string;
  onInput: (event: TargetedInputEvent<HTMLInputElement>) => void;
  onCheck: () => void;
}

export function PretendSecretInput({ value, onInput, onCheck }: Props) {
  const id = `agent-secret-${useId()}`;
  const [visible, setVisible] = useState(false);
  return <>
    <label htmlFor={id}>Password<input id={id} name="agent-secret-word" type="text"
      ref={(field) => { field?.setAttribute('spellcheck', 'false'); }}
      class={visible ? undefined : 'pretend-secret-mask'} value={value} onInput={onInput}
      autoComplete="off" autoCapitalize="off" autoCorrect="off" spellcheck={false}
      data-1p-ignore="true" data-lpignore="true" data-bwignore="true" data-form-type="other"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.isComposing) {
          event.preventDefault(); onCheck();
        }
      }} /></label>
    <BigButton type="button" aria-pressed={visible} onClick={() => setVisible(!visible)}>Show letters</BigButton>
  </>;
}
