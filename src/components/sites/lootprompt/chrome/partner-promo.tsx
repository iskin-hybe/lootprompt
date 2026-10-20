"use client";

import { ArrowUpRight, X } from "lucide-react";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { homeAggregates } from "../data";
import { prefersReducedMotion, readStorage, useHydrated, writeStorage } from "./use-hydrated";

const SLOT_ID = "partner_tag";
const DISMISSED_KEY = `promo-tag-dismissed:${SLOT_ID}`;
const SWUNG_KEY = `promo-tag-swung:${SLOT_ID}`;
/** Below this width the tag becomes a banner under the header. */
const BANNER_QUERY = "(max-width: 1099px)";

function safeLink(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/** The tag swings for attention once per session (source `__`). */
function claimAttentionSwing(): boolean {
  if (readStorage("session", SWUNG_KEY) === "1") return false;
  writeStorage("session", SWUNG_KEY, "1");
  return readStorage("session", SWUNG_KEY) === "1";
}

/**
 * Sponsored invideo tag hanging from a string at top-left; a dismissible banner
 * under the header on narrower screens (source `O_`).
 */
export function PartnerPromo() {
  const hydrated = useHydrated();
  const [dismissedNow, setDismissedNow] = useState(false);
  const [attention, setAttention] = useState(false);

  const slot = homeAggregates.promo_slots.find((s) => s.id === SLOT_ID) ?? null;
  const brand = homeAggregates.brands.find((b) => b.slug === slot?.brand_slug) ?? null;
  const href = useMemo(() => safeLink(slot?.link_url ?? ""), [slot?.link_url]);
  const dismissed = dismissedNow || (hydrated && readStorage("session", DISMISSED_KEY) === "1");
  const enabled = Boolean(slot?.enabled);

  useEffect(() => {
    if (!enabled || dismissed || prefersReducedMotion()) return;
    if (window.matchMedia(BANNER_QUERY).matches) return;
    let settle = 0;
    const timer = window.setTimeout(() => {
      if (!claimAttentionSwing()) return;
      setAttention(true);
      settle = window.setTimeout(() => setAttention(false), 1200);
    }, 3000);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(settle);
    };
  }, [enabled, dismissed]);

  if (!slot || !enabled || !href || dismissed) return null;

  const brandName = brand?.name ?? "invideo";

  return (
    <div className={`partner-promo ${attention ? "is-attention" : ""}`}>
      <span className="partner-promo-string" aria-hidden="true" />
      <a
        className="partner-promo-tag"
        href={href}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`Try every prompt on ${brandName}`}
      >
        <span className="partner-promo-hole" aria-hidden="true" />
        <span className="partner-promo-content">
          {brand?.logo_url ? (
            <span
              aria-hidden="true"
              className="brand-ink brand-ink-chip partner-promo-logo"
              style={{ "--brand-logo": `url("${brand.logo_url}")` } as CSSProperties}
            />
          ) : (
            <span className="partner-promo-wordmark">invideo</span>
          )}
          <span className="partner-promo-rule" aria-hidden="true" />
          <span className="partner-promo-copy">
            <span className="partner-promo-hand">{slot.hand_text || "Try every prompt"}</span>
            <span className="partner-promo-grotesk">{slot.grotesk_text || "on invideo"}</span>
          </span>
          <ArrowUpRight className="partner-promo-arrow" aria-hidden="true" />
        </span>
      </a>
      <button
        type="button"
        className="partner-promo-dismiss"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          writeStorage("session", DISMISSED_KEY, "1");
          setDismissedNow(true);
        }}
        aria-label="Dismiss partner tag"
      >
        <X size={13} aria-hidden="true" />
      </button>
    </div>
  );
}
