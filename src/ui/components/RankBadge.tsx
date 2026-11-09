import { screenLines } from '../speech-catalog';
import { RANKS, rankFor } from '../../engine/progress';
import { SpeechLine } from './SpeechLine';
import './rank-badge.css';

export function RankBadge({ xp }: { xp: number }) {
  const rank = rankFor(xp);
  const stripes = RANKS.findIndex((entry) => entry.name === rank.name) + 1;
  return <div class="rank-badge">
    <svg width="96" height="96" viewBox="0 0 96 96" role="img" aria-label={`${rank.name} rank insignia`}>
      <rect x="8" y="8" width="80" height="80" rx="18" />
      {Array.from({ length: stripes }, (_, index) =>
        <path key={index} d={`M28 ${28 + index * 11}l20-10 20 10`} />)}
      {stripes === RANKS.length && <path d="M28 80h40" />}
    </svg>
    <div class="rank-details"><SpeechLine line={{ text: rank.name }} />
      <SpeechLine line={screenLines.rankScore(xp, rank.next?.xp)} />
      <progress aria-label="XP to next rank" value={rank.next ? xp : rank.xp}
        max={rank.next?.xp ?? rank.xp} />
      {rank.next && <SpeechLine line={screenLines.nextRank(rank.next.name)} />}
    </div>
  </div>;
}
