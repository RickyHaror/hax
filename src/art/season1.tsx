import type { ArtComponent } from '../engine/types';

const ToyRobotBadge: ArtComponent = ({ size = 96, title = 'Toy Scout badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#0E161A" stroke="#39F28A" stroke-width="4" />
    <path d="M48 21V28M24 47V59M72 47V59M38 68V76M58 68V76" stroke="#3CDCF5" stroke-width="5" stroke-linecap="round" />
    <circle cx="48" cy="19" r="4" fill="#39F28A" />
    <rect x="30" y="29" width="36" height="25" rx="6" fill="#3CDCF5" />
    <rect x="33" y="54" width="30" height="15" rx="4" fill="#39F28A" />
    <circle cx="40" cy="40" r="3" fill="#0A0F12" />
    <circle cx="56" cy="40" r="3" fill="#0A0F12" />
    <path d="M42 48H54" stroke="#0A0F12" stroke-width="3" stroke-linecap="round" />
    <circle cx="48" cy="61" r="3" fill="#0A0F12" />
  </svg>
);

const StickyNoteBadge: ArtComponent = ({ size = 96, title = 'Note Scout badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#0E161A" stroke="#39F28A" stroke-width="4" />
    <path d="M25 23H71V58L55 74H25Z" fill="#3CDCF5" stroke="#E6EDF0" stroke-width="2" stroke-linejoin="round" />
    <path d="M55 74V58H71" fill="#39F28A" stroke="#0A0F12" stroke-width="2" stroke-linejoin="round" />
    <path d="M35 36H60M35 46H60M35 56H45" stroke="#0A0F12" stroke-width="4" stroke-linecap="round" />
  </svg>
);

const HiddenFolderBadge: ArtComponent = ({ size = 96, title = 'Dot Scout badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#0E161A" stroke="#39F28A" stroke-width="4" />
    <path d="M21 70V29H42L49 37H75V70Z" fill="#39F28A" stroke="#E6EDF0" stroke-width="2" stroke-linejoin="round" />
    <path d="M21 43H75V70H21Z" fill="#3CDCF5" stroke="#0A0F12" stroke-width="2" stroke-linejoin="round" />
    <circle cx="48" cy="56" r="6" fill="#0A0F12" />
  </svg>
);

const PageSourceBadge: ArtComponent = ({ size = 96, title = 'Source Star badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#0E161A" stroke="#39F28A" stroke-width="4" />
    <path d="M27 20H57L70 33V76H27Z" fill="#E6EDF0" stroke="#3CDCF5" stroke-width="2" stroke-linejoin="round" />
    <path d="M57 20V33H70" fill="#39F28A" stroke="#0A0F12" stroke-width="2" stroke-linejoin="round" />
    <path d="M41 43L33 51L41 59M56 43L64 51L56 59" fill="none" stroke="#0A0F12" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
    <path d="M38 68H59" stroke="#0A0F12" stroke-width="3" stroke-linecap="round" />
  </svg>
);

const LogSearchBadge: ArtComponent = ({ size = 96, title = 'Log Scout badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#0E161A" stroke="#39F28A" stroke-width="4" />
    <path d="M23 28H68M23 40H68M23 52H68M23 64H48" stroke="#E6EDF0" stroke-width="4" stroke-linecap="round" />
    <circle cx="46" cy="43" r="18" fill="#0A0F12" stroke="#3CDCF5" stroke-width="5" />
    <path d="M59 57L74 73" stroke="#39F28A" stroke-width="9" stroke-linecap="round" />
    <path d="M37 38H55M37 47H50" stroke="#E6EDF0" stroke-width="3" stroke-linecap="round" />
  </svg>
);

const PadlockBadge: ArtComponent = ({ size = 96, title = 'Lock Scout badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#0E161A" stroke="#39F28A" stroke-width="4" />
    <path d="M33 44V33A15 15 0 0 1 63 33V44" fill="none" stroke="#3CDCF5" stroke-width="7" stroke-linecap="round" />
    <rect x="25" y="42" width="46" height="33" rx="7" fill="#39F28A" stroke="#E6EDF0" stroke-width="2" />
    <circle cx="48" cy="55" r="5" fill="#0A0F12" />
    <path d="M48 58V66" stroke="#0A0F12" stroke-width="5" stroke-linecap="round" />
  </svg>
);

export const season1Art: Record<string, ArtComponent> = {
  'badge-s1-m1': ToyRobotBadge,
  'badge-s1-m2': StickyNoteBadge,
  'badge-s1-m3': HiddenFolderBadge,
  'badge-s1-m4': PageSourceBadge,
  'badge-s1-m5': LogSearchBadge,
  'badge-s1-m6': PadlockBadge,
};
