// Tutorial article HTML: GIF-to-MP4 swap and the split around inline prompt blocks
// (source route helper `Be` and the slot pattern from the docx-constants chunk).
import { GIF_SIZES } from "./gif-sizes";

/** Where the article embeds one of the prompt blocks. */
const PROMPT_SLOT = /<div class="doc-prompt-slot" data-prompt-index="(\d+)"><\/div>/g;
const IMG_TAG = /<img\b([^>]*?)\s*\/?>/g;
const ATTRIBUTE = /([a-zA-Z-]+)="([^"]*)"/g;

export type TutorialPart =
  | { kind: "html"; markup: { __html: string } }
  | { kind: "block"; index: number };

function readAttributes(source: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of source.matchAll(ATTRIBUTE)) attributes.set(match[1].toLowerCase(), match[2]);
  return attributes;
}

/**
 * The source's GIFs are served as MP4 re-encodes, so `<img src="….mp4">` becomes a muted,
 * looping, inline video that plays like the GIF did. It keeps the GIF's size so the
 * article lays out as on the source. Attribute values are already escaped in the HTML.
 */
function gifVideo(attributes: Map<string, string>): string {
  const src = attributes.get("src") ?? "";
  const name = src.slice(src.lastIndexOf("/") + 1).replace(/\.mp4$/i, "");
  const size = GIF_SIZES[name];
  const alt = attributes.get("alt") ?? "";
  const className = ["doc-gif", attributes.get("class")].filter(Boolean).join(" ");
  return [
    `<video class="${className}" src="${src}"`,
    // The explicit ratio keeps the GIF's box once the (evenly rounded) video has loaded.
    size ? ` width="${size[0]}" height="${size[1]}" style="aspect-ratio: ${size[0]} / ${size[1]}"` : "",
    ` autoplay muted loop playsinline disablepictureinpicture disableremoteplayback preload="auto"`,
    alt ? ` role="img" aria-label="${alt}"` : ` aria-hidden="true"`,
    `></video>`,
  ].join("");
}

export function swapGifVideos(html: string): string {
  return html.replace(IMG_TAG, (tag, attributeSource: string) => {
    const attributes = readAttributes(attributeSource);
    return /\.mp4$/i.test(attributes.get("src") ?? "") ? gifVideo(attributes) : tag;
  });
}

/** Splits the article into HTML runs and the prompt blocks embedded between them. */
export function splitTutorial(html: string): TutorialPart[] {
  const parts: TutorialPart[] = [];
  let last = 0;
  for (const match of html.matchAll(PROMPT_SLOT)) {
    const start = match.index ?? 0;
    parts.push({ kind: "html", markup: { __html: html.slice(last, start) } });
    parts.push({ kind: "block", index: Number(match[1]) });
    last = start + match[0].length;
  }
  parts.push({ kind: "html", markup: { __html: html.slice(last) } });
  return parts;
}
