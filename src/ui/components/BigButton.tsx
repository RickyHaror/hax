import type { JSX } from 'preact';
export function BigButton(props: JSX.IntrinsicElements['button']) {
  return <button type="button" {...props} />;
}
