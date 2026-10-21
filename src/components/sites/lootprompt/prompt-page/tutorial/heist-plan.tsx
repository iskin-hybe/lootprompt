"use client";

import { ListOrdered } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { flushSync } from "react-dom";
import { prefersReducedMotion } from "../../gallery/lib";

const PLAN_TITLE = "The plan for this heist";

interface PlanEntry {
  id: string;
  label: string;
  /** `h2` steps are numbered; `h3` sub-headings are indented under them. */
  step: boolean;
}

/** Anchor id for a heading without one (source `Ge`). */
function planAnchorId(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `plan-${index + 1}${slug ? `-${slug}` : ""}`;
}

/** Frames without scroll movement that count as "the scroll has come to rest". */
const SETTLE_FRAMES = 8;
const MAX_REALIGNS = 6;
const FOLLOW_TIMEOUT_MS = 6000;
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "pointerdown", "keydown"] as const;

/**
 * Scrolls a heading to its scroll margin (`.doc-anchor`) the way the source does, then keeps
 * it there. The article's lazy images reserve no space, so the ones the scroll passes load
 * and push the heading down by hundreds of pixels; each time the page comes to rest away from
 * the heading it scrolls again. Any user scroll input ends the follow-up, as does the
 * returned function.
 */
function scrollToHeading(target: HTMLElement): () => void {
  const behavior: ScrollBehavior = prefersReducedMotion() ? "auto" : "smooth";
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const startedAt = performance.now();
  let frame = 0;
  let lastY = Number.NaN;
  let stillFrames = 0;
  let realigns = 0;

  const stop = () => {
    cancelAnimationFrame(frame);
    for (const type of USER_SCROLL_EVENTS) window.removeEventListener(type, stop, true);
  };

  const tick = () => {
    const y = window.scrollY;
    stillFrames = y === lastY ? stillFrames + 1 : 0;
    lastY = y;
    if (stillFrames >= SETTLE_FRAMES) {
      const offset = target.getBoundingClientRect().top - margin;
      const maxY = document.documentElement.scrollHeight - window.innerHeight;
      const blocked = offset > 0 ? y >= maxY - 1 : y <= 0;
      if (Math.abs(offset) < 2 || blocked || realigns >= MAX_REALIGNS) {
        stop();
        return;
      }
      realigns += 1;
      stillFrames = 0;
      target.scrollIntoView({ behavior, block: "start" });
    }
    if (performance.now() - startedAt > FOLLOW_TIMEOUT_MS) {
      stop();
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  target.scrollIntoView({ behavior, block: "start" });
  for (const type of USER_SCROLL_EVENTS) window.addEventListener(type, stop, { capture: true, passive: true });
  frame = requestAnimationFrame(tick);
  return stop;
}

/**
 * "The plan for this heist": the article's headings as a table of contents with scroll-spy
 * (source `Ke`). Fixed to the left of the column from 1280px; below that it is a
 * collapsible pill above the article. Mount it only on the client, after the article.
 */
export function HeistPlan({ containerRef }: { containerRef: RefObject<HTMLElement | null> }) {
  const [entries, setEntries] = useState<PlanEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const headings = useRef<HTMLElement[]>([]);
  const stopFollow = useRef<(() => void) | null>(null);

  useEffect(() => {
    const follow = stopFollow;
    return () => follow.current?.();
  }, []);

  // Collect the article's headings once and give each an anchor.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const found = Array.from(container.querySelectorAll<HTMLElement>("h2.doc-step, h3.doc-sub, h2, h3"));
    const list: PlanEntry[] = [];
    found.forEach((heading, index) => {
      const label = (heading.textContent ?? "").trim();
      if (!label) return;
      heading.id ||= planAnchorId(label, index);
      heading.classList.add("doc-anchor");
      list.push({ id: heading.id, label, step: heading.tagName === "H2" });
    });
    headings.current = found;
    // The list comes from the article's rendered DOM, so it can only be read after mount.
    setEntries(list);
  }, [containerRef]);

  // Scroll-spy: the topmost heading crossing the band 15%–30% down the viewport is active.
  useEffect(() => {
    if (entries.length === 0 || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (records) => {
        const top = records
          .filter((record) => record.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (top) setActiveId(top.target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    for (const heading of headings.current) observer.observe(heading);
    return () => observer.disconnect();
  }, [entries]);

  const list = useMemo(() => {
    const jumpTo = (id: string) => {
      const target = document.getElementById(id);
      if (!target) return;
      // Collapse the inline list before measuring: it sits above the article, so closing it
      // after the scroll starts would shift every heading up by the list's height.
      flushSync(() => {
        setActiveId(id);
        setOpen(false);
      });
      stopFollow.current?.();
      stopFollow.current = scrollToHeading(target);
    };
    let step = 0;
    return (
      <ol className="plan-list">
        {entries.map((entry) => {
          if (entry.step) step += 1;
          return (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => jumpTo(entry.id)}
                className={`plan-link${activeId === entry.id ? " is-active" : ""}${entry.step ? "" : " is-sub"}`}
              >
                {entry.step ? <span className="plan-n">{String(step).padStart(2, "0")}</span> : null}
                <span className="plan-label">{entry.label}</span>
              </button>
            </li>
          );
        })}
      </ol>
    );
  }, [entries, activeId]);

  if (entries.length < 2) return null;

  return (
    <>
      <nav className="plan-float" aria-label={PLAN_TITLE}>
        <p className="plan-title">{PLAN_TITLE}</p>
        {list}
      </nav>
      <nav className="plan-inline" aria-label={PLAN_TITLE}>
        <button type="button" className="plan-inline-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          <ListOrdered className="size-4" aria-hidden="true" />
          {PLAN_TITLE}
          <span className="plan-count">{entries.length}</span>
        </button>
        {open ? <div className="plan-inline-body">{list}</div> : null}
      </nav>
    </>
  );
}
