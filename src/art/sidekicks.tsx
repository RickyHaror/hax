import type { ArtComponent } from '../engine/types';

const Bit: ArtComponent = ({ size = 128, title = 'Bit the friendly robot' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" role="img">
    <title>{title}</title>
    <circle cx="64" cy="68" r="57" fill="#39ff88" opacity="0.12" />
    <path d="M64 26V15" stroke="#b5ffe0" stroke-width="5" stroke-linecap="round" />
    <circle cx="64" cy="12" r="6" fill="#39ff88" />
    <rect x="20" y="39" width="13" height="31" rx="6" fill="#39ff88" />
    <rect x="95" y="39" width="13" height="31" rx="6" fill="#39ff88" />
    <rect x="30" y="27" width="68" height="61" rx="24" fill="#9ce8ed" />
    <rect x="38" y="39" width="52" height="34" rx="14" fill="#123b42" />
    <circle cx="50" cy="51" r="5" fill="#39ff88" />
    <circle cx="78" cy="51" r="5" fill="#39ff88" />
    <path d="M55 62Q64 70 73 62" fill="none" stroke="#fff5c9" stroke-width="3" stroke-linecap="round" />
    <rect x="43" y="87" width="42" height="25" rx="12" fill="#61c8d2" />
    <circle cx="64" cy="99" r="5" fill="#39ff88" />
    <path d="M48 112V118M80 112V118" stroke="#b5ffe0" stroke-width="10" stroke-linecap="round" />
  </svg>
);

const Pixel: ArtComponent = ({ size = 128, title = 'Pixel the cheerful fox' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" role="img">
    <title>{title}</title>
    <circle cx="64" cy="68" r="57" fill="#39ff88" opacity="0.12" />
    <path d="M83 106Q120 109 116 69Q99 73 93 91" fill="#ff9c45" />
    <path d="M110 89Q118 80 116 69Q107 71 102 77Z" fill="#fff5dc" />
    <ellipse cx="64" cy="96" rx="25" ry="23" fill="#ff9c45" />
    <ellipse cx="64" cy="101" rx="13" ry="16" fill="#fff5dc" />
    <path d="M29 56L25 16L53 32Q64 27 75 32L103 16L99 56Z" fill="#ff9c45" />
    <path d="M32 39L31 26L43 34M85 34L97 26L96 39" fill="#ffc4af" />
    <path d="M28 49Q64 28 100 49Q99 82 64 90Q29 82 28 49Z" fill="#ff9c45" />
    <path d="M29 57Q45 53 64 74Q83 53 99 57Q91 83 64 90Q37 83 29 57Z" fill="#fff5dc" />
    <path d="M42 54Q47 48 52 54M76 54Q81 48 86 54" fill="none" stroke="#29352f" stroke-width="4" stroke-linecap="round" />
    <ellipse cx="64" cy="72" rx="6" ry="4" fill="#29352f" />
    <path d="M56 79Q64 85 72 79" fill="none" stroke="#29352f" stroke-width="3" stroke-linecap="round" />
    <path d="M43 88Q64 96 85 88" fill="none" stroke="#39ff88" stroke-width="5" />
  </svg>
);

const Hoot: ArtComponent = ({ size = 128, title = 'Hoot the wise owl' }) => (
  <svg width={size} height={size} viewBox="0 0 128 128" role="img">
    <title>{title}</title>
    <circle cx="64" cy="68" r="57" fill="#39ff88" opacity="0.12" />
    <path d="M32 44L29 17L53 30Q64 26 75 30L99 17L96 44Z" fill="#ba91e5" />
    <ellipse cx="64" cy="71" rx="39" ry="44" fill="#ba91e5" />
    <ellipse cx="64" cy="88" rx="23" ry="26" fill="#ead9ff" />
    <path d="M29 60Q10 89 34 100L43 71M99 60Q118 89 94 100L85 71" fill="#8863b4" />
    <circle cx="46" cy="54" r="20" fill="#fff5dc" />
    <circle cx="82" cy="54" r="20" fill="#fff5dc" />
    <circle cx="46" cy="54" r="12" fill="none" stroke="#29352f" stroke-width="3" />
    <circle cx="82" cy="54" r="12" fill="none" stroke="#29352f" stroke-width="3" />
    <path d="M58 53H70M41 55Q46 50 51 55M77 55Q82 50 87 55" fill="none" stroke="#29352f" stroke-width="3" stroke-linecap="round" />
    <path d="M58 70L64 78L70 70Z" fill="#ffc75b" />
    <path d="M54 88L58 92L62 88M67 96L71 100L75 96" fill="none" stroke="#8863b4" stroke-width="3" stroke-linecap="round" />
    <path d="M44 114H54M74 114H84" stroke="#ffc75b" stroke-width="6" stroke-linecap="round" />
    <path d="M29 80Q23 90 34 95" fill="none" stroke="#39ff88" stroke-width="4" stroke-linecap="round" />
  </svg>
);

export const sidekickArt: Record<string, ArtComponent> = {
  'sidekick-bit': Bit,
  'sidekick-pixel': Pixel,
  'sidekick-hoot': Hoot,
};
