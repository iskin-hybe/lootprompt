"use client";

import { useCallback, useEffect, useRef, type PointerEvent } from "react";

const REST = { x: "50%", y: "42%", angle: "118deg" };

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Holographic foil that follows a mouse pointer across the media: writes
 * --holo-x / --holo-y / --holo-angle on the hovered element once per frame.
 */
export function useHolo(enabled: boolean) {
  const frame = useRef<number | null>(null);
  const pending = useRef<{ x: number; y: number; target: HTMLElement } | null>(null);

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    },
    [],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled || event.pointerType !== "mouse" || prefersReducedMotion()) return;
      pending.current = { x: event.clientX, y: event.clientY, target: event.currentTarget };
      if (frame.current !== null) return;
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        const point = pending.current;
        if (!point) return;
        const rect = point.target.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const x = Math.min(100, Math.max(0, ((point.x - rect.left) / rect.width) * 100));
        const y = Math.min(100, Math.max(0, ((point.y - rect.top) / rect.height) * 100));
        point.target.style.setProperty("--holo-x", `${x.toFixed(2)}%`);
        point.target.style.setProperty("--holo-y", `${y.toFixed(2)}%`);
        point.target.style.setProperty("--holo-angle", `${(105 + x * 0.35 - y * 0.12).toFixed(2)}deg`);
      });
    },
    [enabled],
  );

  const onPointerLeave = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      if (!enabled) return;
      pending.current = null;
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
      event.currentTarget.style.setProperty("--holo-x", REST.x);
      event.currentTarget.style.setProperty("--holo-y", REST.y);
      event.currentTarget.style.setProperty("--holo-angle", REST.angle);
    },
    [enabled],
  );

  return { onPointerMove, onPointerLeave };
}
