"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useState } from "react";
import { Engagement } from "../../gallery/card-parts";
import { usePromptPage } from "../context";
import { usePromptMediaElement } from "./media-anchor";

/** Hairline at the top of the viewport that fills as you read (source `Ue`). */
function ReadProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable <= 0 ? 0 : Math.min(1, Math.max(0, window.scrollY / scrollable)));
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <div className="read-progress" aria-hidden="true">
      <span className="read-progress-ink" style={{ transform: `scaleX(${progress})` }} />
    </div>
  );
}

/** Sticky bar with the prompt and a steal button once the media scrolls away (source `We`). */
function MiniBar() {
  const { prompt, steal, copied } = usePromptPage();
  const media = usePromptMediaElement();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (!media || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setShown(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );
    observer.observe(media);
    return () => observer.disconnect();
  }, [media]);

  const thumb = prompt.media.poster ?? prompt.media.src;

  return (
    <div className={`mini-bar${shown ? " is-shown" : ""}`} aria-hidden={!shown}>
      <div className="mini-bar-inner">
        <span className="mini-bar-thumb">
          {prompt.media.type === "video" && !prompt.media.poster ? null : (
            // eslint-disable-next-line @next/next/no-img-element -- local poster, same file the card uses
            <img src={thumb} alt="" loading="lazy" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="mini-bar-title">{prompt.title}</span>
          <span className="mini-bar-stats">
            <Engagement prompt={prompt} />
          </span>
        </span>
        <button
          type="button"
          onClick={() => void steal()}
          tabIndex={shown ? 0 : -1}
          className="mini-bar-steal"
          title="Press C to steal"
        >
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          <span className="mini-bar-steal-label">{copied ? "Stolen" : "Steal"}</span>
        </button>
      </div>
    </div>
  );
}

/** Reading progress + the sticky mini-bar, fixed above the page. */
export function PromptReadingChrome() {
  return (
    <>
      <ReadProgress />
      <MiniBar />
    </>
  );
}
