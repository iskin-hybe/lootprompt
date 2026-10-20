"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { readStorage, useHydrated, writeStorage } from "../../chrome/use-hydrated";
import type { Prompt } from "../../data";
import { LazyMount } from "../../shared/lazy-mount";
import { localPromptHref } from "../../shared/member-view";
import { usePromptPage } from "../context";
import { cardImage, keepBrowsingPicks } from "./related";

/** Closing the pill hides it for the rest of the tab session. */
const DISMISS_KEY = "keep-browsing-dismissed";
/** Desktop: the pill turns up after this long even without scrolling. */
const SHOW_AFTER_MS = 10_000;
/** …or once the reader is this far down the page. */
const SHOW_AT_SCROLL = 0.6;
const WIGGLE_EVERY_MS = 8_000;
const WIGGLE_MS = 1_200;

/** Little safe whose door creaks open on each wiggle (source `Q`). */
function SafeIcon() {
  return (
    <svg className="kb-safe" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
      <rect x="1.5" y="2.5" width="17" height="15" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <g className="kb-safe-door">
        <rect x="3.5" y="4.5" width="11" height="11" rx="1.6" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="9" cy="10" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M9 7.2v-1.3M9 14.1v-1.3M6.2 10H4.9M13.1 10h-1.3"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/**
 * Fixed bottom-right "More in the vault →" pill (source prompt route `He`); hovering
 * it fans out the three most-stolen neighbouring prompts. Mounted on the client only
 * (inside LazyMount), so the dismissal flag can be read on first render.
 */
function KeepBrowsingFan({ prompt }: { prompt: Prompt }) {
  const [dismissed, setDismissed] = useState(() => readStorage("session", DISMISS_KEY) === "1");
  const [shown, setShown] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (dismissed || shown) return;
    const show = () => setShown(true);
    const mobile = window.matchMedia("(max-width: 639px)").matches;
    const timer = mobile ? null : window.setTimeout(show, SHOW_AFTER_MS);
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= SHOW_AT_SCROLL) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [dismissed, shown]);

  // A nudge every 8 s while the pill is up.
  useEffect(() => {
    if (!shown) return;
    const timers: number[] = [];
    const interval = window.setInterval(() => {
      setWiggle(true);
      timers.push(window.setTimeout(() => setWiggle(false), WIGGLE_MS));
    }, WIGGLE_EVERY_MS);
    return () => {
      window.clearInterval(interval);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [shown]);

  if (dismissed || !shown) return null;

  const picks = keepBrowsingPicks(prompt);

  return (
    <div
      className={`kb-wrap${open ? " is-open" : ""}${wiggle ? " is-wiggle" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {picks.length > 0 ? (
        <div className="kb-fan" aria-hidden={!open}>
          {picks.map((p, i) => (
            <Link
              key={p.id}
              href={localPromptHref(p.id)}
              className="kb-card"
              style={{ "--kb-i": String(i) } as CSSProperties}
              tabIndex={open ? 0 : -1}
              title={p.title}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- small lazy poster, as on the source */}
              <img src={cardImage(p)} alt={p.title} loading="lazy" className="kb-card-img" />
              <span className="kb-card-title">{p.title}</span>
            </Link>
          ))}
        </div>
      ) : null}
      <div className="kb-pill">
        <Link
          href={{ pathname: "/", query: { category: prompt.category } }}
          className="kb-pill-link"
          onFocus={() => setOpen(true)}
        >
          <SafeIcon />
          More in the vault →
        </Link>
        <button
          type="button"
          className="kb-close"
          aria-label="Dismiss"
          onClick={() => {
            setDismissed(true);
            writeStorage("session", DISMISS_KEY, "1");
          }}
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/**
 * The fan sits behind the source's LazyMount (a 320px spacer at the end of the
 * page until it nears the viewport). The route's other trailing element, the
 * weekly locked-vault code dialog, never opens here: the snapshot has no vault
 * prompt, so no prompt page is locked.
 */
export function PromptKeepBrowsing() {
  const { prompt } = usePromptPage();
  const mounted = useHydrated();
  if (!mounted) return null;
  return (
    <LazyMount minHeight={320}>
      <KeepBrowsingFan key={prompt.id} prompt={prompt} />
    </LazyMount>
  );
}
