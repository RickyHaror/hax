import type { ComponentChildren, RefObject } from 'preact';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';

interface ReadingBoxProps {
  children: ComponentChildren;
  boxRef?: RefObject<HTMLDivElement | null>;
  label?: string;
}

export function ReadingBox({ children, boxRef, label }: ReadingBoxProps) {
  const localRef = useRef<HTMLDivElement>(null);
  const box = boxRef ?? localRef;
  const content = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState(false);
  function measure() {
    const element = box.current;
    if (element) setMore((element.scrollHeight > element.clientHeight + 2
      && element.scrollTop + element.clientHeight < element.scrollHeight - 2)
      || (element.scrollWidth > element.clientWidth + 2
        && element.scrollLeft + element.clientWidth < element.scrollWidth - 2));
  }
  useLayoutEffect(() => {
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(measure);
    if (box.current) observer?.observe(box.current);
    if (content.current) observer?.observe(content.current);
    window.addEventListener('resize', measure);
    return () => { observer?.disconnect(); window.removeEventListener('resize', measure); };
  }, [children]);
  return <div class="reading-frame">
    <div class="reading-box" ref={box} onScroll={measure} tabIndex={0}
      role={label ? 'region' : undefined} aria-label={label}>
      <div class="reading-content" ref={content}>{children}</div>
    </div>
    <span class="reading-cue" aria-hidden="true" hidden={!more}>Scroll for more</span>
  </div>;
}
