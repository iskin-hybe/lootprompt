"use client";

// The gallery's prompt card (source: `Wt` in the prompt-card chunk).
import { Check, Copy, Play } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { findBrand, homeAggregates, promptHref, type Prompt } from "../data";
import {
  BrandStamp,
  Engagement,
  FreshInk,
  InkStamp,
  InstagramIcon,
  LegendaryFoil,
  MetaRow,
  OrientationGlyph,
  ReferenceChip,
  StealCount,
  TrendStamp,
  VaultCover,
  useMounted,
} from "./card-parts";
import {
  MOTION_DELAY_MS,
  SETTLE_MS,
  TILT_MAX_DEG,
  aspectRatio,
  cleanPrompt,
  inViewport,
  isEditableTarget,
  isFresh,
  lootLine,
  navigateTo,
  paperLook,
  paperStyle,
  prefersReducedMotion,
  restingTilt,
  showsCount,
} from "./lib";
import { SaveHeart } from "./save-heart";
import { gateCrewOnly, isCrewOnly, useStolenIds, useVaultLock } from "./stores";
import { useSteal } from "./use-steal";

/* ---------- Fine-pointer context: tilt/focus effects only for a real mouse ---------- */

const FinePointerContext = createContext(false);

export function FinePointerProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const hover = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setEnabled(hover.matches && !reduce.matches);
    update();
    hover.addEventListener("change", update);
    reduce.addEventListener("change", update);
    return () => {
      hover.removeEventListener("change", update);
      reduce.removeEventListener("change", update);
    };
  }, []);

  return <FinePointerContext.Provider value={enabled}>{children}</FinePointerContext.Provider>;
}

/** Plays a video while at least a quarter of it is on screen. */
function usePlayWhileVisible(ref: RefObject<HTMLVideoElement | null>, active: boolean) {
  useEffect(() => {
    const video = ref.current;
    if (!video || !active || prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            video.muted = true;
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        }
      },
      { threshold: 0.25 },
    );
    io.observe(video);
    return () => io.disconnect();
  }, [ref, active]);
}

const HOLO_REST = { x: "50%", y: "42%", angle: "118deg" };

export interface PromptCardProps {
  prompt: Prompt;
  trending?: boolean;
  legendary?: boolean;
  caseNumber?: number;
}

