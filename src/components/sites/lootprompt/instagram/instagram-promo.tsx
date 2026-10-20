"use client";

import { Heart, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  homeAggregates,
  promptHref,
  prompts,
  type Prompt,
} from "../data";
import { InstagramGlyph } from "./instagram-glyph";
import "./instagram.css";

/** Auto-advance interval of the reel carousel. */
const SLIDE_INTERVAL_MS = 6000;
/** Matches the .ig-reel-slide opacity transition. */
const SLIDE_FADE_MS = 900;
const MAX_SLIDES = 3;
/** Candidate pool when no stored reels exist. */
const FALLBACK_POOL = 8;

interface ReelSlide {
  prompt: Prompt;
  likes: number;
}

/** Instagram likes plus on-site saves, as the source's `useLikeCount` does for a guest. */
function likeCount(prompt: Prompt): number {
  return Math.max(0, (prompt.igLikes ?? 0) + (homeAggregates.likes[prompt.id] ?? 0));
}

/** Stored reels first; otherwise the most-liked prompts. Shown in id order. */
function pickSlides(list: Prompt[]): ReelSlide[] {
  const ranked = (items: Prompt[]) =>
    items
      .filter((p) => !!p.media.src)
      .map((prompt) => ({ prompt, likes: likeCount(prompt) }))
      .sort((a, b) => b.likes - a.likes);
  const reels = ranked(list.filter((p) => p.hasStoredReel));
  const fallback =
    reels.length >= MAX_SLIDES
      ? []
      : ranked(list.filter((p) => !p.hasStoredReel)).slice(0, FALLBACK_POOL - reels.length);
  return [...reels, ...fallback]
    .slice(0, MAX_SLIDES)
    .sort((a, b) => a.prompt.id.localeCompare(b.prompt.id));
}

const SLIDES = pickSlides(prompts);

/** 1234 → "1.2k", 1000 → "1k". */
function formatCount(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1).replace(/\.0$/, "")}m`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

/**
 * One reel frame. The source shows the prompt's GIF in an <img>; here the
 * local MP4 re-encode plays only while the slide is on screen.
 */
function ReelSlideMedia({
  prompt,
  active,
  still,
}: {
  prompt: Prompt;
  active: boolean;
  still: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const motion = prompt.media.motion;

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active && !still) {
      video.muted = true;
      video.play().catch(() => {});
      return;
    }
    if (active) {
      video.pause();
      return;
    }
    // Keep the outgoing slide moving while it fades, then rewind it.
    const timer = window.setTimeout(() => {
      video.pause();
      video.currentTime = 0;
    }, SLIDE_FADE_MS);
    return () => window.clearTimeout(timer);
  }, [active, still]);

  const className = `ig-reel-slide${active ? " is-on" : ""}`;

  if (!motion) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={prompt.media.src}
        alt={prompt.title}
        loading="lazy"
        decoding="async"
        className={className}
      />
    );
  }

  return (
    <video
      ref={ref}
      src={motion}
      poster={prompt.media.poster ?? prompt.media.src}
      aria-label={prompt.title}
      muted
      loop
      playsInline
      preload={active ? "auto" : "none"}
      className={className}
    />
  );
}

/** "Follow the heist" card with a tilted, auto-advancing reel preview. */
export function InstagramPromo() {
  const reducedMotion = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [inView, setInView] = useState(true);
  const frameRef = useRef<HTMLDivElement>(null);
  const slides = SLIDES;

  useEffect(() => {
    const el = frameRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => setInView(entries.some((entry) => entry.isIntersecting)),
      { threshold: 0.2 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (reducedMotion || !inView || slides.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      SLIDE_INTERVAL_MS,
    );
    return () => window.clearInterval(timer);
  }, [reducedMotion, inView, slides.length]);

  const activeIndex = Math.min(index, Math.max(0, slides.length - 1));
  const current = slides[activeIndex]?.prompt;
  const currentLikes = current ? likeCount(current) : 0;

  return (
    <section
      className="mx-auto w-full max-w-6xl px-5 pb-20 sm:px-6"
      aria-label="Follow on Instagram"
    >
      <div className="ig-promo">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="text-foreground">
              <InstagramGlyph className="size-8" />
            </span>
            <span className="font-ui text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">
              Instagram
            </span>
          </div>
          <h2 className="hand-headline mt-4 text-3xl sm:text-4xl">
            <span className="relative inline-block">
              Follow the heist
              <svg
                viewBox="0 0 140 10"
                preserveAspectRatio="none"
                fill="none"
                aria-hidden="true"
                className="absolute -bottom-2 left-[-4%] h-[9px] w-[108%] text-[var(--accent)]"
              >
                <path
                  d="M2 7C26 3.6 62 2.4 92 4.2C110 5.2 128 6.6 138 5"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          </h2>
          <p className="mt-6 max-w-sm font-ui text-sm text-muted-foreground">
            New prompts land on Instagram first — {INSTAGRAM_HANDLE}
          </p>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-sticker mt-6 font-ui text-[0.7rem] uppercase tracking-[0.18em]"
          >
            <span className="btn-sticker-icon">
              <InstagramGlyph className="size-4" />
            </span>
            Follow
          </a>
        </div>

        <div ref={frameRef} className="ig-promo-frame">
          {current ? (
            <a
              href={promptHref(current.id)}
              className="ig-reel-card block"
              aria-label={`Open ${current.title}`}
            >
              {slides.map((slide, i) => (
                <ReelSlideMedia
                  key={slide.prompt.id}
                  prompt={slide.prompt}
                  active={i === activeIndex}
                  still={reducedMotion || !inView}
                />
              ))}
              <span className="ig-reel-chip">
                <span className="truncate">{current.title}</span>
                <span className="inline-flex shrink-0 items-center gap-1">
                  <Heart className="size-3" aria-hidden="true" />
                  {formatCount(currentLikes)}
                </span>
              </span>
              {reducedMotion ? (
                <span className="ig-reel-play" aria-hidden="true">
                  <Play className="size-4" />
                </span>
              ) : null}
            </a>
          ) : (
            <div className="ig-reel-card ig-reel-empty">
              <span className="font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                Reels soon
              </span>
            </div>
          )}
          {current && !current.hasStoredReel ? (
            <a
              href={current.reelUrl ?? INSTAGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="ig-reel-watch font-ui text-[0.55rem] uppercase tracking-[0.16em]"
            >
              <InstagramGlyph className="size-3" />
              Watch on Instagram
            </a>
          ) : null}
          {slides.length > 1 && !reducedMotion ? (
            <div className="ig-reel-dots" aria-hidden="true">
              {slides.map((slide, i) => (
                <span key={slide.prompt.id} className={i === index ? "ig-dot is-on" : "ig-dot"} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
