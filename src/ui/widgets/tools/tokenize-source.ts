export type SourceTokenKind = 'text' | 'tag' | 'attribute' | 'string' | 'comment';
export interface SourceToken { kind: SourceTokenKind; text: string }

/** Colours pretend source without parsing or running page code. */
export function tokenizeSource(source: string): SourceToken[] {
  const tokens: SourceToken[] = [];
  let rest = source;
  let inTag = false;
  while (rest) {
    let kind: SourceTokenKind = 'text';
    let text = rest[0]!;
    const comment = rest.match(/^<!--[\s\S]*?(?:-->|$)/);
    const tag = rest.match(/^<\/?[\w:-]+/);
    if (!inTag && comment) { kind = 'comment'; text = comment[0]; }
    else if (!inTag && tag) { kind = 'tag'; text = tag[0]; inTag = true; }
    else if (inTag) {
      const end = rest.match(/^\/?>/);
      const string = rest.match(/^(?:"[^"]*(?:"|$)|'[^']*(?:'|$))/);
      const attribute = rest.match(/^[\w:-]+/);
      if (end) { kind = 'tag'; text = end[0]; inTag = false; }
      else if (string) { kind = 'string'; text = string[0]; }
      else if (attribute) { kind = 'attribute'; text = attribute[0]; }
    }
    const previous = tokens.at(-1);
    if (previous?.kind === kind) previous.text += text;
    else tokens.push({ kind, text });
    rest = rest.slice(text.length);
  }
  return tokens;
}
