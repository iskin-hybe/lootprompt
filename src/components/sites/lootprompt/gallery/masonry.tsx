"use client";

// CSS-columns masonry with FLIP re-ordering (source: `Ve` in the routes chunk).
// Like the source, nodes are only refreshed when the set/order of keys changes.
import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { EASE_OUT_EXPO, prefersReducedMotion } from "./lib";

export interface MasonryItem {
  key: string;
  node: ReactNode;
}

interface RenderedItem extends MasonryItem {
  exiting?: boolean;
}

function sameKeys(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((key, i) => b[i] === key);
}

export function MasonryGrid({
  items,
  className,
  containerRef,
}: {
  items: MasonryItem[];
  className?: string;
  containerRef?: RefObject<HTMLDivElement | null>;
}) {
  const [rendered, setRendered] = useState<RenderedItem[]>(items);
  const nodes = useRef(new Map<string, HTMLDivElement>());
  const before = useRef(new Map<string, DOMRect>());
  const keys = useRef(items.map((item) => item.key));
  const settled = useRef(false);

  // Measure the old layout before swapping in the new order.
  useLayoutEffect(() => {
    const nextKeys = items.map((item) => item.key);
    if (sameKeys(nextKeys, keys.current)) return;
    before.current.clear();
    for (const [key, el] of nodes.current) before.current.set(key, el.getBoundingClientRect());
    const removed = keys.current.filter((key) => !nextKeys.includes(key));
    const next: RenderedItem[] = items.map((item) => ({ ...item }));
    for (const key of removed) {
      const old = rendered.find((item) => item.key === key);
      if (old) next.push({ ...old, exiting: true });
    }
    keys.current = nextKeys;
    // Layout measurement has to happen before the swap, so this state update lives here.
    setRendered(next);
    // `rendered` is read only to recover exiting nodes; re-running on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Animate: deal in new cards, slide moved ones, shrink away removed ones.
  useLayoutEffect(() => {
    if (!settled.current) {
      settled.current = true;
      return;
    }
    if (prefersReducedMotion()) {
      if (rendered.some((item) => item.exiting)) {
        setRendered((list) => list.filter((item) => !item.exiting));
      }
      return;
    }
    let order = 0;
    for (const item of rendered) {
      const el = nodes.current.get(item.key);
      if (!el) continue;
      if (item.exiting) {
        el.style.pointerEvents = "none";
        el.animate(
          [
            { transform: "scale(1)", opacity: 1 },
            { transform: "scale(0.9)", opacity: 0 },
          ],
          { duration: 260, easing: "ease-out", fill: "forwards" },
        );
        continue;
      }
      const prev = before.current.get(item.key);
      const now = el.getBoundingClientRect();
      if (!prev) {
        el.animate(
          [
            { transform: "translateY(40px) rotate(6deg) scale(.8)", opacity: 0 },
            { transform: "translateY(-5px) rotate(-1deg) scale(1.02)", opacity: 1, offset: 0.78 },
            { transform: "none", opacity: 1 },
          ],
          { duration: 560, delay: order++ * 40, easing: EASE_OUT_EXPO, fill: "backwards" },
        );
        continue;
      }
      const dx = prev.left - now.left;
      const dy = prev.top - now.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      el.animate(
        [{ transform: `translate(${dx}px, ${dy}px) rotate(${order % 2 ? 4 : -4}deg)` }, { transform: "none" }],
        { duration: 560, delay: order++ * 40, easing: EASE_OUT_EXPO },
      );
    }
    if (rendered.some((item) => item.exiting)) {
      const timer = window.setTimeout(() => setRendered((list) => list.filter((item) => !item.exiting)), 280);
      return () => window.clearTimeout(timer);
    }
  }, [rendered]);

  return (
    <div ref={containerRef} className={className}>
      {rendered.map((item) => (
        <div
          key={item.key}
          ref={(el) => {
            if (el) nodes.current.set(item.key, el);
            else nodes.current.delete(item.key);
          }}
          className={item.exiting ? "pointer-events-none" : undefined}
        >
          {item.node}
        </div>
      ))}
    </div>
  );
}
