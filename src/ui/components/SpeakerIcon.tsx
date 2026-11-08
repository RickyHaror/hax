export function SpeakerIcon({ off = false }: { off?: boolean }) {
  return <svg class="speaker-icon" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
    <path d="M3 10h5l6-5v18l-6-5H3z" fill="currentColor" />
    {off ? <path d="m18 10 7 8m0-8-7 8" />
      : <><path d="M18 9q5 5 0 10" /><path d="M22 5q9 9 0 18" /></>}
  </svg>;
}
