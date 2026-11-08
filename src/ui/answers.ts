const normalize = (text: string) => text.trim().replace(/\s+/g, ' ').toLowerCase();

export function answersMatch(input: string, answer: string, accept: string[] = []): boolean {
  const value = normalize(input);
  return value.length > 0 && [answer, ...accept].some((candidate) => normalize(candidate) === value);
}
