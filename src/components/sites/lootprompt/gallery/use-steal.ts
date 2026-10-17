"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cleanPrompt, copyText, isNight, stampAngle } from "./lib";
import { announceSteal, claimStealCount, recordStealLocally } from "./stores";
import { showToast } from "./toast";

export interface StealStamp {
  angle: number;
  key: number;
}

const REEL_SOUND_KEY = "reel-sound-on";

/** Short "clunk" when the visitor has opted into sound elsewhere on the site. */
function playStealSound(): void {
  try {
    if (localStorage.getItem(REEL_SOUND_KEY) !== "1") return;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(48, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.16, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + 0.16);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.18);
    osc.onended = () => void ctx.close().catch(() => {});
  } catch {
    // audio is optional
  }
}

/** Copies a prompt and records the steal; resolves true when the public counter moved. */
export async function stealPrompt(prompt: { id: string; title: string; prompt: string }): Promise<boolean> {
  await copyText(cleanPrompt(prompt.prompt));
  showToast(isNight() ? "✓ night job done — nobody saw" : "✓ prompt stolen — enjoy", "ink", 2000);
  playStealSound();
  recordStealLocally(prompt.id, prompt.title);
  announceSteal(prompt.id, prompt.title);
  return claimStealCount(prompt.id);
}

/** Card-level steal state: copied flag, ink stamp and the live counter. */
export function useSteal(prompt: { id: string; title: string; prompt: string; copyCount: number }) {
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState(prompt.copyCount);
  const [stamp, setStamp] = useState<StealStamp | null>(null);
  const copiedTimer = useRef<number | null>(null);
  const promptRef = useRef(prompt);

  useEffect(() => {
    promptRef.current = prompt;
  });

  useEffect(
    () => () => {
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  const steal = useCallback(async () => {
    try {
      const bumped = await stealPrompt(promptRef.current);
      setCopied(true);
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
      copiedTimer.current = window.setTimeout(() => setCopied(false), 1600);
      const key = Date.now();
      setStamp({ angle: stampAngle(), key });
      window.setTimeout(() => setStamp((s) => (s && s.key === key ? null : s)), 1300);
      if (bumped) setCount((c) => c + 1);
      return true;
    } catch {
      return false;
    }
  }, []);

  return { steal, copied, stamp, count };
}

/** The STOLEN / NIGHT JOB ink stamp that slams onto a card. */
export function stampLabel(): string {
  return isNight() ? "NIGHT JOB" : "STOLEN";
}
