"use client";

import { useEffect, useRef } from "react";
import { findBrand } from "../../data";
import { BrandStamp } from "../../gallery/card-parts";
import { aspectRatio } from "../../gallery/lib";
import { usePromptPage } from "../context";
import { setPromptMediaElement } from "./media-anchor";

/**
 * The post on a paper card with its brand stamp. The source shows the post's GIF;
 * here the GIF is an MP4, so it plays muted on a loop over the poster still.
 */
export function PromptMediaCard() {
  const { prompt } = usePromptPage();
  const brand = findBrand(prompt.brandId);
  const videoRef = useRef<HTMLVideoElement>(null);
  const { media } = prompt;
  const motion = media.type === "image" ? media.motion : null;
  const alt = `${prompt.model} AI prompt result — ${prompt.title}`;

  // React doesn't render `muted` into server HTML; set it before asking to play.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    video.play().catch(() => {});
  }, [motion]);

  return (
    <div
      ref={setPromptMediaElement}
      className="paper-shadow relative mx-auto mt-8 w-fit overflow-hidden rounded-[15px] border border-[var(--paper-line)] bg-foreground/5"
    >
      {brand ? <BrandStamp brand={brand} /> : null}
      <div
        style={{ aspectRatio: aspectRatio(prompt.aspect) }}
        className={`shared-media mx-auto max-h-[72vh] w-full ${
          prompt.aspect.orientation === "portrait" ? "max-w-md" : "max-w-2xl"
        }`}
      >
        {motion ? (
          <video
            ref={videoRef}
            src={motion}
            poster={media.poster ?? media.src}
            aria-label={alt}
            autoPlay
            muted
            loop
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- local poster at its natural size, as the source
          <img src={media.src} alt={alt} decoding="async" className="h-full w-full object-contain" />
        )}
      </div>
    </div>
  );
}
