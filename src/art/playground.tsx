import type { ArtComponent } from '../engine/types';

const PlaygroundDoor: ArtComponent = ({ size = 160, title = 'Agent Playground door' }) => (
  <svg width={size} height={size} viewBox="0 0 160 160" role="img">
    <title>{title}</title>
    <path d="M34 147V62A46 46 0 0 1 126 62V147Z" fill="#123b42" stroke="#39ff88" stroke-width="5" stroke-linejoin="round" />
    <path d="M46 143V63A34 34 0 0 1 114 63V143" fill="none" stroke="#9ce8ed" stroke-width="3" />
    <path d="M60 64L73 76L60 88M83 89H99" fill="none" stroke="#39ff88" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="101" cy="112" r="7" fill="#ffe477" />
    <circle cx="99" cy="110" r="2" fill="#fff5dc" />
    <path d="M27 147H133" stroke="#39ff88" stroke-width="5" stroke-linecap="round" />
    <path d="M20 34V46M14 40H26M139 63V75M133 69H145" stroke="#ffe477" stroke-width="4" stroke-linecap="round" />
    <circle cx="137" cy="31" r="4" fill="#39ff88" />
    <circle cx="19" cy="107" r="4" fill="#9ce8ed" />
  </svg>
);

const EggBadge: ArtComponent = ({ size = 96, title = 'Secret found badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <path d="M48 20C38 20 27 42 27 56C27 70 36 77 48 77C60 77 69 70 69 56C69 42 58 20 48 20Z" fill="#ffe477" />
    <ellipse cx="42" cy="36" rx="3" ry="4" fill="#123b42" />
    <circle cx="55" cy="46" r="4" fill="#123b42" />
    <ellipse cx="38" cy="56" rx="3" ry="4" fill="#123b42" />
    <ellipse cx="54" cy="66" rx="4" ry="3" fill="#123b42" />
    <path d="M24 25V35M19 30H29M75 42V52M70 47H80" stroke="#9ce8ed" stroke-width="3" stroke-linecap="round" />
    <circle cx="72" cy="25" r="3" fill="#39ff88" />
  </svg>
);

export const playgroundArt: Record<string, ArtComponent> = {
  'playground-door': PlaygroundDoor,
  'badge-egg': EggBadge,
};
