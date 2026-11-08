import './terminal.css';

export interface CommandChipProps {
  command: string;
  hint?: string;
  onType: (command: string) => void;
}

export function CommandChip({ command, hint, onType }: CommandChipProps) {
  return <button type="button" class="command-chip" aria-label={command}
    onClick={() => onType(command.endsWith(' ') ? command : `${command} `)}>
    {command}{hint && <small>{hint}</small>}
  </button>;
}
