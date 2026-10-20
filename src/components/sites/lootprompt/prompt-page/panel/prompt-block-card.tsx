"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InkStamp } from "../../gallery/card-parts";
import { stampAngle } from "../../gallery/lib";
import { stealPrompt, type StealStamp } from "../../gallery/use-steal";
import type { PromptBlock } from "../../prompt-details";
import { parseAnatomy } from "./anatomy";
import { PromptAnatomy } from "./prompt-anatomy";

const COPIED_MS = 1600;
const STAMP_MS = 1300;

/**
 * One prompt block with its own steal button (source `ze`). Used for "Other prompts in
 * this tutorial" and, with `inline`, for blocks embedded in the tutorial article.
 */
export function PromptBlockCard({
  block,
  promptId,
  promptTitle,
  inline = false,
}: {
  block: PromptBlock;
  promptId: string;
  promptTitle: string;
  inline?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [stamp, setStamp] = useState<StealStamp | null>(null);
  const sections = useMemo(() => parseAnatomy(block.text), [block.text]);
  const uid = `anat-${promptId}-${block.label.replace(/\W+/g, "")}`;
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((t) => window.clearTimeout(t));
  }, []);

  const steal = useCallback(async () => {
    try {
      await stealPrompt({ id: promptId, title: promptTitle, prompt: block.text });
    } catch {
      return;
    }
    setCopied(true);
    timers.current.push(window.setTimeout(() => setCopied(false), COPIED_MS));
    const key = Date.now();
    setStamp({ angle: stampAngle(), key });
    timers.current.push(window.setTimeout(() => setStamp((s) => (s && s.key === key ? null : s)), STAMP_MS));
  }, [block.text, promptId, promptTitle]);

  return (
    <div
      className={`relative overflow-hidden rounded-[15px] border border-[var(--paper-line)] bg-[var(--card-surface)] p-4 sm:p-5${inline ? " my-6" : ""}`}
    >
      {stamp ? <InkStamp key={stamp.key} stamp={stamp} /> : null}
      <div className="flex items-center justify-between gap-3">
        <p className="flex min-w-0 items-center gap-1.5 truncate font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
          <span className="truncate">{block.label}</span>
        </p>
        <button
          type="button"
          onClick={() => void steal()}
          aria-label={`Steal ${block.label}`}
          className="pill pill-40 shrink-0 cursor-pointer items-center gap-2 border border-[var(--paper-line)] font-ui text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Stolen" : `Steal — ${block.label}`}
        </button>
      </div>
      <div className="mt-3 rounded-[10px] bg-[var(--prompt-panel)] p-4">
        {sections ? (
          <PromptAnatomy sections={sections} uid={uid} />
        ) : (
          <p className="whitespace-pre-wrap font-mono text-[0.78rem] leading-relaxed text-muted-foreground">
            {block.text}
          </p>
        )}
      </div>
    </div>
  );
}
