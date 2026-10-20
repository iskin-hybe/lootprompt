"use client";

// Loads the ⌘K palette on first use (source: `tt()` in the routes chunk).
import { Suspense, lazy, useEffect, useState } from "react";

const CommandPalette = lazy(() => import("./palette").then((m) => ({ default: m.CommandPalette })));

export function CommandPaletteTrigger() {
  const [requested, setRequested] = useState(false);

  useEffect(() => {
    if (requested) return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setRequested(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requested]);

  if (!requested) return null;
  return (
    <Suspense fallback={null}>
      <CommandPalette defaultOpen />
    </Suspense>
  );
}
