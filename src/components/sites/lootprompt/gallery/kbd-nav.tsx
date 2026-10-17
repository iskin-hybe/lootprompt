"use client";

// Arrow-key navigation across the grid plus the "?" shortcuts sheet (source: `Ye`).
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isEditableTarget } from "./lib";

const CARD_SELECTOR = ".cine-grid .cine-stage";

const DIRECTIONS: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
};

const SHORTCUTS: [string, string][] = [
  ["← ↑ → ↓", "Move"],
  ["Enter", "Open"],
  ["C", "Steal"],
  ["S", "Save"],
  ["R", "Surprise me"],
  ["/", "Search"],
  ["⌘K", "Command palette"],
  ["Esc", "Close"],
];

function dialogOpen(): boolean {
  return !!document.querySelector('[role="dialog"], [role="alertdialog"], [data-state="open"][role="menu"]');
}

function touchOnly(): boolean {
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function centre(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Fake hover so the card runs its focus/motion effects (React listens to mouseover/out). */
function setHover(el: Element, on: boolean) {
  el.dispatchEvent(new MouseEvent(on ? "mouseover" : "mouseout", { bubbles: true, relatedTarget: null }));
  el.dispatchEvent(new MouseEvent(on ? "mouseenter" : "mouseleave", { bubbles: false }));
}

export function KeyboardNav() {
  const [helpOpen, setHelpOpen] = useState(false);
  const current = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (touchOnly()) return;

    const release = () => {
      const el = current.current;
      if (!el) return;
      el.removeAttribute("data-kbd-focus");
      if (el.isConnected) setHover(el, false);
      current.current = null;
    };

    const focus = (el: HTMLElement) => {
      if (current.current === el) return;
      release();
      current.current = el;
      el.setAttribute("data-kbd-focus", "1");
      setHover(el, true);
      el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    };

    const next = (dir: [number, number]): HTMLElement | null => {
      const cards = Array.from(document.querySelectorAll<HTMLElement>(CARD_SELECTOR));
      if (!cards.length) return null;
      const from = current.current;
      if (!from || !from.isConnected) {
        return (
          cards.find((el) => {
            const r = el.getBoundingClientRect();
            return r.bottom > 0 && r.top < window.innerHeight;
          }) ??
          cards[0] ??
          null
        );
      }
      const origin = centre(from);
      let best: HTMLElement | null = null;
      let bestScore = Infinity;
      for (const el of cards) {
        if (el === from) continue;
        const c = centre(el);
        const dx = c.x - origin.x;
        const dy = c.y - origin.y;
        const along = dx * dir[0] + dy * dir[1];
        if (along <= 1) continue;
        const score = along + Math.abs(dx * dir[1] + dy * dir[0]) * 2.5;
        if (score < bestScore) {
          bestScore = score;
          best = el;
        }
      }
      return best;
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || isEditableTarget(e.target) || dialogOpen()) return;
      if (e.key === "?") {
        e.preventDefault();
        release();
        setHelpOpen(true);
        return;
      }
      const dir = DIRECTIONS[e.key];
      if (dir) {
        const target = next(dir);
        if (!target) return;
        e.preventDefault();
        focus(target);
        return;
      }
      const el = current.current;
      if (!el || !el.isConnected) return;
      if (e.key === "Escape") {
        release();
      } else if (e.key === "Enter") {
        e.preventDefault();
        const link = el.querySelector<HTMLAnchorElement>('a[href*="/prompt/"]');
        if (link) link.click();
        else el.click();
      } else if (e.key === "s" || e.key === "S") {
        const save = el.querySelector<HTMLButtonElement>("button[aria-pressed]");
        if (!save) return;
        e.preventDefault();
        save.click();
      }
    };

    // A real mouse moving onto another card hands focus back to the pointer.
    const onMouseOver = (e: MouseEvent) => {
      if (!e.isTrusted || !current.current) return;
      const stage = (e.target as Element | null)?.closest?.(".cine-stage");
      if (stage && stage !== current.current) release();
    };

    window.addEventListener("keydown", onKey);
    document.addEventListener("mouseover", onMouseOver);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mouseover", onMouseOver);
      release();
    };
  }, []);

  return helpOpen ? <ShortcutsDialog onClose={() => setHelpOpen(false)} /> : null;
}

/** shadcn-style dialog (max-w-sm) listing the shortcuts. */
function ShortcutsDialog({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return createPortal(
    <>
      <div
        data-state="open"
        className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=open]:fade-in-0"
        onMouseDown={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kbd-nav-title"
        aria-describedby="kbd-nav-desc"
        tabIndex={-1}
        data-state="open"
        className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-sm translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg outline-none duration-200 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:rounded-lg"
      >
        <div className="flex flex-col space-y-1.5 text-center sm:text-left">
          <h2 id="kbd-nav-title" className="font-ui text-lg font-semibold leading-none tracking-tight">
            Keyboard shortcuts
          </h2>
          <p id="kbd-nav-desc" className="font-ui text-xs text-muted-foreground">
            Case the grid without a mouse.
          </p>
        </div>
        <ul className="mt-2 space-y-2 font-ui text-sm">
          {SHORTCUTS.map(([key, label]) => (
            <li key={key} className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">{label}</span>
              <kbd className="key-chip">{key}</kbd>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 cursor-pointer rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </button>
      </div>
    </>,
    document.body,
  );
}
