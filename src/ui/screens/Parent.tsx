import { useState } from 'preact/hooks';
import { useStore } from '../store';
import { BigButton } from '../components/BigButton';
import { PinPad } from './parent/PinPad';
import { ProgressLists } from './parent/ProgressLists';
import { PanelSettings } from './parent/PanelSettings';
import { ProgressActions } from './parent/ProgressActions';
import './parent.css';

export function Parent() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const [changing, setChanging] = useState(false);
  return <div class="parent-screen"><header><h1>Grown-up settings</h1>
    <BigButton onClick={store.back}>Back</BigButton></header>
    {!open || changing ? <PinPad changing={changing} onOpen={() => { setOpen(true); setChanging(false); }} />
      : <div class="parent-reading" role="region" aria-label="Grown-up settings sections" tabIndex={0}>
          <ProgressLists /><PanelSettings /><ProgressActions />
          <section aria-label="Change PIN"><h2>Change PIN</h2>
            <BigButton onClick={() => setChanging(true)}>Change PIN</BigButton></section>
        </div>}
  </div>;
}
