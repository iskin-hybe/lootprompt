import Link from "next/link";
import type { Prompt } from "../../data";
import { aspectRatio } from "../../gallery/lib";
import { localPromptHref } from "../../shared/member-view";
import { cardImage, similarHeists } from "./related";

/** "Similar heists": up to four neighbouring prompts (source prompt route `qe`). */
export function SimilarHeists({ prompt }: { prompt: Prompt }) {
  const picks = similarHeists(prompt);
  if (picks.length === 0) return null;
  return (
    <section className="mt-16" aria-label="Similar heists">
      <p className="font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Similar heists</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        {picks.map((p) => (
          <Link
            key={p.id}
            href={localPromptHref(p.id)}
            className="rel-card cine-card group block overflow-hidden rounded-[15px] border border-[var(--paper-line)] bg-[var(--card-surface)]"
          >
            <span
              style={{ aspectRatio: aspectRatio(p.aspect) }}
              className="cine-glare relative block w-full overflow-hidden bg-foreground/5"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- plain lazy poster, as on the source */}
              <img src={cardImage(p)} alt={p.title} loading="lazy" className="cine-media h-full w-full object-cover" />
              <span aria-hidden="true" className="cine-glare-layer" />
            </span>
            <span className="block px-3 py-2.5">
              <span className="rel-card-title font-ui text-[0.78rem] leading-snug text-foreground">{p.title}</span>
              <span className="mt-1 block font-ui text-[0.62rem] uppercase tracking-[0.12em] text-muted-foreground">
                {p.category}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
