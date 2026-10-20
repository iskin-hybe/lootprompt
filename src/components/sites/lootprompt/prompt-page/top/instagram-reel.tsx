"use client";

import { useEffect } from "react";

const EMBED_SCRIPT = "https://www.instagram.com/embed.js";

interface InstagramGlobal {
  Embeds?: { process?: () => void };
}

function processEmbeds(): void {
  (window as unknown as { instgrm?: InstagramGlobal }).instgrm?.Embeds?.process?.();
}

/** Instagram's own embed of the post's reel (source `Ve`); stays external. */
export function InstagramReel({ url }: { url: string }) {
  useEffect(() => {
    if (document.querySelector(`script[src="${EMBED_SCRIPT}"]`)) {
      processEmbeds();
      return;
    }
    const script = document.createElement("script");
    script.src = EMBED_SCRIPT;
    script.async = true;
    script.onload = processEmbeds;
    document.body.appendChild(script);
  }, [url]);

  return (
    <div className="mx-auto mt-8 w-full max-w-md overflow-hidden rounded-[15px] border border-[var(--paper-line)] bg-[var(--card-surface)]">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={url}
        data-instgrm-version="14"
        style={{ margin: 0, width: "100%", minWidth: 0 }}
      >
        <a href={url} target="_blank" rel="noreferrer">
          Watch this reel on Instagram
        </a>
      </blockquote>
    </div>
  );
}
