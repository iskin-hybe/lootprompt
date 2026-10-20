"use client";

import { useEffect, useRef, useState } from "react";
import type { RemixSegment, RemixToken, RemixValues } from "./remix";

/** The main prompt with its remix tokens as editable underlined values (source `Re`). */
export function RemixText({
  segments,
  values,
  onChange,
}: {
  segments: RemixSegment[];
  values: RemixValues;
  onChange: (tokenId: string, value: string) => void;
}) {
  return (
    <p className="whitespace-pre-line font-mono text-[0.8rem] leading-relaxed text-foreground/80">
      {segments.map((segment, index) =>
        segment.kind === "text" ? (
          <span key={`t-${index}`}>{segment.text}</span>
        ) : (
          <RemixTokenButton
            key={segment.token.id}
            token={segment.token}
            value={values[segment.token.id] ?? segment.token.original}
            onChange={(value) => onChange(segment.token.id, value)}
          />
        ),
      )}
    </p>
  );
}

/** One underlined value; opens a small popover with a free-text field and suggestions (source `B`). */
function RemixTokenButton({
  token,
  value,
  onChange,
}: {
  token: RemixToken;
  value: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The draft follows the committed value (e.g. after Reset), as the source's effect does.
  if (syncedValue !== value) {
    setSyncedValue(value);
    setDraft(value);
  }

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    inputRef.current?.select();
    const onMouseDown = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open]);

  const commit = (next: string) => {
    const trimmed = next.trim();
    onChange(trimmed === "" ? token.original : trimmed);
    setOpen(false);
  };

  return (
    <span ref={wrapRef} className="remix-token-wrap">
      <button
        type="button"
        className={`remix-token${value === token.original ? "" : " is-edited"}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={`Edit ${token.name} value`}
        aria-expanded={open}
      >
        {value}
      </button>
      {open ? (
        <span className="remix-pop" role="dialog" aria-label={`${token.name} options`}>
          <span className="remix-pop-label">{token.name}</span>
          <input
            ref={inputRef}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit(draft);
              } else if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              }
            }}
            className="remix-input"
          />
          {token.suggestions.length > 0 ? (
            <span className="remix-suggestions">
              {token.suggestions.map((suggestion) => (
                <button key={suggestion} type="button" className="remix-suggestion" onClick={() => commit(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </span>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
