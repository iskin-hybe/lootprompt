"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { useCollection } from "../../gallery/stores";
import { showToast } from "../../gallery/toast";

/**
 * The labelled "Save" pill of the actions row (source save heart `Ye` with
 * `showLabel`); same collection store and toasts as the gallery's SaveHeart.
 */
export function SaveButton({ promptId, title }: { promptId: string; title: string }) {
  const { has, toggle, hydrated } = useCollection();
  const [pops, setPops] = useState(0);
  const saved = hydrated && has(promptId);

  return (
    <button
      type="button"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${title} from your vault` : `Save ${title} to your vault`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setPops((n) => n + 1);
        const nowSaved = toggle(promptId);
        showToast(nowSaved ? "Saved in this browser" : "Removed from your vault");
      }}
      className={[
        "save-heart pill pill-md shrink-0",
        saved ? "text-[var(--accent)]" : "text-muted-foreground hover:text-foreground",
        "border border-[var(--paper-line)] font-ui text-xs [&_svg]:size-[18px]",
      ].join(" ")}
    >
      <Heart
        key={pops}
        className={saved ? "size-4 save-heart-pop" : "size-4"}
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
      <span className="font-ui text-xs">{saved ? "Saved" : "Save"}</span>
    </button>
  );
}
