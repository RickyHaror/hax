import type { Mission } from '../../engine/types';
import { BigButton } from './BigButton';
import { SpeechLine } from './SpeechLine';
import './mission-card.css';

export const contractEthics = { text: 'Only hack what you own or have permission to hack.' };

export function MissionCard({ mission, start }: { mission: Mission; start: () => void }) {
  const contract = mission.contract!;
  return <section class="contract-phase" aria-label="Mission briefing">
    <article class="contract-card">
      <header class="contract-bar">Incoming message · HQ</header>
      <div class="contract-content" tabIndex={0} aria-label="Contract details">
        <div class="contract-client"><span class="contract-label">Client</span>
          <SpeechLine line={{ text: contract.client.name }} />
          <SpeechLine line={{ text: contract.client.role }} /></div>
        <dl class="contract-fields">
          <dt>Problem</dt><dd><SpeechLine line={contract.problem} /></dd>
          <dt>Goal</dt><dd><SpeechLine line={contract.goal} /></dd>
        </dl>
        <section class="contract-rule" aria-label="Permission rule">
          <SpeechLine line={contractEthics} />
          <span class="contract-label">Allowed hosts</span>
          {contract.allowed.map((host) => <SpeechLine key={host} line={{ text: host }} />)}
        </section>
      </div>
      <footer><BigButton onClick={start}>Start mission</BigButton></footer>
    </article>
  </section>;
}
