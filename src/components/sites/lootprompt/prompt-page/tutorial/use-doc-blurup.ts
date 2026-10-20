"use client";

import { useEffect, type RefObject } from "react";

/**
 * Article images (and the MP4s standing in for its GIFs) start blurred and sharpen once
 * loaded: `.doc-blurup` / `.is-loaded` (effect in source route `Xe`).
 */
export function useDocBlurup(containerRef: RefObject<HTMLElement | null>, html: string): void {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const cleanups: (() => void)[] = [];

    for (const media of container.querySelectorAll<HTMLImageElement | HTMLVideoElement>("img, video.doc-gif")) {
      media.classList.add("doc-blurup");
      const loaded =
        media instanceof HTMLImageElement
          ? media.complete && media.naturalWidth > 0
          : media.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA || media.error !== null;
      if (media instanceof HTMLImageElement) {
        media.loading = "lazy";
        media.decoding = "async";
      }
      if (loaded) {
        media.classList.add("is-loaded");
        continue;
      }
      const markLoaded = () => media.classList.add("is-loaded");
      const loadEvent = media instanceof HTMLImageElement ? "load" : "loadeddata";
      media.addEventListener(loadEvent, markLoaded);
      media.addEventListener("error", markLoaded);
      cleanups.push(() => {
        media.removeEventListener(loadEvent, markLoaded);
        media.removeEventListener("error", markLoaded);
      });
    }

    return () => cleanups.forEach((cleanup) => cleanup());
  }, [containerRef, html]);
}
