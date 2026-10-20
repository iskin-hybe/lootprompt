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
  /** Local 144px thumbnail for images; the source storage URL for videos. */
  src: string;
  /** Full-size original on the source's storage (downloads, video playback). */
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
  /** Local copy of the source's share card, when it has one. */
  ogImage: string | null;
  promptBlocks: PromptBlock[];
  references: PromptDetailReference[];
  /** Tutorial article HTML with media rewritten to local paths (GIFs became `.mp4`). */
  tutorialHtml: string | null;
}

const DETAILS_DIR = path.join(process.cwd(), "src/components/sites/lootprompt/data/prompt-details");

export function findPrompt(id: string): Prompt | null {
  return prompts.find((p) => p.id === id) ?? null;
}

export async function getPromptDetail(id: string): Promise<PromptDetail | null> {
  if (!findPrompt(id)) return null;
  const raw = await readFile(path.join(DETAILS_DIR, `${id}.json`), "utf8");
  return JSON.parse(raw) as PromptDetail;
}
