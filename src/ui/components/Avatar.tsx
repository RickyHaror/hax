import { speechCatalog } from '../speech-catalog';
export const AVATARS = [
  { word: speechCatalog.idCard.robot.text, emoji: '🤖' },
  { word: speechCatalog.idCard.ninjaCat.text, emoji: '🐱' },
  { word: speechCatalog.idCard.alien.text, emoji: '👽' },
  { word: speechCatalog.idCard.dino.text, emoji: '🦖' },
  { word: speechCatalog.idCard.wizard.text, emoji: '🧙' },
  { word: speechCatalog.idCard.astronaut.text, emoji: '🧑‍🚀' },
  { word: speechCatalog.idCard.octopus.text, emoji: '🐙' },
  { word: speechCatalog.idCard.unicorn.text, emoji: '🦄' },
] as const;

export function Avatar({ index }: { index: number | null }) {
  const avatar = index === null ? undefined : AVATARS[index];
  return <span class="agent-avatar" role="img" aria-label={avatar?.word ?? speechCatalog.idCard.pickPhoto.text}>
    {avatar?.emoji ?? '?'}
  </span>;
}
