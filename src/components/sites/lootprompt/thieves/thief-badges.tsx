import {
  Award,
  Boxes,
  CalendarCheck,
  Coins,
  Flame,
  Footprints,
  Handshake,
  Heart,
  HeartHandshake,
  KeyRound,
  Layers,
  MessageCircle,
  Moon,
  MoonStar,
  Siren,
  Sparkles,
  Star,
  Users,
  Vault,
  type LucideIcon,
} from "lucide-react";
import type { Thief, ThiefBadge } from "../data";

const BADGE_ICONS: Record<string, LucideIcon> = {
  first_steal: Footprints,
  steals_25: Layers,
  steals_100: Award,
  night_job: Moon,
  models_10: Boxes,
  all_categories: Sparkles,
  purse_5: Coins,
  alarm_steal: Siren,
  saves_10: Heart,
  collections_3: Vault,
  streak_7: Flame,
  vault_7: KeyRound,
  apprentice_1: Users,
  apprentice_5: CalendarCheck,
  first_contact: Handshake,
  social_bandit: MessageCircle,
  beloved_thief: HeartHandshake,
  night_whisperer: MoonStar,
  master_of_vault: Star,
};

/** Keep known badges only, tiers clamped to 1–3, at most `limit`. */
export function normalizeBadges(badges: ThiefBadge[], limit = 3): ThiefBadge[] {
  return badges
    .filter((badge) => Object.prototype.hasOwnProperty.call(BADGE_ICONS, badge.key))
    .map((badge) => ({ key: badge.key, tier: Math.min(3, Math.max(1, Number(badge.tier ?? 1))) }))
    .slice(0, limit);
}

export function BadgeIcon({ badge, size = 22 }: { badge: string; size?: number }) {
  const Icon = BADGE_ICONS[badge] ?? Award;
  return <Icon size={size} strokeWidth={1.3} aria-hidden="true" />;
}

/** Up to three badge chips plus a "+N" overflow count. */
export function ThiefBadges({ thief }: { thief: Thief }) {
  return (
    <span className="thief-badges">
      {normalizeBadges(thief.top_badges).map((badge) => (
        <span key={badge.key} className="thief-badge" data-tier={badge.tier} title={badge.key.replaceAll("_", " ")}>
          <BadgeIcon badge={badge.key} size={13} />
        </span>
      ))}
      {thief.badge_count > 3 ? <span className="thief-badge-more">+{thief.badge_count - 3}</span> : null}
    </span>
  );
}
