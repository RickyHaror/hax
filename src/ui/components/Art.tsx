import { useStore } from '../store';
export function Art({ artKey, size = 88, title }: { artKey: string; size?: number; title: string }) {
  const art = useStore().registry.art;
  const Component = Object.hasOwn(art, artKey) ? art[artKey] : undefined;
  if (Component) return <Component size={size} title={title} />;
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label={title}>
    <rect x="8" y="8" width="84" height="84" rx="24" fill="#0d2a20" stroke="#39ff9f" stroke-width="4" />
    <circle cx="34" cy="42" r="6" fill="#e8fff4" /><circle cx="66" cy="42" r="6" fill="#e8fff4" />
    <path d="M30 64 Q50 80 70 64" fill="none" stroke="#39ff9f" stroke-width="5" />
  </svg>;
}
