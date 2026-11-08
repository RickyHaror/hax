import type { ArtComponent } from '../engine/types';

const MoonKeeper: ArtComponent = ({ size = 144, title = 'Captain Cosmo with a moon rock' }) => (
  <svg width={size} height={size} viewBox="0 0 144 144" role="img">
    <title>{title}</title>
    <circle cx="72" cy="72" r="66" fill="#123b42" stroke="#39ff88" stroke-width="3" />
    <path d="M36 127V108Q36 86 72 86Q108 86 108 108V127" fill="#fff5dc" />
    <circle cx="72" cy="58" r="37" fill="#fff5dc" stroke="#9ce8ed" stroke-width="4" />
    <rect x="38" y="43" width="68" height="35" rx="16" fill="#5dbad0" />
    <ellipse cx="72" cy="60" rx="25" ry="22" fill="#ffc994" />
    <circle cx="62" cy="56" r="3" fill="#123b42" />
    <circle cx="82" cy="56" r="3" fill="#123b42" />
    <path d="M62 68Q72 79 82 68" fill="none" stroke="#123b42" stroke-width="3" stroke-linecap="round" />
    <path d="M28 53V68M116 53V68" stroke="#39ff88" stroke-width="6" stroke-linecap="round" />
    <rect x="55" y="94" width="34" height="23" rx="5" fill="#9ce8ed" />
    <circle cx="65" cy="105" r="4" fill="#39ff88" />
    <path d="M75 101H82M75 109H82" stroke="#123b42" stroke-width="3" stroke-linecap="round" />
    <path d="M90 113L97 99L111 97L122 108L117 125H96Z" fill="#bfc9db" stroke="#658cb8" stroke-width="3" stroke-linejoin="round" />
    <circle cx="105" cy="108" r="4" fill="#658cb8" />
    <circle cx="113" cy="117" r="3" fill="#658cb8" />
    <circle cx="90" cy="119" r="8" fill="#fff5dc" />
    <path d="M25 29V39M20 34H30M115 25V33M111 29H119" stroke="#ffe477" stroke-width="3" stroke-linecap="round" />
  </svg>
);

const LogBadge: ArtComponent = ({ size = 96, title = 'Log Detective badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <rect x="23" y="18" width="48" height="59" rx="6" fill="#fff5dc" stroke="#9ce8ed" stroke-width="3" />
    <path d="M32 29H61M32 40H55M32 51H61M32 62H49" stroke="#658cb8" stroke-width="4" stroke-linecap="round" />
    <path d="M61 61L77 77" stroke="#ffe477" stroke-width="10" stroke-linecap="round" />
    <circle cx="51" cy="51" r="19" fill="#9ce8ed" stroke="#39ff88" stroke-width="5" />
    <circle cx="51" cy="51" r="12" fill="#bfc9db" />
    <circle cx="47" cy="47" r="4" fill="#658cb8" />
    <circle cx="56" cy="55" r="3" fill="#658cb8" />
  </svg>
);

export const m5MoonArt: Record<string, ArtComponent> = {
  'client-m5-moon': MoonKeeper,
  'badge-m5-moon': LogBadge,
};
