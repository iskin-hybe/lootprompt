"use client";

import { useState, useSyncExternalStore } from "react";
import { PromptCard } from "../gallery/prompt-card";
import { homeAggregates, promptHref, prompts, SNAPSHOT_AT } from "../data";
import "./daily-vault.css";

type SafeState = "locked" | "opening" | "open";

const OPENED_KEY = "daily-vault-opened";
const OPENED_EVENT = "daily-vault-opened-change";

/** The vault's "today" is the snapshot's date in Istanbul (YYYY-MM-DD). */
const TODAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Istanbul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date(SNAPSHOT_AT));

/** "17 October" */
function dayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  if (!y || !m || !d) return day;
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
  });
}

function readOpened(): boolean {
  try {
    return window.localStorage.getItem(OPENED_KEY) === TODAY;
  } catch {
    return false;
  }
}

function markOpened(): void {
  try {
    window.localStorage.setItem(OPENED_KEY, TODAY);
  } catch {}
  window.dispatchEvent(new Event(OPENED_EVENT));
}

function subscribeOpened(onChange: () => void): () => void {
  window.addEventListener("storage", onChange);
  window.addEventListener(OPENED_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(OPENED_EVENT, onChange);
  };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
}

/** Hand-drawn safe; its dial spins and door swings while "opening". */
function SafeArt({ state }: { state: SafeState }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={`daily-safe-art daily-safe-art--${state}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    >
      <rect x="8" y="12" width="104" height="96" rx="6" />
      <rect className="daily-safe-door" x="18" y="22" width="84" height="76" rx="4" />
      <circle className="daily-safe-dial" cx="60" cy="60" r="17" />
      <g className="daily-safe-dial-spokes">
        <path d="M60 43v10M60 67v10M43 60h10M67 60h10" />
      </g>
      <path className="daily-safe-handle" d="M92 56v18" />
      <path d="M24 100v6M96 100v6" />
    </svg>
  );
}

/** "Vault of the Day": crack the safe to reveal today's pick; past days sit in the archive. */
export function DailyVault() {
  const [phase, setPhase] = useState<SafeState>("locked");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [crackedDays, setCrackedDays] = useState<string[]>([]);
  const openedToday = useSyncExternalStore(subscribeOpened, readOpened, () => false);

  const pick = prompts.find((p) => p.id === homeAggregates.daily_pick) ?? null;
  if (!pick) return null;

  const state: SafeState = phase === "locked" && openedToday ? "open" : phase;
  const label = dayLabel(TODAY);
  const history = homeAggregates.daily_history
    .slice(0, 7)
    .map((entry) => ({ day: entry.day, promptId: entry.prompt_id }))
    .filter((entry) => entry.day !== TODAY);

  const crack = () => {
    if (state !== "locked") return;
    markOpened();
    if (prefersReducedMotion()) {
      setPhase("open");
      return;
    }
    setPhase("opening");
    window.setTimeout(() => setPhase("open"), 1500);
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-5 pt-10 sm:px-6" aria-label="Vault of the Day">
      <div className="daily-vault" data-state={state}>
        <div className="daily-vault-head">
          <p className="font-ui text-[0.62rem] uppercase tracking-[0.34em] text-muted-foreground">
            Vault of the Day
          </p>
          <p className="font-hand text-xl leading-none">{label}</p>
        </div>
        {state === "open" ? (
          <div className="daily-vault-reveal">
            <PromptCard prompt={pick} />
            <p className="mt-2 text-center font-hand text-sm text-muted-foreground">
              Steal today&apos;s pick and it counts double.
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={crack}
            className="daily-vault-safe"
            aria-label={`Open the vault of the day — ${label}`}
          >
            <SafeArt state={state} />
            <span className="font-ui text-[0.62rem] uppercase tracking-[0.3em] text-muted-foreground">
              {state === "opening" ? "Opening…" : "Crack it open"}
            </span>
          </button>
        )}
        <div className="daily-vault-archive">
          <button
            type="button"
            onClick={() => setArchiveOpen((v) => !v)}
            aria-expanded={archiveOpen}
            className="font-ui text-[0.65rem] uppercase tracking-[0.26em] text-muted-foreground underline decoration-dotted underline-offset-4 hover:text-foreground"
          >
            Vault archive
          </button>
          {archiveOpen ? (
            <ul className="daily-archive-row">
              {history.map((entry) => {
                const prompt = prompts.find((p) => p.id === entry.promptId);
                if (!prompt) return null;
                const pastLabel = dayLabel(entry.day);
                return (
                  <li key={entry.day} className="daily-archive-item">
                    {crackedDays.includes(entry.day) ? (
                      <a href={promptHref(prompt.id)} className="daily-archive-open">
                        <span className="font-ui text-[0.55rem] uppercase tracking-[0.2em] text-muted-foreground">
                          {pastLabel}
                        </span>
                        <span className="font-hand text-sm leading-tight">{prompt.title}</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCrackedDays((days) => [...days, entry.day])}
                        className="daily-archive-safe"
                        aria-label={`Open the vault from ${pastLabel}`}
                      >
                        <SafeArt state="locked" />
                        <span className="font-ui text-[0.5rem] uppercase tracking-[0.18em] text-muted-foreground">
                          {pastLabel}
                        </span>
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      </div>
    </section>
  );
}
