export const AVATARS = [
  { word: 'Robot', emoji: '🤖' },
  { word: 'Ninja Cat', emoji: '🐱' },
  { word: 'Alien', emoji: '👽' },
  { word: 'Dino', emoji: '🦖' },
  { word: 'Wizard', emoji: '🧙' },
  { word: 'Astronaut', emoji: '🧑‍🚀' },
  { word: 'Octopus', emoji: '🐙' },
  { word: 'Unicorn', emoji: '🦄' },
] as const;

export function Avatar({ index }: { index: number | null }) {
  const avatar = index === null ? undefined : AVATARS[index];
  return <span class="agent-avatar" role="img" aria-label={avatar?.word ?? 'Pick your photo'}>
    {avatar?.emoji ?? '?'}
  </span>;
}
