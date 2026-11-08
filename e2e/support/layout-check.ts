import { expect, type Page } from '@playwright/test';

interface Box { left: number; top: number; right: number; bottom: number; width: number; height: number }
interface Ancestor { name: string; box: Box; x: string; y: string }
interface Item {
  id: number; parents: number[]; name: string; box: Box; ancestors: Ancestor[];
  text: Box[]; fieldText: boolean; font: number; minimum: number; interactive: boolean; enabled: boolean;
  inlineLink: boolean; clipped: boolean; scrollWidth: number; scrollHeight: number;
  clientWidth: number; clientHeight: number;
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const elements = [...document.querySelectorAll('body, body *')];
    const box = (rect: DOMRect): Box => ({ left: rect.left, top: rect.top, right: rect.right,
      bottom: rect.bottom, width: rect.width, height: rect.height });
    const name = (element: Element) => `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}`
      + `${element.classList.length ? `.${[...element.classList].join('.')}` : ''}`;
    const items: Item[] = [];
    for (const [id, element] of elements.entries()) {
      const chain: Element[] = [];
      for (let parent = element.parentElement; parent; parent = parent.parentElement) chain.push(parent);
      const style = getComputedStyle(element), rect = element.getBoundingClientRect();
      // Hidden labels and their descendants have no visible text or tap targets.
      if (!rect.width || !rect.height || element.closest('[aria-hidden="true"]')
        || [element, ...chain].some((node) => { const css = getComputedStyle(node);
          const bounds = node.getBoundingClientRect();
          const hiddenClip = bounds.width <= 1 && bounds.height <= 1
            && (css.clip !== 'auto' || css.clipPath !== 'none');
          return css.display === 'none' || css.visibility === 'hidden' || css.visibility === 'collapse'
            || css.opacity === '0' || css.pointerEvents === 'none'
            || node.matches('span.visually-hidden') || hiddenClip; })) continue;
      const text = [...element.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
        .flatMap((node) => { const range = document.createRange(); range.selectNodeContents(node);
          return [...range.getClientRects()].map(box); });
      // Chrome only: shell bars, navigation, sidekick status, hint status, speech icons.
      const chrome = element.closest('.top-bar, .terminal-titlebar, .player-navigation, .comms-identity small, .rung-state, button[aria-label="Read aloud"]');
      const kid = element.closest('h1, h2, h3, h4, h5, h6, .speech-line, .step-work, [role="log"], .comms-bubble');
      items.push({ id, parents: chain.map((node) => elements.indexOf(node)), name: `${name(element)}[${id}]`,
        box: box(rect), text, fieldText: ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)
          && !!(element.value || element.placeholder)) || element instanceof HTMLSelectElement,
        font: parseFloat(style.fontSize), minimum: chrome ? 12 : innerWidth < 600 || !kid ? 14 : 16,
        interactive: element.matches('button, a, input, textarea, select, [role="button"], [tabindex="0"]'),
        enabled: !element.matches(':disabled, [aria-disabled="true"]'), inlineLink: element.matches('p a'),
        clipped: [style.overflowX, style.overflowY].some((value) => /^(hidden|clip)$/.test(value))
          || style.textOverflow === 'ellipsis',
        scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight,
        clientWidth: element.clientWidth, clientHeight: element.clientHeight,
        ancestors: chain.map((node) => { const css = getComputedStyle(node), rect = node.getBoundingClientRect();
          const sx = node instanceof HTMLElement && node.offsetWidth ? rect.width / node.offsetWidth : 1;
          const sy = node instanceof HTMLElement && node.offsetHeight ? rect.height / node.offsetHeight : 1;
          const left = rect.left + node.clientLeft * sx, top = rect.top + node.clientTop * sy;
          const width = node instanceof HTMLElement ? node.clientWidth * sx : rect.width;
          const height = node instanceof HTMLElement ? node.clientHeight * sy : rect.height;
          return { name: name(node), x: css.overflowX, y: css.overflowY,
            box: { left, top, right: left + width, bottom: top + height, width, height } }; }),
      });
    }
    return { items, width: innerWidth, height: innerHeight,
      documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth };
  });
}

function numbers(box: Box): string {
  return `x=${box.left.toFixed(1)}..${box.right.toFixed(1)}, y=${box.top.toFixed(1)}..${box.bottom.toFixed(1)}`;
}

function scrollBox(item: Item, source: Box): Box {
  let { left, right, top, bottom } = source;
  for (const ancestor of item.ancestors) {
    if (/^(auto|scroll)$/.test(ancestor.x)) {
      left = Math.max(left, ancestor.box.left); right = Math.min(right, ancestor.box.right);
    }
    if (/^(auto|scroll)$/.test(ancestor.y)) {
      top = Math.max(top, ancestor.box.top); bottom = Math.min(bottom, ancestor.box.bottom);
    }
  }
  return { left, right, top, bottom, width: right - left, height: bottom - top };
}

