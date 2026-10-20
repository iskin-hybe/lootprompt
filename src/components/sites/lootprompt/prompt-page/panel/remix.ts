// Remix tokens: `{{name: original | alternative | …}}` inside a prompt become
// clickable underlined values (source use-steal chunk, exports `a` and `i`).

export interface RemixToken {
  /** `${name}-${index}`, unique within one prompt. */
  id: string;
  name: string;
  /** The value the author wrote first; what the prompt copies untouched. */
  original: string;
  /** The remaining `|` options, offered as one-click suggestions. */
  suggestions: string[];
}

export type RemixSegment = { kind: "text"; text: string } | { kind: "token"; token: RemixToken };

/** Chosen value per token id; missing ids keep their original value. */
export type RemixValues = Record<string, string>;

const TOKEN_RE = /\{\{\s*([^:{}]+?)\s*:\s*([^{}]+?)\s*\}\}/g;

export function parseRemix(text: string): { segments: RemixSegment[]; tokens: RemixToken[] } {
  const segments: RemixSegment[] = [];
  const tokens: RemixToken[] = [];
  let cursor = 0;
  for (const match of text.matchAll(TOKEN_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) segments.push({ kind: "text", text: text.slice(cursor, index) });
    const name = (match[1] ?? "").trim();
    const options = (match[2] ?? "")
      .split("|")
      .map((option) => option.trim())
      .filter(Boolean);
    const token: RemixToken = {
      id: `${name}-${tokens.length}`,
      name,
      original: options[0] ?? name,
      suggestions: options.slice(1),
    };
    tokens.push(token);
    segments.push({ kind: "token", token });
    cursor = index + match[0].length;
  }
  if (cursor < text.length) segments.push({ kind: "text", text: text.slice(cursor) });
  return { segments, tokens };
}

/** The prompt as it will be copied, with every token replaced by its chosen value. */
export function composeRemix(segments: RemixSegment[], values: RemixValues): string {
  return segments
    .map((segment) => (segment.kind === "text" ? segment.text : (values[segment.token.id] ?? segment.token.original)))
    .join("");
}

export function isRemixed(tokens: RemixToken[], values: RemixValues): boolean {
  return tokens.some((token) => (values[token.id] ?? token.original) !== token.original);
}
