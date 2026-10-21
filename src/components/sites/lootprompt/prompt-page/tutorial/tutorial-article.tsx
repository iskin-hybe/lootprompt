"use client";

import { memo, useMemo } from "react";
import type { PromptBlock } from "../../prompt-details";
import { PromptBlockCard } from "../panel/prompt-block-card";
import { splitTutorial, swapGifVideos } from "./tutorial-html";

/**
 * The tutorial article with its prompt blocks embedded where the document placed them
 * (source `Be`). Memoized, and the `__html` objects are stable: React re-applies
 * innerHTML whenever that object changes, which would wipe the plan anchors and the
 * blur-up classes added to the article after mount.
 */
export const TutorialArticle = memo(function TutorialArticle({
  html,
  blocks,
  promptId,
  promptTitle,
}: {
  html: string;
  blocks: PromptBlock[];
  promptId: string;
  promptTitle: string;
}) {
  const parts = useMemo(() => splitTutorial(swapGifVideos(html)), [html]);

  return (
    <div className="mt-4">
      {parts.map((part, index) => {
        if (part.kind === "block") {
          const block = blocks[part.index];
          return block ? (
            <PromptBlockCard
              key={`block-${part.index}`}
              block={block}
              promptId={promptId}
              promptTitle={promptTitle}
              inline
            />
          ) : null;
        }
        return part.markup.__html.trim() === "" ? null : (
          <div key={`html-${index}`} className="tutorial-prose" dangerouslySetInnerHTML={part.markup} />
        );
      })}
    </div>
  );
});
