"use client";

import { useEffect, useRef, useState } from "react";
import type { PromptDetailReference } from "../../prompt-details";

/** URL-safe slug of a title (source `u` in the docx-constants chunk). */
function slugify(title: string): string {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "post"
  );
}

function videoExtension(path: string): "mov" | "mp4" {
  return /\.mov(?:[?#]|$)/i.test(path) ? "mov" : "mp4";
}

/** `lootprompt-<title>-reference[-n].<ext>` (source `Oe`). */
export function referenceFilename(title: string, index: number, ext: string): string {
  return `lootprompt-${slugify(title)}-reference${index > 0 ? `-${index + 1}` : ""}.${ext}`;
}

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function formatSize(bytes: number): string {
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

const canHover = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/**
 * Download card for a motion reference (source `ke`). The clone serves the
 * H.264 MP4 copy, so kind, size and filename describe that file.
 */
export function ReferenceDownload({ reference, title, index }: { reference: PromptDetailReference; title: string; index: number }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);
  const ext = videoExtension(reference.src);

  // A load error can land before hydration attaches onError; pick it up on mount.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing with the media element's state
    if (videoRef.current?.error) setFailed(true);
  }, []);
  const filename = referenceFilename(title, index, ext);
  const meta = [
    ext.toUpperCase(),
    reference.bytes == null ? null : formatSize(reference.bytes),
    reference.durationSeconds == null ? null : formatDuration(reference.durationSeconds),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <a
      href={reference.src}
      download={filename}
      aria-label={`Download video reference: ${reference.label}`}
      className="ref-dl"
      onMouseEnter={() => {
        if (!canHover() || failed) return;
        videoRef.current
          ?.play()
          .then(() => setPlaying(true))
          .catch(() => {});
      }}
      onMouseLeave={() => {
        videoRef.current?.pause();
        setPlaying(false);
      }}
    >
      <span className="ref-dl__thumb" aria-hidden="true">
        {failed ? (
          <span className="ref-dl__film" aria-hidden="true">
            <svg
              viewBox="0 0 48 48"
              width="28"
              height="28"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="7" y="9" width="34" height="30" rx="3" />
              <path d="M13 9v30M35 9v30M7 16h6M7 24h6M7 32h6M35 16h6M35 24h6M35 32h6M20 19l9 5-9 5z" />
            </svg>
          </span>
        ) : null}
        <video
          ref={videoRef}
          onError={() => setFailed(true)}
          style={failed ? { display: "none" } : undefined}
          muted
          playsInline
          loop
          preload="metadata"
          src={`${reference.src}#t=0.1`}
        />
        {playing || failed ? null : <span className="ref-dl__play">▶</span>}
      </span>
      <span className="ref-dl__text">
        <span className="ref-dl__kicker">Video reference</span>
        <span className="ref-dl__label">{reference.label}</span>
        <span className="ref-dl__meta">{meta}</span>
      </span>
      <span className="ref-dl__btn" aria-hidden="true">
        <span className="ref-dl__arrow">↓</span> Download
      </span>
    </a>
  );
}
