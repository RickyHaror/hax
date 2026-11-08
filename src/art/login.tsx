import type { ArtComponent } from '../engine/types';
import { LOGIN_PASSWORD } from '../missions/login';

const LoginScreen: ArtComponent = ({ size = 320, title = 'AGENT HQ practice login' }) => (
  <svg width={size} height={size} viewBox="0 0 320 320" role="img">
    <title>{title}</title>
    <circle cx="160" cy="160" r="154" fill="#39ff88" opacity="0.12" />
    <path d="M138 240V276H182V240" fill="#61c8d2" />
    <rect x="94" y="272" width="132" height="18" rx="9" fill="#9ce8ed" />
    <rect x="12" y="24" width="296" height="222" rx="22" fill="#9ce8ed" />
    <rect x="28" y="40" width="264" height="174" rx="12" fill="#123b42" />
    <text x="160" y="73" text-anchor="middle" fill="#39ff88" font-size="24" font-weight="bold">AGENT HQ</text>
    <rect x="60" y="86" width="200" height="70" rx="12" fill="#071410" stroke="#39ff88" stroke-width="2" />
    <text x="160" y="112" text-anchor="middle" fill="#fff5dc" font-size="20">Password</text>
    <rect x="80" y="123" width="160" height="20" rx="6" fill="#b5ffe0" />
    <rect x="156" y="167" width="140" height="65" rx="3" fill="#ffe477" />
    <path d="M156 167H296V178H156Z" fill="#f5c94c" />
    <text x="226" y="211" text-anchor="middle" fill="#29352f" font-size="24" font-weight="bold">{LOGIN_PASSWORD}</text>
    <circle cx="42" cy="230" r="5" fill="#39ff88" />
  </svg>
);

const LoginBadge: ArtComponent = ({ size = 96, title = 'The Front Door badge' }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" role="img">
    <title>{title}</title>
    <circle cx="48" cy="48" r="43" fill="#123b42" stroke="#39ff88" stroke-width="4" />
    <rect x="27" y="18" width="42" height="61" rx="8" fill="#9ce8ed" />
    <path d="M34 26L62 22V78H34Z" fill="#61c8d2" />
    <circle cx="53" cy="51" r="4" fill="#ffe477" />
    <path d="M23 79H73" stroke="#39ff88" stroke-width="5" stroke-linecap="round" />
  </svg>
);

export const loginArt: Record<string, ArtComponent> = {
  'login-screen': LoginScreen,
  'badge-login': LoginBadge,
};
