"use client";

import { ArrowLeft, Pin } from "lucide-react";
import Link from "next/link";
import { findBrand, type Brand } from "../../data";
import { BrandInk, Engagement, InstagramIcon, StealCount } from "../../gallery/card-parts";
import { usePromptPage } from "../context";
import { InstagramReel } from "./instagram-reel";
import { PromptMediaCard } from "./media-card";
import { ReferenceDownload } from "./reference-download";
import { SaveButton } from "./save-button";
import { StoryActions } from "./story-actions";
import "./top.css";

/** "Made for <brand>" pill under the media (source `w_`). */
function BrandPill({ brand }: { brand: Brand }) {
  return (
    <a
      href={brand.link_url || "#"}
      target="_blank"
      rel="noreferrer sponsored"
      className="pill pill-32 inline-flex items-center gap-2 border border-[var(--paper-line)] bg-[var(--card-surface)] font-ui text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
    >
      <Pin className="size-3.5" aria-hidden="true" />
      <span>Made for</span>
      <BrandInk brand={brand} className="brand-ink-pill" />
      <span className="sr-only">{brand.name}</span>
    </a>
  );
}

/**
 * Everything above the prompt panel (source route `Xe`, member view): back link,
 * media card, video references, reel, title, badges, counts and actions.
 */
export function PromptHeader() {
  const { prompt, detail } = usePromptPage();
  const brand = findBrand(prompt.brandId);
  const reelUrl = detail.reelUrl ?? prompt.reelUrl;
  const pipelineInfo = detail.pipelineInfo ?? prompt.pipelineInfo;
  const videoRefs = detail.references.filter((r) => r.type === "video");

  return (
    <>
      <Link
        href="/"
        className="inline-flex items-center gap-2 font-ui text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to gallery
      </Link>

      <PromptMediaCard />

      {videoRefs.length > 0 ? (
        <div className="mx-auto mt-4 flex w-full max-w-2xl flex-col gap-3">
          {videoRefs.map((reference, i) => (
            <ReferenceDownload key={reference.id ?? i} reference={reference} title={prompt.title} index={i} />
          ))}
        </div>
      ) : null}

      {reelUrl && prompt.media.type !== "video" ? <InstagramReel key={reelUrl} url={reelUrl} /> : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        {reelUrl ? (
          <a
            href={reelUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 font-ui text-[0.72rem] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-foreground"
          >
            <InstagramIcon className="size-3.5" /> Watch on Instagram
          </a>
        ) : null}
        {brand ? <BrandPill brand={brand} /> : null}
      </div>

      <h1 className="mt-8 font-ui text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{prompt.title}</h1>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="model-badge model-badge-detail" title={prompt.model}>
          {prompt.model}
        </span>
        {pipelineInfo ? (
          <span className="rounded-full border border-[var(--paper-line)] bg-[var(--card-surface)] px-3 py-1 font-ui text-[0.72rem] text-muted-foreground">
            {pipelineInfo}
          </span>
        ) : null}
        <span className="rounded-full bg-foreground px-3 py-1 font-ui text-[0.72rem] text-[var(--card-surface)]">
          {prompt.category}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="top-engagement-detail">
          <Engagement prompt={prompt} />
        </span>
        {/* The source shows the loaded count here; a steal on this page doesn't bump it. */}
        <StealCount value={prompt.copyCount} ember={false} />
      </div>

      <div className="mt-6">
        <div className="flex flex-wrap items-center gap-3">
          <StoryActions />
          <SaveButton promptId={prompt.id} title={prompt.title} />
        </div>
        <p className="copy-note mt-2 text-muted-foreground">Find an accomplice</p>
      </div>
    </>
  );
}
