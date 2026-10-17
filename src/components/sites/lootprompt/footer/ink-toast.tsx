"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./ink-toast.css";

export type ToastKind = "success" | "error";

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

const DURATION_MS = 4000;
const EXIT_MS = 400;

const ICON_PATHS: Record<ToastKind, string> = {
  success:
    "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
  error:
    "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
};

function ToastCard({ toast, onClose }: { toast: ToastMessage; onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [paused, setPaused] = useState(false);
  const remaining = useRef(DURATION_MS);

  // Slide in on the frame after mount.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setMounted(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Auto-dismiss; hovering pauses the countdown.
  useEffect(() => {
    if (paused || removed) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(() => setRemoved(true), remaining.current);
    return () => {
      window.clearTimeout(timer);
      remaining.current -= Date.now() - startedAt;
    };
  }, [paused, removed]);

  useEffect(() => {
    if (!removed) return;
    const timer = window.setTimeout(onClose, EXIT_MS);
    return () => window.clearTimeout(timer);
  }, [removed, onClose]);

  return (
    <li
      tabIndex={0}
      className="lp-toast"
      data-type={toast.kind}
      data-mounted={mounted}
      data-removed={removed}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div data-icon="">
        <svg viewBox="0 0 20 20" fill="currentColor" height="20" width="20" aria-hidden="true">
          <path fillRule="evenodd" d={ICON_PATHS[toast.kind]} clipRule="evenodd" />
        </svg>
      </div>
      <div data-content="">
        <div data-title="">{toast.text}</div>
      </div>
    </li>
  );
}

/** Bottom-center toast, styled like the source's sonner toaster. */
export function InkToaster({
  toast,
  onClose,
}: {
  toast: ToastMessage | null;
  onClose: () => void;
}) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <section aria-label="Notifications" aria-live="polite" aria-relevant="additions text" aria-atomic="false">
      {toast ? (
        <ol dir="ltr" className="lp-toaster">
          <ToastCard key={toast.id} toast={toast} onClose={onClose} />
        </ol>
      ) : null}
    </section>,
    document.body,
  );
}
