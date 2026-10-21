// Pure helpers ported from lootprompt.com's prompt-card / use-steal chunks.
import { SNAPSHOT_AT, type Orientation, type Prompt } from "../data";

/** Gallery category tabs, in source order. */
export const CATEGORIES = ["All", "Video", "Photo", "Video + Photo", "Audio"] as const;
export type CategoryTab = (typeof CATEGORIES)[number];

export const ORIENTATION_LABELS: Record<Orientation, string> = {
  portrait: "Portrait",
  landscape: "Landscape",
  square: "Square",
};

/** Minimum counts before an engagement number is shown at all. */
const ENGAGEMENT_MIN = { views: 50, likes: 10, steals: 5 } as const;

export function showsCount(kind: keyof typeof ENGAGEMENT_MIN, value: number | null | undefined) {
  return (value ?? 0) >= ENGAGEMENT_MIN[kind];
}

/** Hover delay before a card's motion version starts. */
export const MOTION_DELAY_MS = 300;
/** Max tilt in degrees while the pointer moves over a card. */
export const TILT_MAX_DEG = 6;
/** How long after focusing a card the slow zoom starts. */
export const SETTLE_MS = 320;

export const EASE_OUT_EXPO = "cubic-bezier(0.22, 1, 0.36, 1)";

export function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (/input|textarea|select/i.test(el.tagName) || el.isContentEditable);
}

export function inViewport(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth;
}

const TOKEN_RE = /\{\{\s*([^:{}]+?)\s*:\s*([^{}]+?)\s*\}\}/g;

/** Resolves `{{name: original | alt}}` remix tokens to their original text. */
export function cleanPrompt(text: string): string {
  return text.replace(TOKEN_RE, (_match, name: string, options: string) => {
    const first = options
      .split("|")
      .map((s) => s.trim())
      .filter(Boolean)[0];
    return first ?? name.trim();
  });
}

/** One-line teaser of the prompt shown under the title on hover. */
export function lootLine(prompt: string): string {
  const flat = cleanPrompt(prompt).replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 59).trimEnd()}…` : flat;
}

/** 1.2k / 3.4m style counts. */
export function formatCount(n: number): string {
  if (n < 1e3) return String(n);
  if (n < 1e6) {
    const k = n / 1e3;
    return `${k < 10 ? k.toFixed(1).replace(/\.0$/, "") : Math.round(k)}k`;
  }
  const m = n / 1e6;
  return `${m < 10 ? m.toFixed(1).replace(/\.0$/, "") : Math.round(m)}m`;
}

/** CSS aspect-ratio for a card's media box. */
export function aspectRatio(aspect: Prompt["aspect"]): string {
  if (aspect.width && aspect.height) return `${aspect.width} / ${aspect.height}`;
  return aspect.orientation === "landscape" ? "16 / 9" : "9 / 16";
}

/** Published in the last 48 hours (relative to the data snapshot). */
export function isFresh(createdAt: string): boolean {
  const t = Date.parse(createdAt);
  return Number.isFinite(t) && Date.parse(SNAPSHOT_AT) - t < 48 * 36e5;
}

/** Steals between midnight and 5am count as night jobs. */
export function isNight(at: number = Date.now()): boolean {
  const h = new Date(at).getHours();
  return h >= 0 && h < 5;
}

/** Small resting tilt (-1.2deg … 1.2deg) derived from the prompt id. */
export function restingTilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) % 1e5;
  return Number((((h % 241) - 120) / 100).toFixed(2));
}

function fnv1a(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i += 1) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export interface PaperLook {
  sheets: 1 | 2;
  rotA: number;
  rotB: number;
  wear: "fold" | "ring";
  wearX: number;
  wearY: number;
  wearRot: number;
  wearSize: number;
}

/** Deterministic paper stack + wear mark for a card. */
export function paperLook(id: string): PaperLook {
  const h = fnv1a(id);
  const bits = (shift: number, mod: number) => (h >> shift) % mod;
  return {
    sheets: bits(2, 2) === 0 ? 1 : 2,
    rotA: (bits(4, 130) - 65) / 100,
    rotB: (bits(8, 170) - 85) / 100,
    wear: bits(11, 2) === 0 ? "fold" : "ring",
    wearX: 8 + bits(13, 72),
    wearY: 12 + bits(17, 62),
    wearRot: bits(19, 90) - 45,
    wearSize: 44 + bits(21, 46),
  };
}

export function paperStyle(look: PaperLook): Record<string, string> {
  return {
    "--sheet-a": `${look.rotA}deg`,
    "--sheet-b": `${look.rotB}deg`,
    "--wear-x": `${look.wearX}%`,
    "--wear-y": `${look.wearY}%`,
    "--wear-rot": `${look.wearRot}deg`,
    "--wear-size": `${look.wearSize}px`,
  };
}

/** Random stamp angle for the STOLEN ink stamp. */
export function stampAngle(): number {
  return Number((Math.random() * 16 - 8).toFixed(2));
}

/** Copies text, falling back to a hidden textarea when the async API is blocked. */
export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // fall through to the legacy path
    }
  }
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.left = "-9999px";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  area.setSelectionRange(0, area.value.length);
  const ok = document.execCommand("copy");
  area.remove();
  if (!ok) throw new Error("Clipboard is unavailable");
}
