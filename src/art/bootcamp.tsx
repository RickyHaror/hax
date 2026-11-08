import type { ArtComponent } from '../engine/types';

function makeBadge(defaultTitle: string, icon: string): ArtComponent {
  return ({ size = 96, title = defaultTitle }) => (
    <svg width={size} height={size} viewBox="0 0 96 96" role="img">
      <title>{title}</title>
      <path d="M26 64L18 92L39 83L48 91L57 83L78 92L70 64" fill="#ba91e5" />
      <circle cx="48" cy="44" r="39" fill="#123b42" stroke="#39ff88" stroke-width="4" />
      <circle cx="48" cy="44" r="31" fill="#9ce8ed" />
      <path d={icon} fill="none" stroke="#123b42" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M42 70L46 74L55 64" fill="none" stroke="#39ff88" stroke-width="4" stroke-linecap="round" />
    </svg>
  );
}

function makeSticker(defaultTitle: string, shape: string, color: string): ArtComponent {
  return ({ size = 128, title = defaultTitle }) => (
    <svg width={size} height={size} viewBox="0 0 128 128" role="img">
      <title>{title}</title>
      <circle cx="64" cy="64" r="59" fill="#39ff88" opacity="0.14" />
      <circle cx="64" cy="64" r="50" fill="#123b42" stroke="#39ff88" stroke-width="3" />
      <path d={shape} fill={color} stroke="#fff5dc" stroke-width="4" stroke-linejoin="round" />
      <path d="M52 72Q64 83 76 72" fill="none" stroke="#123b42" stroke-width="3" stroke-linecap="round" />
      <circle cx="53" cy="61" r="3" fill="#123b42" />
      <circle cx="75" cy="61" r="3" fill="#123b42" />
    </svg>
  );
}

const MouseBadge = makeBadge(
  'Mouse Moves badge',
  'M48 20C34 20 31 31 31 40V48C31 69 65 69 65 48V40C65 31 62 20 48 20ZM48 21V38M32 39H64',
);
const KeysBadge = makeBadge(
  'Key Quest badge',
  'M24 28H72V58H24ZM33 37H35M46 37H48M59 37H61M33 46H35M46 46H48M59 46H61M37 53H59',
);
const TypingBadge = makeBadge(
  'Packet Catcher badge',
  'M27 32L48 22L69 32V55L48 65L27 55ZM27 32L48 43L69 32M48 43V65M37 28L58 38',
);
const FilesBadge = makeBadge(
  'Files and Folders badge',
  'M23 33V26H42L48 33H73V61H23ZM24 40H72M34 49H44',
);
const PasswordsBadge = makeBadge(
  'Password Power badge',
  'M35 39V32C35 15 61 15 61 32V39M29 39H67V64H29ZM48 48V55',
);
const Star = makeSticker(
  'A smiling star',
  'M64 23L76 48L104 52L84 72L89 100L64 87L39 100L44 72L24 52L52 48Z',
  '#ffe477',
);
const Moon = makeSticker(
  'A smiling moon',
  'M94 25C49 9 19 48 32 82C45 116 95 110 108 77C80 89 77 47 94 25Z',
  '#ba91e5',
);
const Heart = makeSticker(
  'A smiling heart',
  'M64 101C40 85 21 66 27 47C34 26 55 28 64 42C73 28 94 26 101 47C107 66 88 85 64 101Z',
  '#ff9c9e',
);

export const bootcampArt: Record<string, ArtComponent> = {
  'badge-b1-mouse': MouseBadge,
  'badge-b2-keys': KeysBadge,
  'badge-b3-typing': TypingBadge,
  'badge-b4-files': FilesBadge,
  'badge-b5-passwords': PasswordsBadge,
  'bootcamp-star': Star,
  'bootcamp-moon': Moon,
  'bootcamp-heart': Heart,
  'sticker-star': Star,
  'sticker-moon': Moon,
  'sticker-heart': Heart,
};
