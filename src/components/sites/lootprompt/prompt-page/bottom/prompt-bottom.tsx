"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useHydrated } from "../../chrome/use-hydrated";
import { InkPad } from "../../footer/ink-pad";
import { LazyMount } from "../../shared/lazy-mount";
import { usePromptPage } from "../context";
import { NewsletterBox } from "./newsletter-box";
import { ResultsWall } from "./results-wall";
import { SimilarHeists } from "./similar-heists";

/**
 * Everything in the source route `Xe` after the Tutorial section, member view:
 * newsletter fold-out, "Made with this" results, the fingerprint ink pad,
 * "Similar heists" and the closing back link. The guest-only "More heists in the
 * vault" row is left out. Like the source, the sections render after mount.
 */
export function PromptBottom() {
  const { prompt } = usePromptPage();
  const mounted = useHydrated();

  return (
    <>
      {mounted ? (
        <LazyMount minHeight={220}>
          <NewsletterBox />
        </LazyMount>
      ) : null}
      {mounted ? (
        <LazyMount minHeight={200}>
          <ResultsWall promptId={prompt.id} />
        </LazyMount>
      ) : null}
      {mounted ? <InkPad promptId={prompt.id} /> : null}
      {mounted ? (
        <LazyMount minHeight={320}>
          <SimilarHeists prompt={prompt} />
        </LazyMount>
      ) : null}
      <div className="mt-16 border-t border-[var(--paper-line)] pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-ui text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Back to gallery
        </Link>
      </div>
    </>
  );
}
