"use client";

import { useEffect, useRef, type RefObject } from "react";
import { CrownThief, HEIST_CANVAS, HEIST_ENDINGS, drawHeistFrame } from "./crown-heist";

const FIRST_HEIST_MS = 3500;

/**
 * Overlay canvas on the #1 podium card. Every 12–18s (first after 3.5s) the
 * real crown is hidden and the canvas plays a crown heist in its place.
 */
export function CrownHeistCanvas({
  enabled,
  cardRef,
  crownRef,
}: {
  enabled: boolean;
  cardRef: RefObject<HTMLAnchorElement | null>;
  crownRef: RefObject<SVGSVGElement | null>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const card = cardRef.current;
    const crown = crownRef.current;
    if (!enabled || !canvas || !card || !crown) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = HEIST_CANVAS.width * dpr;
    canvas.height = HEIST_CANVAS.height * dpr;

    let frame = 0;
    let timer = 0;
    let stopped = false;
    let side: 1 | -1 = Math.random() < 0.5 ? 1 : -1;

    /** Line the canvas anchor up with the crown and read its geometry. */
    const align = () => {
      const crownRect = crown.getBoundingClientRect();
      const cardRect = card.getBoundingClientRect();
      canvas.style.left = `${crownRect.left + crownRect.width / 2 - cardRect.left - HEIST_CANVAS.anchorX}px`;
      canvas.style.top = `-${HEIST_CANVAS.cardTop}px`;
      return {
        crownDy: crownRect.bottom - cardRect.top,
        crownWidth: crownRect.width,
        color: getComputedStyle(crown).color,
      };
    };

    /** The #1 thief's avatar blinks when they catch the burglar. */
    const blink = () => {
      card.querySelector(".thief-avatar img")?.animate(
        [{ transform: "scaleY(1)" }, { transform: "scaleY(0.12)", offset: 0.5 }, { transform: "scaleY(1)" }],
        { duration: 260, easing: "ease-in-out" },
      );
    };

    const reset = () => {
      crown.style.visibility = "";
      canvas.style.visibility = "hidden";
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    const schedule = (delay = 12_000 + Math.random() * 6000) => {
      timer = window.setTimeout(play, delay);
    };

    const play = () => {
      if (stopped) return;
      const geometry = align();
      const ending = HEIST_ENDINGS[Math.floor(Math.random() * HEIST_ENDINGS.length)] ?? "heavy";
      const thief = new CrownThief(side, ending, geometry.crownDy, blink);
      side = side === 1 ? -1 : 1;
      crown.style.visibility = "hidden";
      canvas.style.visibility = "visible";
      let last = performance.now();
      const tick = (now: number) => {
        if (stopped) return;
        const dt = Math.min(0.05, (now - last) / 1000);
        last = now;
        const state = thief.step(dt);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        drawHeistFrame(ctx, state, geometry.color, geometry.crownWidth);
        if (thief.done) {
          reset();
          schedule();
          return;
        }
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };

    schedule(FIRST_HEIST_MS);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
      reset();
    };
  }, [enabled, cardRef, crownRef]);

  return (
    <canvas
      ref={canvasRef}
      className="crown-heist-canvas"
      aria-hidden="true"
      style={{ width: HEIST_CANVAS.width, height: HEIST_CANVAS.height, visibility: "hidden" }}
    />
  );
}
