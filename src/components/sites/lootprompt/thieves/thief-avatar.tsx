import { avatarDataUri, avatarMeta, resolveAvatarStyle } from "./thief-avatars";
import "./thieves.css";

/** A thief's generated avatar; premium styles get a shimmering ring. */
export function ThiefAvatar({
  style,
  seed,
  size,
  className,
}: {
  style: string | null;
  seed: string;
  size: number;
  className?: string;
}) {
  const resolved = resolveAvatarStyle(style, seed);
  const premium = avatarMeta(resolved).tier === "premium";
  return (
    <span
      className={`thief-avatar-pack${premium ? " is-premium" : ""}${className ? ` ${className}` : ""}`}
      style={{ width: size, height: size }}
      data-avatar-tier={premium ? "premium" : "common"}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- generated SVG data URI */}
      <img src={avatarDataUri(resolved)} alt="" width={size} height={size} draggable={false} decoding="async" />
    </span>
  );
}
