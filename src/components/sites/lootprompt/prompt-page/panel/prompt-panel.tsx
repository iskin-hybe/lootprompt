"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { InkStamp, ReferenceChip, useMounted } from "../../gallery/card-parts";
import { usePromptPage } from "../context";
import { flyLootSlip } from "./loot-slip";
import { PromptBlockCard } from "./prompt-block-card";
import { composeRemix, isRemixed, parseRemix, type RemixValues } from "./remix";
import { RemixText } from "./remix-text";
import "./panel.css";

const PROMPT_FALLBACK = "Prompt";

/**
 * The prompt panel of /prompt/:id (source route `Xe`, from the "Prompt" section through
 * "References"): the main prompt with its steal button and remix tokens, every other
 * prompt block of the tutorial, then the reference images.
 */
export function PromptPanel() {
  const { prompt, detail } = usePromptPage();
  const blocks = detail.promptBlocks;
  const mounted = useMounted();
  const imageReferences = detail.references.filter((reference) => reference.type !== "video");

  return (
    <>
      <MainPrompt key={prompt.id} />
      {blocks.length > 1 ? (
        <section className="mt-6 space-y-4" aria-label="Other prompts in this tutorial">
          <p className="font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
            Other prompts in this tutorial
          </p>
          {blocks.slice(0, -1).map((block, index) => (
            <PromptBlockCard
              key={`${block.label}-${index}`}
              block={block}
              promptId={prompt.id}
              promptTitle={prompt.title}
            />
          ))}
        </section>
      ) : null}
      {/* Input → Output comparisons (source `Je`) would go here; no prompt in the snapshot has any. */}
      {mounted && imageReferences.length > 0 ? (
        <section className="mt-10" aria-label="References">
          <p className="font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">References</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {imageReferences.map((reference, index) => (
              <ReferenceChip key={`${reference.label}-${index}`} reference={reference} />
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}

/** The main ("last") prompt block: steal button, remix tokens, copied note. */
function MainPrompt() {
  const { prompt, detail, setComposedPrompt, steal, copied, stamp, copiedRemix } = usePromptPage();
  const [values, setValues] = useState<RemixValues>({});
  const { segments, tokens } = useMemo(() => parseRemix(prompt.prompt), [prompt.prompt]);
  const composed = useMemo(() => composeRemix(segments, values), [segments, values]);
  const remixed = isRemixed(tokens, values);
  const label = detail.promptBlocks.at(-1)?.label ?? PROMPT_FALLBACK;
  const stealButton = useRef<HTMLButtonElement>(null);
  const composedRef = useRef(composed);

  useEffect(() => {
    composedRef.current = composed;
    setComposedPrompt(composed, remixed);
  }, [composed, remixed, setComposedPrompt]);

  // Every steal of this prompt (button, C key, mini bar) sends a slip of it to the vault pill,
  // starting from the focused control as the source does.
  const stampKey = stamp?.key;
  useEffect(() => {
    if (stampKey === undefined) return;
    const active = document.activeElement;
    const from = active instanceof HTMLElement ? active : stealButton.current;
    void flyLootSlip(from, composedRef.current).catch(() => {});
  }, [stampKey]);

  return (
    <section className="mt-10" aria-label="Prompt">
      <div
        className={`relative rounded-[15px] border border-[var(--paper-line)] bg-[var(--card-surface)] p-5 sm:p-6${stamp ? " paper-jolt" : ""}`}
      >
        {stamp ? <InkStamp key={stamp.key} stamp={stamp} /> : null}
        <div className="flex items-start justify-between gap-4">
          <p className="font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
          <button
            ref={stealButton}
            type="button"
            onClick={() => void steal()}
            aria-label="Steal this prompt"
            title="Press C to steal"
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-[var(--paper-line)] px-3 py-1.5 font-ui text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Stolen" : detail.promptBlocks.length > 1 ? `Steal — ${label}` : "Steal"}
            <span className="key-chip !ml-1 !h-5 !min-w-5 !text-[0.6rem]" aria-hidden="true">
              C
            </span>
          </button>
        </div>
        {tokens.length > 0 ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-ui text-[0.68rem] text-muted-foreground">
              Click the underlined parts to remix the prompt.
            </p>
            {remixed ? (
              <button
                type="button"
                onClick={() => setValues({})}
                className="font-ui text-[0.68rem] text-muted-foreground underline decoration-dotted underline-offset-4 transition-colors hover:text-foreground"
              >
                Reset
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="mt-3 rounded-[10px] bg-[var(--prompt-panel)] p-4">
          <RemixText
            segments={segments}
            values={values}
            onChange={(id, value) => setValues((prev) => ({ ...prev, [id]: value }))}
          />
        </div>
        {copiedRemix && copied ? (
          <p className="mt-3 animate-fade-in font-ui text-[0.72rem] text-muted-foreground">
            You remixed this prompt — share the result with @deniz.akkabak
          </p>
        ) : null}
      </div>
    </section>
  );
}
