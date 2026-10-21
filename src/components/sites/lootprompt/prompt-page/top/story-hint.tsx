"use client";

import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { inLandingView } from "./media-anchor";
import type { StoryPrompt } from "./story/story-card";

/** localStorage flag: the hint was dismissed or used, never show it again. */
const HINT_KEY = "lp-story-hint";

export function markStoryHintDone(): void {
  try {
    localStorage.setItem(HINT_KEY, "done");
  } catch {
    // storage blocked: the hint just shows again next time
  }
}

function loadPoster(url: string | null): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!url) {
      resolve(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * "NEW · Your prompt as a story video" popover above the Save-as-story button
 * (source `z`). Opens 1.2s after the button is first on screen (on landing, as the
 * source measures it, or once scrolled into view), with a live preview of the story.
 */
export function StoryHint({
  targetRef,
  open,
  setOpen,
  onMake,
  story,
  motionUrl,
}: {
  targetRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  setOpen: (open: boolean) => void;
  onMake: () => void;
  story: StoryPrompt;
  motionUrl: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [targetVisible, setTargetVisible] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const storyRef = useRef(story);

  useEffect(() => {
    storyRef.current = story;
  });

  useEffect(() => {
    let done = false;
    try {
      done = localStorage.getItem(HINT_KEY) === "done";
    } catch {
      // treat blocked storage as "not seen"
    }
    if (done) return;
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    const target = targetRef.current;
    if (!target) return;
    let timer = 0;
    const startTimer = () => {
      if (!timer) timer = window.setTimeout(() => setOpen(true), 1200);
    };
    // The source's first observation sees the button as the page lands, before its
    // media card takes up room (see `inLandingView`).
    if (inLandingView(target)) startTimer();
    const observer = new IntersectionObserver(([entry]) => {
      const visible = !!entry?.isIntersecting;
      setTargetVisible(visible);
      if (visible) startTimer();
    });
    observer.observe(target);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer);
    };
  }, [targetRef, setOpen]);

  const dismiss = useCallback(() => {
    markStoryHintDone();
    setOpen(false);
  }, [setOpen]);

  // Live preview while the hint is open and its button is on screen.
  useEffect(() => {
    if (!open || !targetVisible || reducedMotion) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    let stop: (() => void) | null = null;
    let release: (() => void) | null = null;
    let cancelled = false;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(150 * dpr);
    canvas.height = Math.round(267 * dpr);
    void (async () => {
      const video = await import("./story/story-video");
      const [poster, motion] = await Promise.all([
        loadPoster(storyRef.current.posterUrl),
        motionUrl ? video.loadPreviewMotion(motionUrl) : Promise.resolve(null),
      ]);
      release = motion ? motion.close : null;
      if (cancelled) {
        release?.();
        return;
      }
      stop = video.startStoryPreview(canvas, storyRef.current, poster, 24, motion);
    })();
    return () => {
      cancelled = true;
      stop?.();
      release?.();
    };
  }, [open, targetVisible, reducedMotion, motionUrl]);

  // Any press outside the hint (or its button) closes it for now.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (rootRef.current?.contains(target) || targetRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpen, targetRef]);

  if (!open) return null;

  return (
    <div ref={rootRef} className="story-hint" role="dialog" aria-label="Your prompt as a story video">
      <svg className="story-hint-arrow ink-draw" viewBox="0 0 60 50" aria-hidden="true">
        <path
          d="M50 4 C 40 18, 22 22, 12 42"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <path
          d="M4 34 L 12 43 L 20 35"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <button type="button" className="story-hint-close" onClick={dismiss} aria-label="Close">
        <X className="size-4" aria-hidden="true" />
      </button>
      <span className="story-hint-new">New</span>
      <p className="story-hint-title">Your prompt as a story video</p>
      <p className="story-hint-body">
        A 3D card with your post playing inside, and our thief stealing the prompt — ready for Instagram.
      </p>
      {reducedMotion ? (
        story.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- static stand-in for the animated preview
          <img src={story.posterUrl} alt="" className="story-hint-preview" />
        ) : null
      ) : (
        <canvas ref={canvasRef} className="story-hint-preview" aria-hidden="true" />
      )}
      <button
        type="button"
        className="story-hint-cta"
        onClick={() => {
          markStoryHintDone();
          onMake();
        }}
      >
        Make my story
      </button>
    </div>
  );
}
