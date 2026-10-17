"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** The page's graph-paper canvas; its grid drifts slightly with scroll. */
export function PaperMain({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      el.style.setProperty("--paper-shift", `${window.scrollY * 0.06}px`);
    };
    const onScroll = () => {
      frame ||= window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <main ref={ref} className="paper-grid min-h-screen text-foreground">
      {children}
    </main>
  );
}
