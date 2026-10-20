"use client";

import { useRef } from "react";
import { useHydrated } from "../../chrome/use-hydrated";
import { usePromptPage } from "../context";
import { HeistPlan } from "./heist-plan";
import { TutorialArticle } from "./tutorial-article";
import { useDocBlurup } from "./use-doc-blurup";
import "./tutorial.css";

const LABEL = "font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground";

/** The "Tutorial" section of a prompt page (source route `Xe`). */
export function PromptTutorial() {
  const { prompt, detail } = usePromptPage();
  const articleRef = useRef<HTMLDivElement>(null);
  const hydrated = useHydrated();
  const html = detail.tutorialHtml;
  useDocBlurup(articleRef, html ?? "");

  return (
    <section className="mt-12" aria-label="Tutorial">
      <p className={LABEL}>Tutorial</p>
      {html ? (
        <>
          {hydrated ? <HeistPlan containerRef={articleRef} /> : null}
          <div ref={articleRef}>
            <TutorialArticle
              html={html}
              blocks={detail.promptBlocks}
              promptId={prompt.id}
              promptTitle={prompt.title}
            />
          </div>
        </>
      ) : (
        <NoWalkthrough model={prompt.model} pipelineInfo={detail.pipelineInfo ?? prompt.pipelineInfo} />
      )}
    </section>
  );
}

/** Fallback for prompts that have no tutorial document. */
function NoWalkthrough({ model, pipelineInfo }: { model: string; pipelineInfo: string | null }) {
  const facts = [
    { term: "Model", value: model },
    { term: "Aspect ratio", value: "9:16" },
    { term: "Pipeline", value: pipelineInfo ?? "Single pass" },
  ];
  return (
    <div className="mt-4 rounded-[15px] border border-dashed border-[var(--paper-line)] bg-[var(--card-surface)] p-5">
      <p className="font-ui text-sm text-muted-foreground">
        No walkthrough for this one yet. Everything you need is in the prompt above — copy it, keep the model and
        settings shown, and swap the underlined parts to make it yours.
      </p>
      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        {facts.map((fact) => (
          <div key={fact.term}>
            <dt className={LABEL}>{fact.term}</dt>
            <dd className="mt-1 font-ui text-sm text-foreground">{fact.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
