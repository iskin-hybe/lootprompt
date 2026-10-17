"use client";

import { useEffect, useRef, type ReactNode } from "react";

const CROWN_RED = "#c0392b";
const SVG_NS = "http://www.w3.org/2000/svg";
const INTRO_ATTR = "data-hero-intro";
const INTRO_PLAYED_KEY = "hero-intro-played";
const WRITE_EASING = "cubic-bezier(.3,.7,.3,1)";

/** A measured signature character, in `.hero-signature` coordinates. */
interface Glyph {
  el: HTMLElement;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Baseline of the glyph's line. */
  base: number;
  size: number;
  line: number;
}

interface PenStop {
  t: number;
  x: number;
  y: number;
}

/** One line of the signature, split into words and per-character spans. */
function SignatureLine({ text, trailing }: { text: string; trailing?: ReactNode }) {
  const words = text.split(" ");
  return (
    <span className="hero-sig-line">
      <i className="hero-sig-probe" aria-hidden="true" />
      {words.map((word, wordIndex) => (
        <span key={wordIndex}>
          <span className="hero-sig-word">
            {[...word].map((char, charIndex) => (
              <span key={charIndex} className="hero-sig-ch">
                {char}
              </span>
            ))}
          </span>
          {wordIndex < words.length - 1 ? " " : null}
        </span>
      ))}
      {trailing}
    </span>
  );
}

/**
 * The hero's script signature. On a first desktop visit each letter is inked
 * in behind a travelling pen, the flourish is drawn and a crown drops onto
 * the second line. Afterwards the ink "boils", letters dodge the pointer and
 * every ~10s a hook lowers to steal a letter and put it back.
 */
