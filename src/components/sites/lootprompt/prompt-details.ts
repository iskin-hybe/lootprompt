// Server-only access to the per-prompt detail snapshots (tutorial HTML, every prompt
// block, references). Kept out of `data.ts` so the homepage bundle stays small.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { prompts, type Prompt } from "./data";

export interface PromptBlock {
  label: string;
  text: string;
}

export interface PromptDetailReference {
  id: string;
  type: "image" | "video";
  /** Local 144px thumbnail for images; the local H.264 MP4 for videos. */
  src: string;
  /** Local full-size copy (downloads, video playback); videos are re-encoded from MOV/HEVC. */
  original: string;
  /** Storage key, e.g. `references/<prompt>/<file>.mov`. */
  ref: string;
  label: string;
  bytes: number | null;
  durationSeconds: number | null;
}

export interface PromptDetail {
  id: string;
  pipelineInfo: string | null;
  invideoUrl: string | null;
  reelUrl: string | null;
  promptBlocks: PromptBlock[];
  references: PromptDetailReference[];
  /** Tutorial article HTML with media rewritten to local paths (GIFs became `.mp4`). */
  tutorialHtml: string | null;
}

const DETAILS_DIR = path.join(process.cwd(), "src/components/sites/lootprompt/data/prompt-details");

/**
 * The source's generated share card (1200×630 JPEG), copied to `public/` at the same path
 * the source serves it from (`/api/public/og/<id>.jpg`).
 */
export function shareCardPath(id: string): string {
  return `/api/public/og/${encodeURIComponent(id)}.jpg`;
}

export function findPrompt(id: string): Prompt | null {
  return prompts.find((p) => p.id === id) ?? null;
}

export async function getPromptDetail(id: string): Promise<PromptDetail | null> {
  if (!findPrompt(id)) return null;
  const raw = await readFile(path.join(DETAILS_DIR, `${id}.json`), "utf8");
  return JSON.parse(raw) as PromptDetail;
}
