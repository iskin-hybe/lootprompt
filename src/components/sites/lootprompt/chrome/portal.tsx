"use client";

import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useHydrated } from "./use-hydrated";

let lockCount = 0;
let previousOverflow = "";

/** Locks page scroll while mounted; nested locks share one counter (source `lh`). */
function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    if (lockCount === 0) {
      previousOverflow = root.style.overflow;
      root.style.overflow = "hidden";
    }
    lockCount += 1;
    return () => {
      lockCount -= 1;
      if (lockCount === 0) root.style.overflow = previousOverflow;
    };
  }, [active]);
}

/** Renders children into <body> and locks page scroll (source `dh`). */
export function BodyPortal({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  useScrollLock(hydrated);
  return hydrated ? createPortal(children, document.body) : null;
}
