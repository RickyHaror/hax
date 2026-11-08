import type { ArtComponent } from '../engine/types';

const AgentChief: ArtComponent = ({ size = 144, title = 'Chief Wiggles McGee with a gold badge' }) => (
  <svg width={size} height={size} viewBox="0 0 144 144" role="img">
    <title>{title}</title>
    <circle cx="72" cy="72" r="66" fill="#123b42" stroke="#39ff88" stroke-width="3" />
    <path d="M37 127V110Q37 88 72 88Q107 88 107 110V127" fill="#658cb8" />
    <circle cx="72" cy="64" r="28" fill="#ffc994" />
    <path d="M44 45V29Q72 12 100 29V45Z" fill="#658cb8" />
    <path d="M39 45Q72 35 105 45L98 51H46Z" fill="#9ce8ed" />
    <path d="M72 23L75 29L82 30L77 35L78 42L72 39L66 42L67 35L62 30L69 29Z" fill="#ffe477" />
    <circle cx="62" cy="61" r="3" fill="#123b42" />
    <circle cx="82" cy="61" r="3" fill="#123b42" />
    <path d="M62 73Q72 84 82 73" fill="none" stroke="#123b42" stroke-width="3" stroke-linecap="round" />
    <path d="M57 92L72 105L87 92M72 105V126" fill="none" stroke="#9ce8ed" stroke-width="4" />
    <path d="M94 100L97 107L105 108L99 114L100 122L94 118L87 122L88 114L82 108L90 107Z" fill="#ffe477" />
  </svg>
);

const GraduationBadge: ArtComponent = ({ size = 96, title = 'Chief Agent graduation badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <path d="M29 42V61Q48 75 67 61V42" fill="#658cb8" stroke="#9ce8ed" stroke-width="3" />
    <path d="M15 36L48 21L81 36L48 51Z" fill="#9ce8ed" stroke="#658cb8" stroke-width="3" stroke-linejoin="round" />
    <path d="M48 36L76 40V60" fill="none" stroke="#ffe477" stroke-width="3" stroke-linecap="round" />
    <path d="M72 61H80L83 73H69Z" fill="#ffe477" />
    <path d="M48 51L52 59L61 60L54 67L56 77L48 72L40 77L42 67L35 60L44 59Z" fill="#ffe477" />
  </svg>
);

export const m7GraduationArt: Record<string, ArtComponent> = {
  'client-m7-graduation': AgentChief,
  'badge-m7-graduation': GraduationBadge,
};
