"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "../../gallery/lib";
import { sectionColor, type AnatomySection } from "./anatomy";

const FLASH_MS = 1200;

/** Section chips plus collapsible, colour-coded sections of one prompt (source `Y`). */
export function PromptAnatomy({ sections, uid }: { sections: AnatomySection[]; uid: string }) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [flashed, setFlashed] = useState<string | null>(null);
  const timers = useRef<number[]>([]);
  const allOpen = collapsed.size === 0;

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const jumpTo = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    const reduced = prefersReducedMotion();
    requestAnimationFrame(() => {
      document
        .getElementById(`${uid}-${id}`)
        ?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "nearest" });
    });
    if (reduced) return;
    setFlashed(id);
    timers.current.push(window.setTimeout(() => setFlashed((f) => (f === id ? null : f)), FLASH_MS));
  };

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            onClick={() => jumpTo(section.id)}
            className="rounded-full border border-[var(--paper-line)] px-2 py-0.5 font-ui text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground"
            style={{ borderLeftColor: sectionColor(section), borderLeftWidth: 3 }}
          >
            {section.chip}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setCollapsed(allOpen ? new Set(sections.map((s) => s.id)) : new Set())}
          className="ml-auto font-ui text-[0.65rem] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      <div className="space-y-2">
        {sections.map((section) => {
          const open = !collapsed.has(section.id);
          const color = sectionColor(section);
          return (
            <section
              key={section.id}
              id={`${uid}-${section.id}`}
              className="rounded-r-[6px] border-l-2 pl-3 motion-safe:transition-colors motion-safe:duration-700"
              style={{
                borderLeftColor: color,
                backgroundColor:
                  flashed === section.id ? "color-mix(in oklch, var(--foreground) 6%, transparent)" : undefined,
              }}
            >
              <button
                type="button"
                aria-expanded={open}
                onClick={() => toggle(section.id)}
                className="flex w-full items-center gap-1.5 py-0.5 text-left font-ui text-[0.62rem] uppercase tracking-[0.16em]"
                style={{ color }}
              >
                <span aria-hidden="true" className="inline-block w-2">
                  {open ? "–" : "+"}
                </span>
                {section.kind === "intro" ? "Intro" : section.label}
              </button>
              {open && section.body ? (
                <p className="whitespace-pre-wrap pb-1 font-mono text-[0.78rem] leading-relaxed text-muted-foreground">
                  {section.body}
                </p>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