function visibleBox(item: Item, source: Box, width: number, height: number, clipViewportX = true): Box | null {
  let { left, right, top, bottom } = scrollBox(item, source);
  if (clipViewportX) { left = Math.max(0, left); right = Math.min(width, right); }
  top = Math.max(0, top); bottom = Math.min(height, bottom);
  return right > left && bottom > top ? { left, right, top, bottom, width: right - left, height: bottom - top } : null;
}

function textViolations(item: Item, width: number): string[] {
  if (!item.text.length && !item.fieldText) return [];
  const errors: string[] = [];
  if (item.text.length && item.clipped && (item.scrollWidth > item.clientWidth + 1 || item.scrollHeight > item.clientHeight + 1)) {
    errors.push(`${item.name}: clipped text scroll=${item.scrollWidth}x${item.scrollHeight}, client=${item.clientWidth}x${item.clientHeight}`);
  }
  const visibleText = scrollBox(item, item.box);
  if (visibleText.left < 0 || visibleText.right > width) {
    errors.push(`${item.name}: text outside viewport ${numbers(visibleText)}, viewport=0..${width}`);
  }
  let { left, right, top, bottom } = item.box;
  for (const ancestor of item.ancestors) {
    if ((/^(hidden|clip)$/.test(ancestor.x) && (left < ancestor.box.left || right > ancestor.box.right))
      || (/^(hidden|clip)$/.test(ancestor.y) && (top < ancestor.box.top || bottom > ancestor.box.bottom))) {
      errors.push(`${item.name}: text ${numbers({ left, right, top, bottom, width: right - left, height: bottom - top })} clipped by ${ancestor.name} ${numbers(ancestor.box)}`);
    }
    // Scrolling content is intentionally bounded before any outer clipping panel.
    if (/^(auto|scroll)$/.test(ancestor.x)) { left = Math.max(left, ancestor.box.left); right = Math.min(right, ancestor.box.right); }
    if (/^(auto|scroll)$/.test(ancestor.y)) { top = Math.max(top, ancestor.box.top); bottom = Math.min(bottom, ancestor.box.bottom); }
  }
  if (item.font < item.minimum) errors.push(`${item.name}: font=${item.font}px, minimum=${item.minimum}px`);
  return errors;
}

function overlap(first: Box, second: Box, tolerance = 2): string | null {
  const width = Math.min(first.right, second.right) - Math.max(first.left, second.left);
  const height = Math.min(first.bottom, second.bottom) - Math.max(first.top, second.top);
  return width > tolerance && height > tolerance ? `${width.toFixed(1)}x${height.toFixed(1)}px` : null;
}

function isNested(first: Item, second: Item): boolean {
  // Ancestors and descendants intentionally share space in either comparison order.
  return first.parents.includes(second.id) || second.parents.includes(first.id);
}

function overlapViolations(items: Item[], width: number, height: number): string[] {
  const errors: string[] = [];
  const controls = items.filter((item) => item.interactive);
  for (const [index, control] of controls.entries()) {
    const rect = visibleBox(control, control.box, width, height);
    if (!rect) continue;
    for (const other of controls.slice(index + 1)) {
      if (isNested(control, other)) continue;
      const otherRect = visibleBox(other, other.box, width, height);
      const amount = otherRect && overlap(rect, otherRect);
      if (amount) errors.push(`${control.name} overlaps ${other.name} by ${amount} (${numbers(rect)}; ${numbers(otherRect!)})`);
    }
    for (const text of items.filter((item) => item.id !== control.id && !isNested(control, item))) {
      for (const source of text.text) {
        const textRect = visibleBox(text, source, width, height);
        const amount = textRect && overlap(rect, textRect, 0);
        if (amount) errors.push(`${control.name} overlaps text ${text.name} by ${amount} (${numbers(rect)}; ${numbers(textRect!)})`);
      }
    }
  }
  return errors;
}

export async function checkLayout(page: Page, label: string): Promise<void> {
  await page.evaluate(() => document.fonts.ready);
  const { items, width, height, documentWidth, bodyWidth } = await snapshot(page);
  const errors: string[] = [];
  for (const [name, scrollWidth] of [['documentElement', documentWidth], ['body', bodyWidth]] as const) {
    if (scrollWidth > width) errors.push(`${name}: scrollWidth=${scrollWidth}, innerWidth=${width}`);
  }
  const visible = items.filter((item) => visibleBox(item, item.box, width, height, false));
  for (const item of visible) {
    errors.push(...textViolations(item, width));
    if (!item.interactive || !item.enabled) continue;
    if (item.inlineLink) errors.push(`${item.name}: inline paragraph link requires review (${numbers(item.box)})`);
    if (item.box.width < 44 || item.box.height < 44) {
      errors.push(`${item.name}: target=${item.box.width.toFixed(1)}x${item.box.height.toFixed(1)}px, minimum=44x44px`);
    }
  }
  errors.push(...overlapViolations(visible, width, height));
  const lines = [...new Set(errors)].map((error) => `${label}: ${error}`);
  const report = lines.length > 20 ? [...lines.slice(0, 19), `${label}: ${lines.length - 19} more violations`] : lines;
  expect(report, report.join('\n')).toEqual([]);
}
