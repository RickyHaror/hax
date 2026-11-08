import { badgesEarned, rank } from '../../engine/progress';
import { hackerName, useStore } from '../store';
import { Art } from '../components/Art';
import { AVATARS, Avatar } from '../components/Avatar';
import { BigButton } from '../components/BigButton';
import { SpeechLine } from '../components/SpeechLine';
import { ReadingBox } from '../widgets/tools/ReadingBox';
import './idcard.css';

function EarnedBadges() {
  const store = useStore();
  const badges = badgesEarned(store.progress.value, store.registry.missions);
  return <section class="idcard-badges" aria-label="Earned badges">
    <h2><SpeechLine line={{ text: 'Your badges' }} /></h2>
    <ReadingBox label="Badge collection">
      {badges.length ? <ul>{badges.map((badge) => <li key={badge.id}>
        <Art artKey={badge.art} title={badge.name} size={64} />
        <SpeechLine line={{ text: badge.name }} />
      </li>)}</ul> : <SpeechLine line={{ text: 'Finish a mission to earn your first badge.' }} />}
    </ReadingBox>
  </section>;
}

function PhotoPicker() {
  const store = useStore();
  const chosen = store.progress.value.avatar;
  const word = chosen === null ? 'Pick your photo' : AVATARS[chosen]!.word;
  return <section class="idcard-photos" aria-label="Agent photos">
    <div class="idcard-photo" role="group" aria-label="Your photo">
      <Avatar index={chosen} /><SpeechLine line={{ text: word }} />
    </div>
    <h2><SpeechLine line={{ text: 'Choose a photo' }} /></h2>
    <div class="avatar-picker" role="group" aria-label="Choose a photo">
      {AVATARS.map((avatar, index) => <div class="avatar-tile" key={avatar.word}>
        <BigButton aria-label={avatar.word} aria-pressed={chosen === index}
          onClick={() => store.avatar(index)}><Avatar index={index} /></BigButton>
        <SpeechLine line={{ text: avatar.word }} />
      </div>)}
    </div>
  </section>;
}

export function IdCard() {
  const store = useStore();
  const progress = store.progress.value;
  const buddy = store.registry.sidekicks[progress.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  return <div class="idcard-screen">
    <h1 aria-label="Agent ID card"><SpeechLine line={{ text: 'Agent ID card' }} /></h1>
    <div class="idcard-body">
      <div class="idcard-details">
        <SpeechLine line={{ text: hackerName(store.progress, store.registry) }} />
        <SpeechLine line={{ text: rank(Object.keys(progress.completed).length) }} />
        <section class="idcard-sidekick" aria-label="Your sidekick">
          <Art artKey={buddy.art} title={buddy.name} size={80} />
          <SpeechLine line={{ text: buddy.name }} sidekick={buddy.id} />
        </section>
        <EarnedBadges />
      </div>
      <PhotoPicker />
    </div>
    <BigButton onClick={store.back}>Back</BigButton>
  </div>;
}