export function HeroSignature({
  line1,
  line2,
  trailing,
  className,
}: {
  line1: string;
  line2: string;
  trailing?: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const flourishRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const overlay = overlayRef.current;
    const flourish = flourishRef.current;
    if (!root || !overlay || !flourish) return;

    const heading = root.querySelector("h1");
    const outlines = overlay.querySelector<SVGGElement>(".hs-outlines");
    const pen = overlay.querySelector<SVGGElement>(".hs-pen");
    const crown = overlay.querySelector<SVGGElement>(".hs-crown");
    const hook = overlay.querySelector<SVGGElement>(".hs-hook");
    const turbulence = overlay.querySelector("feTurbulence");
    const flourishPath = flourish.querySelector<SVGPathElement>(".hero-sig-flo-path");
    const splat = flourish.querySelector<SVGCircleElement>(".hero-sig-splat");
    if (!heading || !outlines || !pen || !crown || !hook || !turbulence || !flourishPath || !splat) {
      return;
    }

    const html = document.documentElement;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const desktop = window.matchMedia("(min-width: 900px)");

    let disposed = false;
    let busy = false; // intro or hook heist in progress
    let introRunning = false;
    let inView = true;
    let pointerInside = false;
    let started = false;
    let boilTimer = 0;
    let heistTimer = 0;
    let boilSeed = 1;
    const timeouts: number[] = [];
    const animations: Animation[] = [];
    let glyphs: Glyph[] = [];

    const later = (fn: () => void, ms: number) => {
      timeouts.push(window.setTimeout(fn, ms));
    };
    const track = (animation: Animation) => {
      animations.push(animation);
      return animation;
    };

    const measure = (): Glyph[] => {
      const result: Glyph[] = [];
      root.querySelectorAll<HTMLElement>(".hero-sig-line").forEach((lineEl, line) => {
        const probe = lineEl.querySelector<HTMLElement>(".hero-sig-probe");
        const base = probe ? probe.offsetTop : lineEl.offsetTop + lineEl.offsetHeight * 0.8;
        lineEl.querySelectorAll<HTMLElement>(".hero-sig-ch").forEach((el) => {
          const size = parseFloat(getComputedStyle(el).fontSize) || 64;
          result.push({
            el,
            x: el.offsetLeft,
            y: el.offsetTop,
            w: el.offsetWidth,
            h: el.offsetHeight,
            base,
            size,
            line,
          });
        });
      });
      return result;
    };

    /** Crown resting tilted on top of a glyph. */
    const crownTransform = (glyph: Glyph) => {
      const scale = glyph.size / 98;
      return `translate(${glyph.x + glyph.w * 0.5}px, ${glyph.base - glyph.size * 0.66}px) rotate(-14deg) scale(${scale})`;
    };

    const placeCrown = () => {
      const target = glyphs.find((g) => g.line === 1);
      if (!target) return;
      crown.style.transform = crownTransform(target);
      crown.style.opacity = "1";
    };

    const canAnimate = () =>
      desktop.matches && !reducedMotion.matches && inView && document.visibilityState === "visible";

    /** Hand-drawn "line boil": cycle the turbulence seed while idle. */
    const setBoil = (on: boolean) => {
      window.clearInterval(boilTimer);
      if (on) {
        heading.style.filter = "url(#hero-sig-boil)";
        flourish.style.filter = "url(#hero-sig-boil)";
        boilTimer = window.setInterval(() => {
          boilSeed = (boilSeed % 4) + 1;
          turbulence.setAttribute("seed", String(boilSeed));
        }, 130);
      } else {
        heading.style.filter = "";
        flourish.style.filter = "";
      }
    };

    const playIntro = () => {
      introRunning = true;
      busy = true;
      let delay = 200;
      const penStops: PenStop[] = [];

      glyphs.forEach((glyph, index) => {
        const previous = glyphs[index - 1];
        if (previous && previous.line !== glyph.line) delay += 260;
        const step = glyph.line === 0 ? 78 : 92;
        const style = getComputedStyle(glyph.el);
        const dash = glyph.size * 9;

        const outline = document.createElementNS(SVG_NS, "text");
        outline.setAttribute("x", String(glyph.x));
        outline.setAttribute("y", String(glyph.base));
        outline.textContent = glyph.el.textContent;
        outline.style.cssText = `font-family:${style.fontFamily};font-weight:${style.fontWeight};font-style:${style.fontStyle};font-size:${glyph.size}px;fill:none;stroke:currentColor;stroke-width:${(glyph.size / 60).toFixed(2)}px;stroke-dasharray:${dash}px`;
        outlines.appendChild(outline);

        track(
          outline.animate(
            [
              { strokeDashoffset: `${dash}px` },
              { strokeDashoffset: `${dash * 0.2}px`, offset: 0.55 },
              { strokeDashoffset: "0px" },
            ],
            { duration: 620, delay, easing: WRITE_EASING, fill: "both" },
          ),
        );
        track(
          glyph.el.animate(
            [
              { opacity: 0, transform: "translateY(5px) rotate(-5deg)" },
              { opacity: 0, transform: "translateY(3px) rotate(-3deg)", offset: 0.55 },
              { opacity: 1, transform: "translateY(0px) rotate(0deg)" },
            ],
            { duration: 620, delay, easing: WRITE_EASING, fill: "backwards" },
          ),
        );

        penStops.push(
          { t: delay, x: glyph.x + glyph.w * 0.3, y: glyph.base - glyph.size * 0.35 },
          { t: delay + step, x: glyph.x + glyph.w * 0.9, y: glyph.base - glyph.size * 0.1 },
        );
        delay += step;
      });

      const flourishAt = delay + 80;
      track(
        flourishPath.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
          duration: 760,
          delay: flourishAt,
          easing: "cubic-bezier(.5,0,.2,1)",
          fill: "backwards",
        }),
      );
      track(
        splat.animate(
          [{ transform: "scale(0)" }, { transform: "scale(1.4)", offset: 0.4 }, { transform: "scale(1)" }],
          { duration: 380, delay: flourishAt + 780, easing: "ease-out", fill: "backwards" },
        ),
      );
      // The WAAPI fills now hold everything hidden, so the CSS guard can go.
      html.removeAttribute(INTRO_ATTR);
      try {
        sessionStorage.setItem(INTRO_PLAYED_KEY, "1");
      } catch {
        // Storage unavailable: the intro may replay, which is harmless.
      }

      // The pen follows the writing, then lifts off to the upper right.
      const firstStop = penStops[0];
      const penDuration = delay + 500;
      if (firstStop) {
        const frames: Keyframe[] = [
          {
            offset: 0,
            transform: `translate(${firstStop.x - 40}px, ${firstStop.y - 40}px)`,
            opacity: 0,
          },
        ];
        penStops.forEach((stop) =>
          frames.push({
            offset: Math.min(1, stop.t / penDuration),
            transform: `translate(${stop.x}px, ${stop.y}px)`,
            opacity: 1,
          }),
        );
        const lastStop = penStops[penStops.length - 1] ?? firstStop;
        frames.push({
          offset: 1,
          transform: `translate(${lastStop.x + 30}px, ${lastStop.y - 30}px)`,
          opacity: 0,
        });
        track(pen.animate(frames, { duration: penDuration, easing: "linear" }));
      }

      const crownGlyph = glyphs.find((g) => g.line === 1);
      if (!crownGlyph) return;

      // The crown drops in, bounces and settles on the first letter of line 2.
      later(() => {
        const rest = crownTransform(crownGlyph);
        const scale = crownGlyph.size / 98;
        const x = crownGlyph.x + crownGlyph.w * 0.5;
        const y = crownGlyph.base - crownGlyph.size * 0.66;
        crown.style.transform = rest;
        crown.style.opacity = "1";
        track(
          crown.animate(
            [
              {
                transform: `translate(${x}px, ${y - 120 * scale}px) rotate(-40deg) scale(${scale})`,
                opacity: 0,
              },
              {
                transform: `translate(${x}px, ${y + 4 * scale}px) rotate(-8deg) scale(${scale})`,
                opacity: 1,
                offset: 0.55,
              },
              {
                transform: `translate(${x}px, ${y - 10 * scale}px) rotate(-18deg) scale(${scale})`,
                offset: 0.75,
              },
              { transform: rest, opacity: 1 },
            ],
            { duration: 700, easing: "ease-out" },
          ),
        );
      }, flourishAt + 970);

      // Fade the ink outlines away and hand over to the idle loop.
      later(() => {
        track(outlines.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }))
          .finished.then(() => {
            if (disposed) return;
            outlines.replaceChildren();
            outlines.getAnimations().forEach((a) => a.cancel());
          })
          .catch(() => undefined);
        introRunning = false;
        busy = false;
        sync();
      }, flourishAt + 1700);
    };

    /** A hook lowers on a string, yanks a random letter up and drops it back. */
    const stealLetter = async () => {
      if (busy || pointerInside || !canAnimate()) return;
      const letters = glyphs.filter((g) => /\p{L}/u.test(g.el.textContent ?? ""));
      const victim = letters[Math.floor(Math.random() * letters.length)];
      if (!victim) return;
      busy = true;
      setBoil(false);

      const scale = victim.size / 98;
      const hookX = victim.x + victim.w / 2 + 9 * scale;
      const grabY = victim.base - victim.size * 0.62;
      const lift = victim.base + 320;
      const hookAt = (y: number) => `translate(${hookX}px, ${y}px) scale(${scale})`;
      const run = (el: Element, frames: Keyframe[], options: KeyframeAnimationOptions) =>
        track(el.animate(frames, { fill: "forwards", ...options })).finished;

      hook.style.opacity = "1";
      try {
        await run(hook, [{ transform: hookAt(grabY - lift) }, { transform: hookAt(grabY) }], {
          duration: 520,
          easing: "cubic-bezier(.2,.8,.3,1)",
        });
        await run(
          victim.el,
          [{ transform: "rotate(0deg)" }, { transform: "rotate(-10deg)" }, { transform: "rotate(6deg)" }],
          { duration: 260 },
        );
        await Promise.all([
          run(hook, [{ transform: hookAt(grabY) }, { transform: hookAt(grabY - lift) }], {
            duration: 650,
            easing: "cubic-bezier(.6,0,.8,.4)",
          }),
          run(
            victim.el,
            [
              { transform: "translateY(0px) rotate(6deg)" },
              { transform: `translateY(${-lift}px) rotate(18deg)` },
            ],
            { duration: 650, easing: "cubic-bezier(.6,0,.8,.4)" },
          ),
        ]);
        await new Promise((resolve) => window.setTimeout(resolve, 900));
        await Promise.all([
          run(hook, [{ transform: hookAt(grabY - lift) }, { transform: hookAt(grabY + 6 * scale) }], {
            duration: 700,
            easing: "cubic-bezier(.2,.9,.3,1)",
          }),
          run(
            victim.el,
            [
              { transform: `translateY(${-lift}px) rotate(-14deg)` },
              { transform: "translateY(6px) rotate(-4deg)" },
            ],
            { duration: 700, easing: "cubic-bezier(.2,.9,.3,1)" },
          ),
        ]);
        await Promise.all([
          run(
            victim.el,
            [
              { transform: "translateY(6px) rotate(-4deg)" },
              { transform: "translateY(-6px) rotate(5deg)" },
              { transform: "translateY(2px) rotate(-2deg)" },
              { transform: "translateY(0px) rotate(0deg)" },
            ],
            { duration: 520, easing: "ease-out" },
          ),
          run(hook, [{ transform: hookAt(grabY + 6 * scale) }, { transform: hookAt(grabY - lift) }], {
            duration: 500,
            easing: "ease-in",
          }),
        ]);
      } catch {
        // Cancelled on unmount.
      }
      if (disposed) return;
      victim.el.getAnimations().forEach((a) => a.cancel());
      hook.getAnimations().forEach((a) => a.cancel());
      hook.style.opacity = "0";
      busy = false;
      sync();
    };

    const scheduleHeist = () => {
      window.clearTimeout(heistTimer);
      if (!canAnimate()) return;
      heistTimer = window.setTimeout(
        () => {
          void stealLetter().finally(scheduleHeist);
        },
        9000 + Math.random() * 5000,
      );
    };

    /** Re-evaluate whether the idle effects should run. */
    const sync = () => {
      if (disposed) return;
      const live = canAnimate();
      if (!busy) setBoil(live);
      if (live && !busy) scheduleHeist();
      if (!live) window.clearTimeout(heistTimer);
    };

    /** Letters near the pointer hop and tilt away. */
    const onPointerMove = (event: PointerEvent) => {
      pointerInside = true;
      if (busy || !canAnimate()) return;
      glyphs.forEach((glyph, index) => {
        const rect = glyph.el.getBoundingClientRect();
        const distance = Math.hypot(
          event.clientX - (rect.left + rect.width / 2),
          event.clientY - (rect.top + rect.height * 0.45),
        );
        const pull = Math.max(0, 1 - distance / (glyph.size * 0.8));
        glyph.el.style.transform = pull
          ? `translateY(${-pull * glyph.size * 0.12}px) rotate(${(index % 2 ? 1 : -1) * pull * 9}deg)`
          : "";
      });
    };
    const onPointerLeave = () => {
      pointerInside = false;
      glyphs.forEach((glyph) => {
        glyph.el.style.transform = "";
      });
    };

    const onResize = () => {
      if (!started || introRunning) return;
      glyphs = measure();
      placeCrown();
    };

    const visibility = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      sync();
    });
    visibility.observe(root);
    const resize = new ResizeObserver(onResize);
    resize.observe(root);
    const onVisibilityChange = () => sync();
    document.addEventListener("visibilitychange", onVisibilityChange);
    desktop.addEventListener("change", sync);
    reducedMotion.addEventListener("change", sync);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerleave", onPointerLeave);

    const start = () => {
      if (disposed || started) return;
      started = true;
      glyphs = measure();
      if (html.hasAttribute(INTRO_ATTR) && canAnimate()) {
        playIntro();
      } else {
        html.removeAttribute(INTRO_ATTR);
        placeCrown();
        sync();
      }
    };
    // Measure once the script font is in (or after 2.5s, whichever is first).
    Promise.race([document.fonts.ready, new Promise((resolve) => window.setTimeout(resolve, 2500))])
      .then(start)
      .catch(start);

    return () => {
      disposed = true;
      visibility.disconnect();
      resize.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      desktop.removeEventListener("change", sync);
      reducedMotion.removeEventListener("change", sync);
      root.removeEventListener("pointermove", onPointerMove);
      root.removeEventListener("pointerleave", onPointerLeave);
      timeouts.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(heistTimer);
      window.clearInterval(boilTimer);
      animations.forEach((a) => a.cancel());
      outlines.replaceChildren();
      heading.style.filter = "";
      flourish.style.filter = "";
      hook.style.opacity = "0";
      // Keep the pre-paint intro flag if we were torn down before measuring
      // (React dev double-mount), so the remount can still play the intro.
      if (started) html.removeAttribute(INTRO_ATTR);
      glyphs.forEach((glyph) => {
        glyph.el.style.transform = "";
      });
    };
  }, [line1, line2]);

  return (
    <div ref={rootRef} className={`hero-signature${className ? ` ${className}` : ""}`}>
      <h1
        className="hero-script text-[3.4rem] leading-[0.95] sm:text-[5.5rem] md:text-[7rem] lg:text-[9rem]"
        aria-label={`${line1} ${line2}`}
      >
        <SignatureLine text={line1} />
        <span className="sr-only"> </span>
        <SignatureLine text={line2} trailing={trailing} />
      </h1>
      <svg ref={overlayRef} className="hero-sig-overlay" aria-hidden="true">
        <defs>
          <filter id="hero-sig-boil" x="-10%" y="-40%" width="120%" height="180%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={2} seed={1} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale={2.6} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g className="hs-outlines" />
        <g className="hs-crown" style={{ opacity: 0 }}>
          <path
            d="M-22 0l-4-22 12 10 14-18 14 18 12-10-4 22Z"
            fill="none"
            stroke={CROWN_RED}
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M-20 0q20-4 40 0" fill="none" stroke={CROWN_RED} strokeWidth="2" />
        </g>
        <g className="hs-hook" style={{ opacity: 0 }}>
          <line x1="0" y1="-900" x2="0" y2="0" stroke="currentColor" strokeWidth="2" />
          <path d="M0 0v10q0 10-9 10t-8-8" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        </g>
        <g className="hs-pen" style={{ opacity: 0 }}>
          <g transform="rotate(35)">
            <rect x="-5" y="-62" width="10" height="46" rx="4" fill="currentColor" />
            <rect x="-5" y="-26" width="10" height="7" fill={CROWN_RED} />
            <path d="M-5-19h10l-5 19Z" fill="#b8913a" stroke="currentColor" strokeWidth="1.2" />
          </g>
        </g>
      </svg>
      <svg ref={flourishRef} className="hero-sig-flourish" viewBox="0 -14 600 62" fill="none" aria-hidden="true">
        <path
          className="hero-sig-flo-path"
          d="M6 30C130 18 300 40 520 24c24-8 32-30 8-30c-20 0-15 30 12 32"
          stroke="currentColor"
          strokeWidth="3.4"
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1"
        />
        <circle className="hero-sig-splat" cx="560" cy="27" r="6" fill="currentColor" />
      </svg>
    </div>
  );
}
