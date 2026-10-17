"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { AVATAR_STYLE_ORDER, ThiefAvatarPack } from "./thief-avatar-pack";
import { prefersReducedMotion, readStorage, writeStorage } from "./use-hydrated";

const CLOSED_KEY = "lp-crew-window-closed";
/** Once closed, the window stays away for a week. */
const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;
const SHOW_AFTER_MS = 6000;
const BLINK_EVERY_MS = 2000;
const SLOTS = [0, 1, 2] as const;

function isSnoozed(): boolean {
  const closedAt = Number(readStorage("local", CLOSED_KEY) ?? 0);
  return Date.now() - closedAt < SNOOZE_MS;
}

/** Each slot swaps to a new thief every third tick, staggered by slot. */
function slotStyle(slot: number, tick: number): string {
  const swaps = Math.max(0, Math.floor((tick - slot + 3) / 3));
  return AVATAR_STYLE_ORDER[(slot * 5 + swaps * 3) % AVATAR_STYLE_ORDER.length];
}

/**
 * "Your thief file is waiting" window, bottom-left. Appears after 6s or a third
 * of the way down the page; a compact pill on phones (source `Xg`).
 */
export function CrewWindow({ onJoin }: { onJoin: () => void }) {
  const [visible, setVisible] = useState(false);
  const [closed, setClosed] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (isSnoozed()) return;
    const show = () => setVisible(true);
    const timer = window.setTimeout(show, SHOW_AFTER_MS);
    const onScroll = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable > 0 && window.scrollY / scrollable >= 1 / 3) show();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!visible || prefersReducedMotion()) return;
    const interval = window.setInterval(() => setTick((t) => t + 1), BLINK_EVERY_MS);
    return () => window.clearInterval(interval);
  }, [visible]);

  if (closed || !visible) return null;

  const close = () => {
    setClosed(true);
    writeStorage("local", CLOSED_KEY, String(Date.now()));
  };
  const blinking = tick % 3;

  return (
    <aside className="crew-window" aria-label="Join the crew">
      <button type="button" className="crew-window-x" aria-label="Close" onClick={close}>
        <X className="size-3.5" aria-hidden="true" />
      </button>
      <div className="crew-window-avatars" aria-hidden="true">
        {SLOTS.map((slot) => (
          <span
            key={slot}
            className={`crew-window-avatar${slot === blinking ? " is-blink" : ""}`}
          >
            <ThiefAvatarPack style={slotStyle(slot, tick)} seed={`crew-${slot}`} size={40} />
          </span>
        ))}
      </div>
      <p className="crew-window-title">Your thief file is waiting</p>
      <p className="crew-window-line">
        Open every heist, follow other thieves, earn badges and get your own WANTED poster.
      </p>
      <button type="button" className="crew-window-cta" onClick={onJoin}>
        <span className="crew-window-cta-long">Join the crew — it&apos;s free</span>
        <span className="crew-window-cta-short">Join the crew</span>
      </button>
    </aside>
  );
}
