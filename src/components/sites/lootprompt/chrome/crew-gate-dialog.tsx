"use client";

import { Check, Lock, X } from "lucide-react";
import { useEffect, useRef, type RefObject } from "react";
import { CrewAuthForm } from "./auth-modal";
import { DenizWorkshop } from "../job-board/deniz-workshop";
import { jobBoard as jobBoardTeaser, type Prompt } from "../data";
import { BodyPortal } from "./portal";
import { removeStorage, writeStorage } from "./use-hydrated";

const JOIN_SOURCE_KEY = "lp-join-source";
const GATE_TARGET_KEY = "lp-gate-target";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keeps Tab inside the dialog and restores focus on close (source `Wg`). */
function useFocusTrap(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const previous = document.activeElement as HTMLElement | null;
    const focusables = () => Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE));
    const timer = window.setTimeout(() => focusables()[0]?.focus(), 30);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => {
      window.clearTimeout(timer);
      el.removeEventListener("keydown", onKeyDown);
      previous?.focus?.();
    };
  }, [ref]);
}

/** Remembers where the guest hit the gate, for attribution after joining. */
export function clearGateTarget() {
  removeStorage("session", GATE_TARGET_KEY);
}

/** "This heist is crew-only" sign-up gate (source `Gg`). */
export function CrewGateDialog({
  prompt,
  total,
  source,
  onClose,
}: {
  prompt: Prompt | null;
  total: number;
  source: string;
  onClose: () => void;
}) {
  const cardRef = useRef<HTMLElement>(null);
  useFocusTrap(cardRef);
  const jobBoard = source === "job_board" && !prompt;
  const poster = prompt ? (prompt.media.poster ?? prompt.media.src) : null;

  useEffect(() => {
    writeStorage("session", JOIN_SOURCE_KEY, source);
    if (prompt?.id) writeStorage("session", GATE_TARGET_KEY, prompt.id);
  }, [source, prompt?.id]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const checks = jobBoard
    ? [
        "pitch a prompt for Deniz to make",
        "back the jobs you want — 30 backers and it's greenlit",
        "every prompt and tutorial",
      ]
    : ["every prompt and tutorial", "your own thief file and badges", "follow the best thieves"];

  return (
    <BodyPortal>
      <div className="crew-gate-overlay" onClick={onClose}>
        <section
          ref={cardRef}
          className="crew-gate-card"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crew-gate-title"
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" className="crew-gate-x" aria-label="Close" onClick={onClose}>
            <X className="size-4" aria-hidden="true" />
          </button>
          <div className={`crew-gate-poster${jobBoard ? " is-job-board" : ""}`}>
            {jobBoard ? (
              <DenizWorkshop job={null} goal={jobBoardTeaser.goal} mini viewBox="120 90 260 190" />
            ) : poster ? (
              // eslint-disable-next-line @next/next/no-img-element -- poster fills the frame via CSS
              <img src={poster} alt={prompt?.title ?? ""} />
            ) : (
              <Lock className="size-8" aria-hidden="true" />
            )}
            <span className="crew-gate-stamp" aria-hidden="true">
              Locked
            </span>
          </div>
          <div className="crew-gate-body">
            <h2 id="crew-gate-title" className="crew-gate-title">
              {jobBoard ? "The Job Board is crew-only" : "This heist is crew-only"}
            </h2>
            <p className="crew-gate-line">
              {jobBoard
                ? "Join free to pitch the prompts you want and back other thieves' requests."
                : `Join free to open all ${total > 0 ? `${total} ` : ""}prompts.`}
            </p>
            <ul className="crew-gate-checks">
              {checks.map((line) => (
                <li key={line}>
                  <Check className="size-3.5" aria-hidden="true" /> {line}
                </li>
              ))}
            </ul>
            <div className="crew-gate-auth">
              <CrewAuthForm googleFirst hideLabel />
            </div>
            <button type="button" className="crew-gate-later" onClick={onClose}>
              Maybe later
            </button>
          </div>
        </section>
      </div>
    </BodyPortal>
  );
}
