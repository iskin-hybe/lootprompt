// Picks for the "Similar heists" grid and the keep-browsing fan, ranked the way the
// source does (prompt route `qe` and `He`) over the snapshot data.
import { homeAggregates, prompts, type Prompt } from "../../data";

/** Same category, or made for the same brand. */
function isNeighbour(current: Prompt, other: Prompt): boolean {
  return other.id !== current.id && (other.category === current.category || sameBrand(current, other));
}

function sameBrand(current: Prompt, other: Prompt): boolean {
  return current.brandId !== null && other.brandId === current.brandId;
}

/** Four neighbours scored by views + 5 × steals, with a 25-point bonus for the same brand. */
export function similarHeists(current: Prompt): Prompt[] {
  const views = homeAggregates.views;
  return prompts
    .filter((p) => isNeighbour(current, p))
    .map((p) => ({ prompt: p, score: (views[p.id] ?? 0) + p.copyCount * 5 + (sameBrand(current, p) ? 25 : 0) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((entry) => entry.prompt);
}

/** The three most-stolen neighbours. */
export function keepBrowsingPicks(current: Prompt): Prompt[] {
  return prompts
    .filter((p) => isNeighbour(current, p))
    .sort((a, b) => b.copyCount - a.copyCount)
    .slice(0, 3);
}

/** Still image for a small card (source `media.poster ?? media.src`). */
export function cardImage(prompt: Prompt): string {
  return prompt.media.poster ?? prompt.media.src;
}
