"use client";

// "Surprise me" button and the ink circle drawn around the picked card.
import { useEffect, useRef, useState, type ReactNode } from "react";

function Die({ spinning }: { spinning: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`size-[1.05rem] ${spinning ? "die-tumble" : ""}`}>
      <path
        d="M4.4 6.2C4.2 4.9 5 4.2 6.3 4.1C10.5 3.7 15 3.8 18.2 4.3C19.4 4.5 19.9 5.2 19.8 6.5C19.6 10.4 19.7 15.1 19.4 18C19.3 19.3 18.6 19.9 17.3 19.9C13.2 20.1 8.6 20 6 19.6C4.8 19.4 4.3 18.7 4.3 17.4C4.2 13.6 4.5 9.8 4.4 6.2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="8.6" cy="8.6" r="1.15" fill="currentColor" />
      <circle cx="15.5" cy="8.6" r="1.15" fill="currentColor" />
      <circle cx="12" cy="12.1" r="1.15" fill="currentColor" />
      <circle cx="8.6" cy="15.5" r="1.15" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="1.15" fill="currentColor" />
    </svg>
  );
}

export function SurpriseButton({ onTrigger }: { onTrigger: () => void }) {
  const [spinning, setSpinning] = useState(false);
  const timer = useRef(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      onClick={() => {
        setSpinning(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setSpinning(false), 620);
        onTrigger();
      }}
      title="Surprise me"
      aria-label="Surprise me"
      className="pill pill-sm shrink-0 border border-[var(--paper-line)] font-ui text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
    >
      <Die spinning={spinning} />
      <span className="hidden sm:inline">Surprise me</span>
      <span className="key-chip !h-5 !min-w-[1.1rem] !text-[0.6rem]" aria-hidden="true">
        R
      </span>
    </button>
  );
}

/** Hand-drawn circle + "try this one" tag around the surprise pick. */
export function SurpriseMark({ tag, showTag, children }: { tag: string; showTag: boolean; children: ReactNode }) {
  return (
    <div className="surprise-mark">
      {children}
      <svg viewBox="0 0 200 260" fill="none" preserveAspectRatio="none" aria-hidden="true" className="surprise-circle">
        <path
          d="M104 8C150 10 190 46 192 128C194 208 152 250 100 252C46 254 8 210 8 130C8 52 48 12 104 8C120 7.2 138 12 154 22"
          stroke="currentColor"
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
      {showTag ? <span className="surprise-tag">{tag}</span> : null}
    </div>
  );
}
