import { useMemo, useRef, useState } from 'preact/hooks';
import { VirtualFs } from '../../../engine/fs';
import { goalMet, Shell } from '../../../engine/shell';
import type { TerminalConfig } from '../../../engine/types';
import { useStore } from '../../store';
import type { WidgetProps } from '../Widget';
import { TerminalView } from './TerminalView';
import { solveTerminal } from './solve';

function TerminalStep({ config, showMe, onComplete }: WidgetProps<TerminalConfig>) {
  const store = useStore();
  const shell = useMemo(() => new Shell(new VirtualFs(config.fs, config.cwd), config.commands), [config]);
  const completed = useRef(false);
  const [, refresh] = useState(0);
  function afterRun() {
    refresh((value) => value + 1);
    if (!completed.current && goalMet(config.goal, shell.state)) {
      completed.current = true;
      store.sound.play('success');
      onComplete();
    }
  }
  return <TerminalView shell={shell} chips={config.chips}
    solution={showMe ? solveTerminal(config, shell.state) : undefined} onRun={afterRun} />;
}

export function Terminal(props: WidgetProps<TerminalConfig>) {
  return <TerminalStep key={props.step.id} {...props} />;
}
