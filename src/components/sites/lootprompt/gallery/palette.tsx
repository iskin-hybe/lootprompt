"use client";

// ⌘K command palette (source: command-palette chunk).
import { BriefcaseBusiness, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SITE_ORIGIN, prompts, type Prompt } from "../data";
import { localPromptHref } from "../shared/member-view";
import { InkStamp } from "./card-parts";
import { cleanPrompt, navigateTo, stampAngle } from "./lib";
import { gateCrewOnly } from "./stores";
import { stealPrompt, type StealStamp } from "./use-steal";

/** Subsequence match score: lower is tighter; null when the letters don't all appear in order. */
function fuzzy(text: string, query: string): number | null {
  const hay = text.toLowerCase();
  const needle = query.toLowerCase();
  if (!needle) return 0;
  let at = -1;
  let score = 0;
  for (const ch of needle) {
    const found = hay.indexOf(ch, at + 1);
    if (found === -1) return null;
    score += found - at;
    at = found;
  }
  return score;
}

function rank(prompt: Prompt, query: string): number | null {
  const title = fuzzy(prompt.title, query);
  const body = fuzzy(prompt.prompt.slice(0, 600), query);
  if (title === null && body === null) return null;
  return Math.min(title ?? Infinity, (body ?? Infinity) + 400);
}

export function CommandPalette({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [stamp, setStamp] = useState<StealStamp | null>(null);
  const [navigated, setNavigated] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return prompts.slice(0, 8);
    return prompts
      .map((prompt) => ({ prompt, score: rank(prompt, q) }))
      .filter((r): r is { prompt: Prompt; score: number } => r.score !== null)
      .sort((a, b) => a.score - b.score)
      .slice(0, 8)
      .map((r) => r.prompt);
  }, [query]);

  // ⌘K / Ctrl+K toggles once the palette has loaded.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Reset the cursor and focus the field each time it opens.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setActive(0);
  }
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(timer);
  }, [open]);

  const [lastQuery, setLastQuery] = useState(query);
  if (lastQuery !== query) {
    setLastQuery(query);
    setActive(0);
    setNavigated(false);
  }

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, results.length]);

  const steal = useCallback(async (prompt: Prompt) => {
    if (gateCrewOnly(prompt.id)) {
      setOpen(false);
      return;
    }
    try {
      await stealPrompt(prompt);
      const key = Date.now();
      setStamp({ angle: stampAngle(), key });
      window.setTimeout(() => setStamp((s) => (s && s.key === key ? null : s)), 1300);
    } catch {
      // clipboard refused — nothing to show
    }
  }, []);

  if (!open) return null;

  const openPrompt = (prompt: Prompt) => {
    setOpen(false);
    if (!gateCrewOnly(prompt.id)) router.push(localPromptHref(prompt.id));
  };

  const openJobs = () => {
    setOpen(false);
    navigateTo(`${SITE_ORIGIN}/jobs`);
  };

  return (
    <div
      className="palette-overlay"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="palette-panel paper-grid"
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((i) => (results.length ? (i + 1) % results.length : 0));
            setNavigated(true);
            return;
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
            setNavigated(true);
            return;
          }
          const current = results[active];
          if (e.key === "Enter" && current) {
            e.preventDefault();
            openPrompt(current);
            return;
          }
          if (e.key.toLowerCase() === "c" && !e.metaKey && !e.ctrlKey && !e.altKey && current) {
            // While typing a query, "c" is just a letter until the list is navigated.
            if (!navigated && query.length > 0) return;
            e.preventDefault();
            void steal(current);
          }
        }}
      >
        {stamp ? <InkStamp key={stamp.key} stamp={stamp} /> : null}
        <div className="relative border-b border-[var(--paper-line)]">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prompts..."
            aria-label="Search prompts"
            className="w-full bg-transparent px-12 py-4 font-ui text-base text-foreground outline-none placeholder:text-muted-foreground"
          />
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
        </div>
        <ul ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          <li>
            <button
              type="button"
              onClick={openJobs}
              className="mb-2 flex w-full items-center gap-3 rounded-[10px] border border-[var(--paper-line)] bg-foreground/[0.04] px-3 py-3 text-left transition-colors hover:bg-foreground/[0.07]"
            >
              <span className="grid size-10 place-items-center rounded-[8px] bg-[var(--accent)]/10 text-[var(--accent)]">
                <BriefcaseBusiness className="size-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-ui text-sm font-medium text-foreground">The Job Board</span>
                <span className="block truncate font-mono text-[0.68rem] text-muted-foreground">
                  Pitch a prompt request and back the crew&apos;s next job.
                </span>
              </span>
            </button>
          </li>
          {results.length === 0 ? (
            <li className="px-3 py-6 text-center font-ui text-sm text-muted-foreground">No results</li>
          ) : (
            results.map((prompt, i) => (
              <li key={prompt.id} data-index={i}>
                <button
                  type="button"
                  onMouseEnter={() => {
                    setActive(i);
                    setNavigated(true);
                  }}
                  onClick={() => openPrompt(prompt)}
                  className={`flex w-full items-center gap-3 rounded-[10px] px-2 py-2 text-left transition-colors ${
                    i === active ? "bg-foreground/[0.06]" : ""
                  }`}
                >
                  <span className="size-10 shrink-0 overflow-hidden rounded-[8px] border border-[var(--paper-line)] bg-foreground/5">
                    {prompt.media.src || prompt.media.poster ? (
                      // eslint-disable-next-line @next/next/no-img-element -- 40px thumb of a local poster
                      <img src={prompt.media.src || prompt.media.poster || ""} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-ui text-sm font-medium text-foreground">{prompt.title}</span>
                    <span className="block truncate font-mono text-[0.68rem] text-muted-foreground">
                      {cleanPrompt(prompt.prompt).replace(/\s+/g, " ").slice(0, 90)}
                    </span>
                  </span>
                  <span className="shrink-0 font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {prompt.model}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="flex items-center justify-between gap-3 border-t border-[var(--paper-line)] px-4 py-2 font-ui text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
          <span>↑↓ navigate · ⏎ open</span>
          <span>C steal · Esc close</span>
        </div>
      </div>
    </div>
  );
}
