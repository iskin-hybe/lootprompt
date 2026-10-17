"use client";

import { ChevronDown } from "lucide-react";
import { useSyncExternalStore } from "react";
import { legendaryIds, prompts } from "../data";
import { PodiumCard } from "./podium-card";
import "./most-stolen.css";

const STORAGE_KEY = "most-stolen-collapsed";

/** Podium order: #1 in the middle from `sm` up, stacked 1-2-3 on phones. */
const SLOTS = [
  { rank: 1, order: "order-1 sm:order-2" },
  { rank: 2, order: "order-2 sm:order-1" },
  { rank: 3, order: "order-3 sm:order-3" },
];

const TOP_THREE = prompts
  .slice()
  .sort(
    (a, b) =>
      b.copyCount - a.copyCount || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  )
  .slice(0, 3);

const LEGENDARY = legendaryIds(prompts);

// Collapsed state lives in localStorage; an in-memory copy keeps the toggle
// working when storage is unavailable.
const listeners = new Set<() => void>();
let collapsedMemory: boolean | null = null;

function readCollapsed(): boolean {
  if (collapsedMemory !== null) return collapsedMemory;
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(next: boolean) {
  collapsedMemory = next;
  try {
    localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // Storage blocked: the in-memory value still applies.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** "Most Stolen" podium: the three prompts copied most often, with a Hide/Show toggle. */
export function MostStolen() {
  const collapsed = useSyncExternalStore(subscribe, readCollapsed, () => false);

  if (prompts.length < 5 || TOP_THREE.length < 3) return null;

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-8 sm:px-6" aria-label="Most stolen">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="hand-headline text-3xl sm:text-4xl">Most Stolen</h2>
          <p className="mt-1 font-ui text-[0.72rem] text-muted-foreground">
            The loot that leaves the vault most often.
          </p>
        </div>
        <button
          type="button"
          onClick={() => writeCollapsed(!collapsed)}
          aria-expanded={!collapsed}
          className="flex items-center gap-1 font-ui text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
        >
          {collapsed ? "Show" : "Hide"}
          <ChevronDown
            aria-hidden="true"
            className={`size-4 transition-transform duration-300 ${collapsed ? "" : "rotate-180"}`}
          />
        </button>
      </div>
      {collapsed ? null : (
        <div className="podium mt-6 grid grid-cols-1 items-end gap-6 sm:grid-cols-3">
          {SLOTS.map(({ rank, order }, i) => {
            const prompt = TOP_THREE[i];
            return (
              <div key={prompt.id} className={`${order} podium-slot`} data-rank={rank}>
                <PodiumCard prompt={prompt} rank={rank} legendary={LEGENDARY.has(prompt.id)} />
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