export function PromptCard({ prompt, trending = false, legendary = false, caseNumber }: PromptCardProps) {
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const settleTimer = useRef<number | null>(null);
  const motionTimer = useRef<number | null>(null);

  const finePointer = useContext(FinePointerContext);
  const mounted = useMounted();
  const [motionOn, setMotionOn] = useState(false);
  const { steal, copied, stamp, count } = useSteal(prompt);
  const { locked } = useVaultLock(prompt.id);
  const stolen = useStolenIds();

  const brand = findBrand(prompt.brandId);
  const look = useMemo(() => paperLook(prompt.id), [prompt.id]);
  const loot = useMemo(() => lootLine(prompt.prompt), [prompt.prompt]);
  const promptText = useMemo(() => cleanPrompt(prompt.prompt), [prompt.prompt]);
  const fresh = isFresh(prompt.createdAt);
  const ember = homeAggregates.recently_stolen.includes(prompt.id);
  const stolenHere = stolen.hydrated && stolen.ids.has(prompt.id);
  const href = promptHref(prompt.id);
  const poster = prompt.media.poster ?? prompt.media.src;
  const isVideo = prompt.media.type === "video";
  const motionSrc = isVideo ? prompt.media.src : prompt.media.motion;
  const showMotion = motionOn && !!motionSrc && !locked;

  usePlayWhileVisible(videoRef, showMotion);

  useEffect(
    () => () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
      if (motionTimer.current !== null) window.clearTimeout(motionTimer.current);
    },
    [],
  );

  /** Steal button / C key: guests hit the crew gate for crew-only prompts. */
  const stealOrGate = useCallback(async () => {
    if (gateCrewOnly(prompt.id)) return;
    if (locked) {
      navigateTo(href);
      return;
    }
    await steal();
  }, [prompt.id, locked, href, steal]);

  // "C" steals the card under the pointer (native mouseenter so keyboard focus counts too).
  const stealRef = useRef(stealOrGate);
  useEffect(() => {
    stealRef.current = stealOrGate;
  });
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let hovered = false;
    const enter = () => {
      hovered = true;
    };
    const leave = () => {
      hovered = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (!hovered || isEditableTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() === "c") void stealRef.current();
    };
    stage.addEventListener("mouseenter", enter);
    stage.addEventListener("mouseleave", leave);
    window.addEventListener("keydown", onKey);
    return () => {
      stage.removeEventListener("mouseenter", enter);
      stage.removeEventListener("mouseleave", leave);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  const setTilt = (x: number, y: number) => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
    card.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
  };

  const resetHolo = () => {
    const media = mediaRef.current;
    if (!media) return;
    media.style.setProperty("--holo-x", HOLO_REST.x);
    media.style.setProperty("--holo-y", HOLO_REST.y);
    media.style.setProperty("--holo-angle", HOLO_REST.angle);
  };

  const scheduleTilt = () => {
    if (frameRef.current !== null) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = null;
      const pointer = pointerRef.current;
      const card = cardRef.current;
      if (!pointer || !card) return;
      const box = card.getBoundingClientRect();
      if (!box.width || !box.height) return;
      const px = (pointer.x - box.left) / box.width - 0.5;
      const py = (pointer.y - box.top) / box.height - 0.5;
      if (finePointer) {
        setTilt(Number((-py * 2 * TILT_MAX_DEG).toFixed(2)), Number((px * 2 * TILT_MAX_DEG).toFixed(2)));
      }
      const media = mediaRef.current;
      if (!media) return;
      const m = media.getBoundingClientRect();
      media.style.setProperty("--glare-x", `${(((pointer.x - m.left) / m.width) * 100).toFixed(2)}%`);
      media.style.setProperty("--glare-y", `${(((pointer.y - m.top) / m.height) * 100).toFixed(2)}%`);
      if (legendary) {
        const hx = Math.min(100, Math.max(0, ((pointer.x - m.left) / m.width) * 100));
        const hy = Math.min(100, Math.max(0, ((pointer.y - m.top) / m.height) * 100));
        media.style.setProperty("--holo-x", `${hx.toFixed(2)}%`);
        media.style.setProperty("--holo-y", `${hy.toFixed(2)}%`);
        media.style.setProperty("--holo-angle", `${(105 + hx * 0.35 - hy * 0.12).toFixed(2)}deg`);
      }
    });
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if ((!finePointer && !legendary) || e.pointerType !== "mouse") return;
    pointerRef.current = { x: e.clientX, y: e.clientY };
    scheduleTilt();
  };

  const playMotion = () => {
    videoRef.current?.play().catch(() => {});
  };

  const onMouseEnter = () => {
    if (motionTimer.current === null && !motionOn) {
      motionTimer.current = window.setTimeout(() => {
        motionTimer.current = null;
        setMotionOn(true);
      }, MOTION_DELAY_MS);
    } else {
      playMotion();
    }
    if (!finePointer) return;
    const card = cardRef.current;
    if (!card) return;
    card.classList.add("focused");
    card.classList.remove("settled");
    stageRef.current?.closest(".cine-grid")?.classList.add("has-focus");
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => cardRef.current?.classList.add("settled"), SETTLE_MS);
  };

  const onMouseLeave = () => {
    if (motionTimer.current !== null) {
      window.clearTimeout(motionTimer.current);
      motionTimer.current = null;
    }
    const video = videoRef.current;
    if (video && isVideo && !inViewport(video)) {
      video.pause();
      video.currentTime = 0;
    }
    pointerRef.current = null;
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (settleTimer.current !== null) {
      window.clearTimeout(settleTimer.current);
      settleTimer.current = null;
    }
    cardRef.current?.classList.remove("focused", "settled");
    stageRef.current?.closest(".cine-grid")?.classList.remove("has-focus");
    setTilt(0, 0);
    if (legendary) resetHolo();
  };

  /** Clicks outside the link/buttons still open the prompt (or the gate). */
  const onStageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((e.target as HTMLElement).closest("a, button, input, textarea, select, [role='button']")) return;
    if (gateCrewOnly(prompt.id)) return;
    navigateTo(href);
  };

  const onLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (isCrewOnly(prompt.id)) {
      e.preventDefault();
      gateCrewOnly(prompt.id);
    }
  };

  const showSteals = showsCount("steals", count);
  const stageStyle = { "--tilt-rest": `${restingTilt(prompt.id)}deg`, ...paperStyle(look) } as CSSProperties;
  const blockCount = prompt.blockCount;

  return (
    <div
      ref={stageRef}
      className="cine-stage"
      data-prompt-id={prompt.id}
      style={stageStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onPointerMove={onPointerMove}
      onClick={onStageClick}
    >
      <span aria-hidden="true" className="paper-sheet paper-sheet-a" />
      {look.sheets === 2 ? <span aria-hidden="true" className="paper-sheet paper-sheet-b" /> : null}
      {caseNumber && caseNumber > 0 ? (
        <span className="evidence-tag" aria-hidden="true">
          <span className="evidence-string" />
          <span>CASE #{String(caseNumber).padStart(3, "0")}</span>
          {showSteals ? <span className="evidence-steals">{count} steals</span> : null}
        </span>
      ) : null}
      <article
        ref={cardRef}
        data-orientation={prompt.aspect.orientation}
        className={
          "cine-card group relative overflow-hidden rounded-[15px] border border-[var(--paper-line)] bg-[var(--card-surface)]" +
          (stamp ? " paper-jolt" : "")
        }
      >
        {locked ? null : (
          <a
            href={href}
            aria-label={`Open ${prompt.title}`}
            onClick={onLinkClick}
            className="absolute inset-0 z-20 cursor-pointer rounded-[15px] outline-none focus-visible:ring-2 focus-visible:ring-foreground/40"
          />
        )}
        {stamp ? <InkStamp key={stamp.key} stamp={stamp} /> : null}
        {stolenHere && !stamp ? (
          <span className="stolen-ghost" aria-label="You already stole this one">
            STOLEN
          </span>
        ) : null}
        {trending ? <TrendStamp /> : null}
        <div
          ref={mediaRef}
          data-orientation={prompt.aspect.orientation}
          style={{ aspectRatio: aspectRatio(prompt.aspect) }}
          className={
            "card-media cine-glare group/media relative block w-full overflow-hidden bg-foreground/5" +
            (locked ? " vault-blur" : "")
          }
        >
          {locked ? <VaultCover href={href} /> : null}
          {showMotion || isVideo ? (
            <video
              ref={videoRef}
              src={showMotion ? (motionSrc ?? undefined) : undefined}
              poster={poster}
              muted
              loop
              autoPlay={showMotion && !isVideo}
              playsInline
              preload="none"
              aria-label={`${prompt.model} AI prompt result — ${prompt.title}`}
              className="cine-media pointer-events-none h-full w-full object-contain"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element -- pre-sized 720px posters, lazy like the source
            <img
              src={poster}
              alt={`${prompt.model} AI prompt result — ${prompt.title}`}
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="cine-media h-full w-full object-contain"
            />
          )}
          <span aria-hidden="true" className="cine-glare-layer" />
          {legendary ? <LegendaryFoil /> : null}
          {mounted && brand && !locked ? <BrandStamp brand={brand} /> : null}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center pb-4 opacity-0 transition-opacity duration-300 group-hover/media:opacity-100 group-focus-visible/media:opacity-100"
          >
            <span className="inline-flex items-center gap-1.5 rounded-full bg-foreground/85 px-3 py-1.5 font-ui text-[0.62rem] uppercase tracking-[0.16em] text-[var(--card-surface)] backdrop-blur-sm">
              <Play className="size-3" /> Open
            </span>
          </span>
          <span className="absolute left-3 top-3 rounded-full bg-foreground px-3 py-1 font-ui text-[0.68rem] text-[var(--card-surface)]">
            {isVideo ? "Reel" : "Still"}
          </span>
          {prompt.reelUrl && !isVideo ? (
            <span
              title="Reel available"
              className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full border border-[var(--paper-line)] bg-[var(--card-surface)]/90 px-2.5 py-1 font-ui text-[0.6rem] uppercase tracking-[0.12em] text-foreground"
            >
              <InstagramIcon className="size-3" /> Reel available
            </span>
          ) : null}
          {mounted && isCrewOnly(prompt.id) ? (
            <span className="crew-only-chip" aria-hidden="true">
              Crew only
            </span>
          ) : null}
          <span className="model-badge absolute right-3 top-3" title={prompt.model}>
            {prompt.model}
          </span>
        </div>
        <div className="paper-wear relative p-4 sm:p-5" data-wear={look.wear}>
          <div className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
            <h3 className="line-clamp-2 min-w-0 font-ui text-[0.95rem] font-semibold leading-snug text-foreground">
              {prompt.title}
            </h3>
            <div className="relative z-30 flex h-[1.375rem] shrink-0 items-center gap-1">
              <SaveHeart
                promptId={prompt.id}
                title={prompt.title}
                className="pill pill-icon min-h-0 [&_svg]:size-[18px] [&_svg]:stroke-[1.5]"
              />
              <button
                type="button"
                onClick={() => void stealOrGate()}
                aria-label={`Steal the ${prompt.title} prompt`}
                title="Press C to steal"
                className="pill pill-icon shrink-0 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              >
                {copied ? (
                  <Check className="size-[18px]" strokeWidth={1.5} />
                ) : (
                  <Copy className="size-[18px]" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>
          {loot && !locked ? (
            <div className="loot-line" aria-hidden="true">
              <span className="loot-line-text font-mono">{loot}</span>
            </div>
          ) : null}
          <MetaRow
            items={[
              { key: "orientation", className: "meta-glyph", node: <OrientationGlyph orientation={prompt.aspect.orientation} /> },
              fresh ? { key: "fresh", node: <FreshInk /> } : null,
              { key: "engagement", node: <Engagement prompt={prompt} /> },
              showSteals ? { key: "steals", node: <StealCount value={count} ember={ember} /> } : null,
              blockCount >= 3
                ? {
                    key: "blocks",
                    node: (
                      <span className="font-ui text-[0.6rem] uppercase tracking-[0.16em] opacity-70">
                        {blockCount} prompts
                      </span>
                    ),
                  }
                : null,
              mounted && brand
                ? {
                    key: "brand",
                    flexible: true,
                    node: (
                      <span className="truncate font-ui text-[0.6rem] uppercase tracking-[0.16em] opacity-70">
                        made for {brand.name}
                      </span>
                    ),
                  }
                : null,
            ]}
          />
          <div
            className={
              "pointer-events-none relative mt-3 rounded-[10px] bg-[var(--prompt-panel)] p-3" +
              (locked ? " vault-blur-text" : "")
            }
          >
            <p className="line-clamp-3 font-mono text-[0.72rem] leading-relaxed text-muted-foreground">{promptText}</p>
          </div>
          {prompt.references.length > 0 ? (
            <div className="relative mt-4">
              <p className="font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">References</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {prompt.references.map((ref, i) => (
                  <ReferenceChip key={`${ref.label}-${i}`} reference={ref} />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
