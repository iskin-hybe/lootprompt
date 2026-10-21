"use client";

import { useEffect, useState } from "react";
import { HeroSignature } from "./hero-signature";
import { InstagramLink } from "./instagram-link";
import { NightMoon } from "./night-moon";
import { useNightShift } from "./use-night-shift";
import "./hero.css";

const INTRO_PLAYED_KEY = "hero-intro-played";

/** Whether this tab has already seen the intro; marks it as seen either way. */
function claimFirstVisit(): boolean {
  try {
    if (sessionStorage.getItem(INTRO_PLAYED_KEY)) return false;
    sessionStorage.setItem(INTRO_PLAYED_KEY, "1");
  } catch {
    // Storage blocked: treat it as a first visit, like the source.
  }
  return true;
}

/** Homepage hero: kicker, script signature, subtitle, links and the `C` key chip. */
export function Hero() {
  const night = useNightShift();
  const [intro, setIntro] = useState(false);

  useEffect(() => {
    if (!claimFirstVisit()) return;
    // sessionStorage is only readable after mount, so the intro flag has to be set here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIntro(true);
  }, []);

  return (
    <section
      className={`mx-auto flex w-full max-w-5xl flex-col items-center px-5 pb-20 pt-24 text-center sm:px-6 md:pt-44 ${intro ? "hero-intro" : ""}`}
    >
      <p className="hero-fade font-ui text-[0.65rem] uppercase tracking-[0.32em] text-muted-foreground sm:text-[0.7rem]">
        Prompt database
      </p>
      <div className="scroll-parallax-hero relative mt-8 w-full">
        <HeroSignature
          line1="Prompts by"
          line2="Deniz Akkabak"
          trailing={
            night ? (
              <span className="night-moon" title="Night shift">
                <NightMoon size={28} />
              </span>
            ) : null
          }
        />
      </div>
      <div className="scroll-parallax-sub">
        <p className="hero-fade hero-fade-late mt-10 font-ui text-base text-foreground sm:text-lg md:text-xl">
          {night ? (
            "Real thieves work at this hour."
          ) : (
            <>
              Steal my{" "}
              <span className="relative inline-block">
                prompts
                <svg
                  viewBox="0 0 120 10"
                  preserveAspectRatio="none"
                  fill="none"
                  aria-hidden="true"
                  className="ink-draw absolute -bottom-2 left-[-6%] h-[9px] w-[112%] text-[var(--accent)]"
                >
                  <path
                    d="M2 7.2C22 3.4 52 2.2 78 4.1C94 5.2 108 6.4 118 5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              . I mean it.
            </>
          )}
        </p>
      </div>
      <div className="hero-fade hero-fade-late mt-8 flex items-center gap-4">
        <a
          href="/koleksiyonum"
          className="font-ui text-[0.7rem] uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
        >
          My Collection
        </a>
        <InstagramLink />
      </div>
      <span className="hero-fade hero-fade-late key-chip mt-6" aria-label="Keyboard shortcut C">
        C
      </span>
    </section>
  );
}
