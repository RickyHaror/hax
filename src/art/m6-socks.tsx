import type { ArtComponent } from '../engine/types';

const StripedSocks: ArtComponent = ({ size = 144, title = 'A cheerful pair of striped socks' }) => (
  <svg width={size} height={size} viewBox="0 0 144 144" role="img">
    <title>{title}</title>
    <circle cx="72" cy="72" r="66" fill="#123b42" stroke="#39ff88" stroke-width="3" />
    <g transform="rotate(12 94 76)">
      <path d="M77 29H108V84L120 98Q128 112 111 121Q99 126 90 115L64 89Q58 81 64 73L77 62Z" fill="#ffe477" stroke="#d8894f" stroke-width="3" stroke-linejoin="round" />
      <path d="M77 39H108M77 53H108M70 70L107 83M66 86L93 100" stroke="#9ce8ed" stroke-width="8" />
      <path d="M105 94Q92 101 94 119" fill="none" stroke="#ff7989" stroke-width="7" />
    </g>
    <g transform="rotate(-12 51 77)">
      <path d="M30 25H64V78L80 92Q95 108 79 120Q68 128 56 116L24 87Q16 79 22 69L30 58Z" fill="#ff7989" stroke="#123b42" stroke-width="3" stroke-linejoin="round" />
      <path d="M30 36H64M30 51H64M26 68L64 79" stroke="#fff5dc" stroke-width="8" />
      <circle cx="40" cy="88" r="3" fill="#123b42" />
      <circle cx="57" cy="97" r="3" fill="#123b42" />
      <path d="M37 99Q42 113 53 108" fill="none" stroke="#123b42" stroke-width="3" stroke-linecap="round" />
    </g>
    <path d="M112 37V49M106 43H118M20 108V118M15 113H25" stroke="#39ff88" stroke-width="3" stroke-linecap="round" />
  </svg>
);

const SockShieldBadge: ArtComponent = ({ size = 96, title = 'Phish Finder badge with a sock and shield' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <path d="M25 20H49V49L60 60Q69 71 58 78Q51 83 43 75L19 55Q14 49 20 42L25 36Z" fill="#ff7989" stroke="#fff5dc" stroke-width="3" stroke-linejoin="round" />
    <path d="M25 29H49M25 40H49" stroke="#ffe477" stroke-width="6" />
    <path d="M67 39L84 46V60Q84 74 67 83Q50 74 50 60V46Z" fill="#39ff88" stroke="#123b42" stroke-width="3" stroke-linejoin="round" />
    <path d="M58 60L65 67L77 53" fill="none" stroke="#123b42" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

export const m6SocksArt: Record<string, ArtComponent> = {
  'client-m6-socks': StripedSocks,
  'badge-m6-socks': SockShieldBadge,
};
