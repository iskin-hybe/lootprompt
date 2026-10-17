import { thiefAvatarUri } from "../thieves/thief-avatars";

/** Avatar styles in the source's catalogue order (thief-avatars chunk `Object.keys`). */
export const AVATAR_STYLE_ORDER = [
  "classic_robber",
  "cat_burglar",
  "safecracker",
  "gentleman_thief",
  "pickpocket",
  "ninja",
  "getaway_driver",
  "hacker",
  "pirate",
  "mime",
  "outlaw",
  "art_forger",
  "jewel_thief",
  "heist_clown",
  "masquerade",
  "golden_phantom",
  "neon_ghost",
  "diamond_duke",
  "shadow_king",
  "holo_legend",
] as const;

const PREMIUM_STYLES = new Set<string>([
  "golden_phantom",
  "neon_ghost",
  "diamond_duke",
  "shadow_king",
  "holo_legend",
]);

/** Round thief avatar with a shimmering ring for premium styles (source `Ah`). */
export function ThiefAvatarPack({
  seed,
  style,
  size,
}: {
  seed: string;
  style: string;
  size: number;
}) {
  const premium = PREMIUM_STYLES.has(style);
  return (
    <span
      className={`thief-avatar-pack${premium ? " is-premium" : ""}`}
      style={{ width: size, height: size }}
      data-avatar-tier={premium ? "premium" : "common"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URI */}
      <img
        src={thiefAvatarUri(seed, style)}
        alt=""
        width={size}
        height={size}
        draggable={false}
        decoding="async"
      />
    </span>
  );
}
