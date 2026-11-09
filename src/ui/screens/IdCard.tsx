import { agentNameSpeech, speechCatalog } from '../speech-catalog';
import { badgesEarned, xpEarned } from '../../engine/progress';
import { useStore } from '../store';
import { Art } from '../components/Art';
import { AVATARS, Avatar } from '../components/Avatar';
import { BigButton } from '../components/BigButton';
import { SpeechLine } from '../components/SpeechLine';
import { ReadingBox } from '../widgets/tools/ReadingBox';
import { RankBadge } from '../components/RankBadge';
import './idcard.css';

function EarnedBadges() {
  const store = useStore();
  const badges = badgesEarned(store.progress.value, store.registry.missions);
  return <section class="idcard-badges" aria-label="Earned badges">
    <h2><SpeechLine line={speechCatalog.idCard.badges} /></h2>
    <ReadingBox label="Badge collection">
      {badges.length ? <ul>{badges.map((badge) => <li key={badge.id}>
        <Art artKey={badge.art} title={badge.name} size={64} />
        <SpeechLine line={{ text: badge.name }} />
      </li>)}</ul> : <SpeechLine line={speechCatalog.idCard.firstBadge} />}
    </ReadingBox>
  </section>;
}

function PhotoPicker() {
  const store = useStore();
  const chosen = store.progress.value.avatar;
  const word = chosen === null ? speechCatalog.idCard.pickPhoto.text : AVATARS[chosen]!.word;
  return <section class="idcard-photos" aria-label="Agent photos">
    <div class="idcard-photo" role="group" aria-label="Your photo">
      <Avatar index={chosen} /><SpeechLine line={{ text: word }} />
    </div>
    <h2><SpeechLine line={speechCatalog.idCard.photo} /></h2>
    <div class="avatar-picker" role="group" aria-label={speechCatalog.idCard.photo.text}>
      {AVATARS.map((avatar, index) => <div class="avatar-tile" key={avatar.word}>
        <BigButton aria-label={avatar.word} aria-pressed={chosen === index}
          onClick={() => store.avatar(index)}><Avatar index={index} /></BigButton>
        <SpeechLine line={{ text: avatar.word }} />
      </div>)}
    </div>
  </section>;
}

function CommandsLearned() {
  const store = useStore();
  const commands = [...new Set(store.registry.missions
    .filter((mission) => Object.hasOwn(store.progress.value.completed, mission.id))
    .flatMap((mission) => mission.teaches ?? []))];
  return <section class="idcard-commands" aria-label={speechCatalog.idCard.commands.text}>
    <h2><SpeechLine line={speechCatalog.idCard.commands} /></h2>
    {commands.length ? <ul>{commands.map((command) => <li key={command}>
      <SpeechLine line={{ text: command }} /></li>)}</ul>
      : <SpeechLine line={speechCatalog.idCard.learnCommands} />}
  </section>;
}

export function IdCard() {
  const store = useStore();
  const progress = store.progress.value;
  const buddy = store.registry.sidekicks[progress.sidekick ?? 0] ?? store.registry.sidekicks[0]!;
  return <div class="idcard-screen">
    <h1 aria-label={speechCatalog.idCard.title.text}><SpeechLine line={speechCatalog.idCard.title} /></h1>
    <div class="idcard-body">
      <div class="idcard-details">
        <SpeechLine {...agentNameSpeech(store.registry.firstWords[progress.firstWord ?? 0] ?? store.registry.firstWords[0]!,
          store.registry.secondWords[progress.secondWord ?? 0] ?? store.registry.secondWords[0]!)} />
        <RankBadge xp={xpEarned(progress, store.registry.missions)} />
        <section class="idcard-sidekick" aria-label="Your sidekick">
          <span class="profile-signal"><svg width="40" height="40" viewBox="0 0 24 24"
            role="img" aria-label={buddy.name} fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 10v4M8 7v10M12 4v16M16 8v8M20 11v2" /></svg>
            <span aria-hidden="true">{buddy.name === 'Bit' ? '⚙' : buddy.name === 'Pixel' ? '◇' : '◉'}</span></span>
          <SpeechLine line={{ text: buddy.name }} sidekick={buddy.id} />
        </section>
        <CommandsLearned />
        <EarnedBadges />
      </div>
      <PhotoPicker />
    </div>
    <BigButton onClick={store.back}>Back</BigButton>
  </div>;
}
