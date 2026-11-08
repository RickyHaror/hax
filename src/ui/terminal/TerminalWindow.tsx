import type { ComponentChildren } from 'preact';
import './terminal.css';

export type PromptColor = 'pc-hq' | 'pc-shop' | 'pc-bakery' | 'pc-library';
interface TerminalWindowProps {
  title: string;
  status: string;
  color?: PromptColor;
  children: ComponentChildren;
  controls?: ComponentChildren;
}

export function TerminalWindow({ title, status, color = 'pc-hq', children, controls }: TerminalWindowProps) {
  return <section class="terminal-window" aria-label="Terminal" style={{ '--prompt-color': `var(--${color})` }}>
    <header class="terminal-titlebar"><span>{title}</span>
      <span class="terminal-status"><i aria-hidden="true" />{status}</span>
    </header>
    <div class="terminal-body">{children}</div>
    {controls}
  </section>;
}
