"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SITE_ORIGIN } from "../data";
import { Fingerprint } from "./fingerprint";
import { hasPrinted, leavePrint, patternSeed } from "./guestbook";
import { InkToaster, type ToastKind, type ToastMessage } from "./ink-toast";
import "./ink-pad.css";

/** Holding the pad this long inks the whole print and submits it. */
const HOLD_MS = 1000;
const GUEST_SEED = "misafir";

const COPY = {
  sectionLabel: "Leave your fingerprint",
  tapHint: "Tap the pad — your print lands on the Crime Scene wall",
  printTaken: "Print taken",
  tapOrHold: "Tap or hold to leave your fingerprint",
  inking: "inking…",
  tapToLeave: "tap to leave your print",
  notePlaceholder: "One-line note (optional)",
  handlePlaceholder: "@your handle (optional)",
  printTakenLine: "print taken —",
  crimeSceneLink: "Crime Scene",
  alreadyOnFile: "Print already on file — one print per person.",
  printOnWall: "Print taken — it's on the Crime Scene wall now.",
};

/**
 * Fingerprint "ink pad": tap to leave a print, or hold to watch it ink in.
 * Prints are kept locally (see ./guestbook.ts) instead of the source's database.
 */
export function InkPad({ promptId, compact = false }: { promptId: string | null; compact?: boolean }) {
  const [seed] = useState(() => patternSeed());
  const [done, setDone] = useState(() => hasPrinted(promptId));
  const [progress, setProgress] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [handle, setHandle] = useState("");
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const frame = useRef<number | null>(null);
  const pressStart = useRef(0);
  const submitted = useRef(false);

  const closeToast = useCallback(() => setToast(null), []);

  const stopInking = useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    stopInking();
    setPressed(false);
    setProgress(1);
    setPending(true);
    const showToast = (kind: ToastKind, text: string) => setToast({ id: Date.now(), kind, text });
    leavePrint({ promptId, handle, note })
      .then(({ already }) => {
        setDone(true);
        showToast("success", already ? COPY.alreadyOnFile : COPY.printOnWall);
      })
      .catch((error: unknown) => {
        submitted.current = false;
        showToast("error", error instanceof Error ? error.message : String(error));
        setProgress(0);
      })
      .finally(() => setPending(false));
  }, [promptId, handle, note, stopInking]);

  useEffect(() => stopInking, [stopInking]);

  const busy = done || pending;

  const onPointerDown = () => {
    if (busy) return;
    setPressed(true);
    pressStart.current = Date.now();
    stopInking();
    function step() {
      const t = Math.min(1, (Date.now() - pressStart.current) / HOLD_MS);
      setProgress(t);
      if (t >= 1) {
        submit();
        return;
      }
      frame.current = requestAnimationFrame(step);
    }
    frame.current = requestAnimationFrame(step);
  };

  // Releasing early still leaves the print (a tap).
  const onPointerUp = () => {
    if (!pressed) return;
    if (busy) {
      setPressed(false);
      stopInking();
      return;
    }
    submit();
  };

  const onPointerAbort = () => {
    if (!pressed) return;
    setPressed(false);
    stopInking();
    setProgress(0);
  };

  // Keyboard activation.
  const onClick = () => {
    if (!busy && !pressed) submit();
  };

  const crimeSceneHref = `${SITE_ORIGIN}/olay-yeri`;

  return (
    <section aria-label={COPY.sectionLabel} className={compact ? "flex flex-col items-center gap-2" : "mt-14"}>
      {compact ? null : (
        <div className="mb-4">
          <p className="font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
            {COPY.sectionLabel}
          </p>
          <p className="mt-1 font-hand text-lg text-muted-foreground">{COPY.tapHint}</p>
        </div>
      )}
      <div
        className={
          compact
            ? "flex flex-col items-center gap-2"
            : "flex flex-col gap-5 rounded-[15px] border border-[var(--paper-line)] bg-[var(--card-surface)] p-5 sm:flex-row sm:items-center"
        }
      >
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerAbort}
          onPointerCancel={onPointerAbort}
          onClick={onClick}
          onContextMenu={(e) => e.preventDefault()}
          disabled={busy}
          aria-label={done ? COPY.printTaken : COPY.tapOrHold}
          title={done ? COPY.printTaken : COPY.sectionLabel}
          className={`ink-pad ${pressed ? "is-pressed" : ""} ${done ? "is-done" : ""}`}
        >
          <Fingerprint
            seed={seed || GUEST_SEED}
            progress={done ? 1 : progress}
            className="h-full w-full text-foreground"
          />
        </button>
        <div className={compact ? "text-center" : "min-w-0 flex-1"}>
          {done ? (
            <p className="font-hand text-lg text-muted-foreground">
              {COPY.printTakenLine}{" "}
              <a href={crimeSceneHref} className="underline decoration-accent underline-offset-4">
                {COPY.crimeSceneLink}
              </a>
            </p>
          ) : (
            <>
              <p className="font-hand text-lg text-muted-foreground">
                {pressed ? COPY.inking : COPY.tapToLeave}
              </p>
              <div className={compact ? "mt-2 flex flex-col gap-2" : "mt-3 grid gap-2 sm:grid-cols-2"}>
                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={COPY.notePlaceholder}
                  maxLength={120}
                  className="search-field !h-10 !rounded-[10px]"
                />
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder={COPY.handlePlaceholder}
                  maxLength={40}
                  className="search-field !h-10 !rounded-[10px]"
                />
              </div>
            </>
          )}
        </div>
      </div>
      <InkToaster toast={toast} onClose={closeToast} />
    </section>
  );
}
