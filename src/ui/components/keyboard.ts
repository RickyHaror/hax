export function isEditingOrInDialog(event: KeyboardEvent): boolean {
  return event.target instanceof Element && Boolean(event.target.closest(
    '[role="dialog"], input, textarea, [contenteditable]:not([contenteditable="false"])',
  ));
}
