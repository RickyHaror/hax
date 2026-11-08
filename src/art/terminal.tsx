import type { ArtComponent } from '../engine/types';

const HelloBadge: ArtComponent = ({ size = 96, title = 'Terminal Pal badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <rect x="19" y="22" width="58" height="46" rx="8" fill="#071410" stroke="#9ce8ed" stroke-width="3" />
    <path d="M29 34L39 43L29 52M47 53H62" fill="none" stroke="#39ff88" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M38 75H58" stroke="#ffe477" stroke-width="5" stroke-linecap="round" />
  </svg>
);

const MoveBadge: ArtComponent = ({ size = 96, title = 'Folder Scout badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <path d="M18 32Q18 26 24 26H41L49 34H72Q78 34 78 40V66Q78 72 72 72H24Q18 72 18 66Z" fill="#ffe477" />
    <path d="M30 53H65M55 43L65 53L55 63" fill="none" stroke="#123b42" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    <circle cx="27" cy="78" r="3" fill="#39ff88" />
    <circle cx="39" cy="81" r="3" fill="#39ff88" />
  </svg>
);

const ToolsBadge: ArtComponent = ({ size = 96, title = 'Tool Star badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <path d="M48 17L57 36L78 39L63 54L67 76L48 66L29 76L33 54L18 39L39 36Z" fill="#ffe477" />
    <path d="M41 39Q42 30 51 34Q61 39 50 47L48 52" fill="none" stroke="#123b42" stroke-width="5" stroke-linecap="round" />
    <circle cx="48" cy="59" r="3" fill="#123b42" />
  </svg>
);

export const terminalArt: Record<string, ArtComponent> = {
  'badge-t1-hello': HelloBadge,
  'badge-t2-move': MoveBadge,
  'badge-t3-tools': ToolsBadge,
};
