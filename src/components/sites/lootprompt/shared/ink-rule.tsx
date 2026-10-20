"use client";

import { useEffect, useRef, useState } from "react";

/** Hand-drawn horizontal rule that inks itself in when scrolled into view. */
export function InkRule({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setDrawn(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <svg
      ref={ref}
      className={`ink-rule${drawn ? " is-drawn" : ""}${className ? ` ${className}` : ""}`}
      viewBox="0 0 1200 10"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M2 6 C 160 3.4, 300 7.2, 460 5.1 S 760 3, 900 6.4 C 1010 8, 1120 4.2, 1198 5.6" />
    </svg>
  );
}
