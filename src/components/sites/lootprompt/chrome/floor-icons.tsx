"use client";

import { useEffect, useState } from "react";

/** A thief's mask in the floor lists (source `Wd`). */
export function ThiefMask({ variant = "classic", size = 24 }: { variant?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.2" />
      <path
        d={
          variant === "monocle"
            ? "M7 9c2-2 4-2 6 0M15 9c1-1 3-1 4 0"
            : "M6 9c2-1.6 4-1.6 6 0M15 9c2-1.6 4-1.6 6 0"
        }
        stroke="currentColor"
        strokeWidth="1.15"
        strokeLinecap="round"
      />
      <path
        d={variant === "cat-eye" ? "M3 9 9 7l3 2-3 3-6-1ZM21 9l-6-2-3 2 3 3 6-1Z" : "M3 9h18v4H3z"}
        fill="currentColor"
        opacity=".9"
      />
      {variant === "monocle" ? (
        <circle cx="17" cy="11" r="3.3" stroke="currentColor" strokeWidth="1" />
      ) : null}
      {variant === "phantom" ? (
        <path d="M8 17c2 1.4 6 1.4 8 0" stroke="currentColor" strokeWidth="1" strokeLinecap="round" />
      ) : null}
      {variant === "owl" ? (
        <>
          <circle cx="8" cy="11" r="1" fill="var(--bone)" />
          <circle cx="16" cy="11" r="1" fill="var(--bone)" />
        </>
      ) : null}
    </svg>
  );
}

/** One masked face in the vault pill (source `Gm`). */
export function BanditFace({ size = 18, caught = false }: { size?: number; caught?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M3.8 10.2h16.4"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        opacity="0.85"
      />
      {caught ? (
        <>
          <circle cx="9.2" cy="10.2" r="1.05" fill="var(--bone)" />
          <circle cx="14.8" cy="10.2" r="1.05" fill="var(--bone)" />
          <path d="M10.2 16.6h3.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </>
      ) : (
        <path
          d="M9 16.4c1.9.9 4.1.9 6 0"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

type BanditGag = "peek" | "duck" | "cheer";

/**
 * Stick-figure bandit tiptoeing on the pill; every 20–30s he peeks up or ducks
 * for 2.3s (source `Km`).
 */
export function VaultBandit({ cheer }: { cheer: boolean }) {
  const [gag, setGag] = useState<BanditGag | null>(null);

  useEffect(() => {
    let timer = 0;
    let reset = 0;
    const schedule = () => {
      timer = window.setTimeout(
        () => {
          setGag(Math.random() > 0.5 ? "peek" : "duck");
          reset = window.setTimeout(() => setGag(null), 2300);
          schedule();
        },
        20000 + Math.random() * 10000,
      );
    };
    schedule();
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(reset);
    };
  }, []);

  return (
    <svg
      className="vault-bandit"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      data-gag={cheer ? "cheer" : (gag ?? undefined)}
    >
      <g className="vault-bandit-body">
        <circle cx="12" cy="9" r="4.6" stroke="currentColor" strokeWidth="1.2" />
        <path
          d="M7.6 8h8.8"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M12 13.6v5M12 18.6 9.4 22M12 18.6l2.6 3.4M12 15.2l4.4 1.6"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          className="vault-bandit-arm"
          d="M12 15.2 6.6 17"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}
