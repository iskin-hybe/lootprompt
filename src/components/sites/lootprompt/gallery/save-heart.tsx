"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { useCollection } from "./stores";
import { showToast } from "./toast";

/** Heart that saves a prompt to "My Collection" (this browser, for guests). */
export function SaveHeart({ promptId, title, className }: { promptId: string; title: string; className?: string }) {
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
      className={`save-heart pill pill-icon shrink-0 ${
        saved ? "text-[var(--accent)]" : "text-muted-foreground hover:text-foreground"
      } ${className ?? ""}`.trim()}
    >
      <Heart
        key={pops}
        className={`size-4 ${saved ? "save-heart-pop" : ""}`.trim()}
        fill={saved ? "currentColor" : "none"}
        aria-hidden="true"
      />
    </button>
  );
}
