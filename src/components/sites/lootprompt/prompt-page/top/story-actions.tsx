"use client";

import { Check, ImageDown, Share2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { copyText } from "../../gallery/lib";
import { showToast } from "../../gallery/toast";
import { usePromptPage } from "../context";
import { StoryHint, markStoryHintDone } from "./story-hint";
import type { DeliverResult, StoryPrompt } from "./story/story-card";

interface StoryFile {
  blob: Blob;
  kind: "mp4" | "png";
  slug: string;
}

const READY_TEXT = "Your story is ready — tap Save story";

function storyFileName(file: StoryFile): string {
  return `lootprompt-${file.slug}.${file.kind}`;
}

/** Whether the share sheet can take this file (phones): then saving needs a fresh tap. */
function canShareFile(file: StoryFile): boolean {
  try {
    return !!navigator.canShare?.({
      files: [new File([file.blob], storyFileName(file), { type: file.kind === "mp4" ? "video/mp4" : "image/png" })],
    });
  } catch {
    return false;
  }
}

async function deliverStoryFile(file: StoryFile): Promise<DeliverResult> {
  if (file.kind === "mp4") {
    const { deliverStoryVideo } = await import("./story/story-video");
    return deliverStoryVideo(file.blob, file.slug);
  }
  const { deliverStory } = await import("./story/story-card");
  return deliverStory(file.blob, file.slug);
}

async function renderPng(story: StoryPrompt): Promise<Blob> {
  const { renderStoryPng } = await import("./story/story-card");
  return renderStoryPng(story);
}

/** Share (copy link) and "Save as story" with its hint (source `Le`). */
export function StoryActions() {
  const { prompt, stealCount } = usePromptPage();
  const [linkCopied, setLinkCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState<number | null>(null);
  const [hintOpen, setHintOpen] = useState(false);
  const [ready, setReady] = useState<StoryFile | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);

  const motionUrl = prompt.media.type === "image" ? prompt.media.motion : null;
  const story = useMemo<StoryPrompt>(
    () => ({
      id: prompt.id,
      title: prompt.title,
      model: prompt.model,
      prompt: prompt.prompt,
      copyCount: stealCount,
      posterUrl: prompt.media.poster ?? (prompt.media.type === "image" ? prompt.media.src : null),
    }),
    [prompt, stealCount],
  );

  useEffect(() => () => abortRef.current?.abort(), []);

  const offerSave = useCallback((file: StoryFile) => {
    setReady(file);
    setAnnouncement(READY_TEXT);
    showToast(READY_TEXT);
  }, []);

  const deliver = useCallback(
    async (file: StoryFile) => {
      if (canShareFile(file)) {
        offerSave(file);
        return;
      }
      if ((await deliverStoryFile(file)) === "needs-gesture") offerSave(file);
      markStoryHintDone();
    },
    [offerSave],
  );

  const saveReady = useCallback(async () => {
    if (!ready) return;
    const result = await deliverStoryFile(ready);
    markStoryHintDone();
    if (result === "needs-gesture") setAnnouncement(READY_TEXT);
  }, [ready]);

  const make = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setHintOpen(false);
    setReady(null);
    setAnnouncement("");
    try {
      const media = motionUrl ? { videoUrl: motionUrl } : story.posterUrl ? { imageUrl: story.posterUrl } : null;
      if (media) {
        const controller = new AbortController();
        abortRef.current = controller;
        try {
          const video = await import("./story/story-video");
          if (!(await video.storyVideoSupported())) throw new Error("unsupported");
          setPercent(0);
          const blob = await video.renderStoryVideo(
            { ...story, ...media },
            (p) => setPercent(Math.round(p * 100)),
            controller.signal,
          );
          if (controller.signal.aborted) return;
          await deliver({ blob, kind: "mp4", slug: prompt.id });
          return;
        } catch {
          if (controller.signal.aborted) return;
          setPercent(null);
          await deliver({ blob: await renderPng(story), kind: "png", slug: prompt.id });
          showToast("Saved as an image instead");
          return;
        }
      }
      await deliver({ blob: await renderPng(story), kind: "png", slug: prompt.id });
    } catch {
      // nothing to save; the button simply resets
    } finally {
      busyRef.current = false;
      setBusy(false);
      setPercent(null);
    }
  }, [deliver, motionUrl, prompt.id, story]);

  const share = async () => {
    try {
      await copyText(`${window.location.origin}/prompt/${prompt.id}`);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 1800);
      showToast("Link copied");
    } catch {
      showToast("Could not copy link");
    }
  };

  const showReady = ready !== null && !busy;
  const label = percent === null ? (busy ? "Preparing…" : "Save as story") : `Rendering story… ${percent}%`;

  return (
    <>
      <button
        type="button"
        onClick={() => void share()}
        aria-label="Share prompt link"
        className="pill pill-md border border-[var(--paper-line)] font-ui text-xs text-muted-foreground hover:text-foreground"
      >
        {linkCopied ? (
          <Check className="size-[18px] text-[var(--accent)]" aria-hidden="true" />
        ) : (
          <Share2 className="size-[18px]" aria-hidden="true" />
        )}
        {linkCopied ? "Copied" : "Share"}
      </button>
      <span className="story-hint-anchor">
        {showReady ? (
          <button
            ref={buttonRef}
            type="button"
            onClick={() => void saveReady()}
            className="pill pill-md border border-[var(--ink)] bg-[var(--ink)] font-ui text-xs text-[var(--paper)] story-ready-pulse"
          >
            <ImageDown className="size-[18px]" aria-hidden="true" />
            Save story
          </button>
        ) : (
          <button
            ref={buttonRef}
            type="button"
            onClick={() => void make()}
            disabled={busy}
            aria-busy={busy}
            className={[
              "pill pill-md border border-[var(--paper-line)] font-ui text-xs text-muted-foreground hover:text-foreground disabled:opacity-70",
              hintOpen ? "story-hint-pulse" : "",
            ]
              .join(" ")
              .trim()}
          >
            <ImageDown className="size-[18px]" aria-hidden="true" />
            {label}
          </button>
        )}
        {showReady ? (
          <button
            type="button"
            onClick={() => void make()}
            className="story-ready-remake font-ui text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Make a new one
          </button>
        ) : null}
        <span className="sr-only" aria-live="polite">
          {announcement}
        </span>
        <StoryHint
          targetRef={buttonRef}
          open={hintOpen}
          setOpen={setHintOpen}
          onMake={() => void make()}
          story={story}
          motionUrl={motionUrl}
        />
      </span>
    </>
  );
}
