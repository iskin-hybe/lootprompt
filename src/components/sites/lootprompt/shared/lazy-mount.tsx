"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** Renders a placeholder of `minHeight` until it comes within 600px of the viewport. */
export function LazyMount({ children, minHeight }: { children: ReactNode; minHeight: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || mounted) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setMounted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [mounted]);

  if (mounted) return <>{children}</>;
  return <div ref={ref} aria-hidden="true" style={{ minHeight }} />;
}
