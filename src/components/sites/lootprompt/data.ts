// Snapshot of lootprompt.com's public data, captured from its Supabase API on
// 2026-10-17. Media paths point at local copies under /public/sites/lootprompt.
import heistReportJson from "./data/heist-report.json";
import homeAggregatesJson from "./data/home-aggregates.json";
import jobBoardJson from "./data/job-board.json";
import promptsJson from "./data/prompts.json";
import thievesJson from "./data/thieves.json";

/** The moment the snapshot was taken; use it as "now" for data-relative copy. */
export const SNAPSHOT_AT = "2026-10-17T20:01:24.652Z";

export const SITE_ORIGIN = "https://lootprompt.com";
export const INSTAGRAM_URL = "https://www.instagram.com/deniz.akkabak/";
export const INSTAGRAM_HANDLE = "@deniz.akkabak";

export type Category = "Video" | "Photo" | "Video + Photo" | "Audio";
export type Orientation = "landscape" | "portrait" | "square";

export interface PromptReference {
  id: string;
  type: "image" | "video";
  /** Local 144px thumbnail for images; source URL for video references. */
  src: string;
  label: string;
}

export interface Prompt {
  id: string;
  title: string;
  category: Category;
  model: string;
  pipelineInfo: string | null;
  media: {
    type: "image" | "video";
    /** Still shown at rest (720px poster). */
    src: string;
    poster: string | null;
    /** MP4 conversion of the source GIF, played on hover / when featured. */
    motion: string | null;
    width: number | null;
    height: number | null;
  };
  aspect: {
    width: number | null;
    height: number | null;
    ratio: number;
    orientation: Orientation;
  };
  /** Final prompt block (what the card previews and copies). */
  prompt: string;
  blockCount: number;
  references: PromptReference[];
  createdAt: string;
  copyCount: number;
  reelUrl: string | null;
  brandId: string | null;
  igLikes: number | null;
  hasStoredReel: boolean;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  link_url: string;
  logo_url: string;
}

export interface PromoSlot {
  id: string;
  enabled: boolean;
  link_url: string;
  hand_text: string;
  brand_slug: string;
  grotesk_text: string;
}

export interface HomeAggregates {
  alarm: unknown;
  likes: Record<string, number>;
  views: Record<string, number>;
  stats: { stolen: number; visits: number; prompts: number; thieves: number };
  brands: Brand[];
  trending: string[];
  cached_at: string;
  daily_pick: string;
  promo_slots: PromoSlot[];
  rank_config: Record<string, number>;
  vault_status: unknown;
  daily_history: { day: string; prompt_id: string }[];
  recently_stolen: string[];
}

export interface ThiefBadge {
  key: string;
  tier: number;
}

export interface Thief {
  place: number;
  username: string;
  display_name: string;
  avatar_seed: string;
  avatar_style: string | null;
  steals: number;
  night_steals: number;
  top_badges: ThiefBadge[];
  badge_count: number;
}

export type ThiefPeriod = "month" | "all";

export interface HeistReport {
  heat: number[][];
  daily: { day: string; steals: number; visits: number; new_thieves: number }[];
  radio: { at: string; id: string; title: string }[];
  today: string;
  hot_loot: { n: number; id: string; title: string }[];
  last_hour: number;
  night_pct: number;
  steals_7d: number;
  categories: { n: number; category: string }[];
  record_day: { n: number; day: string };
  most_wanted: Thief;
  generated_at: string;
  last_steal_at: string;
  visitors_today: number;
  member_steals_7d: number;
}

export interface JobBoardTeaser {
  done: number;
  goal: number;
  open: number;
  works: number;
  titles: string[];
  in_works: unknown;
  top_open: { id: string; model: string; title: string; votes: number }[];
  recent_done: unknown[];
}

export const prompts = promptsJson as Prompt[];
export const homeAggregates = homeAggregatesJson as HomeAggregates;
export const heistReport = heistReportJson as unknown as HeistReport;
export const jobBoard = jobBoardJson as JobBoardTeaser;

const thieves = thievesJson as Record<string, Thief[]>;

/** Leaderboard rows for a period; limit 3 is the podium, 50 the whole crew. */
export function thievesBoard(period: ThiefPeriod, limit: 3 | 50): Thief[] {
  return thieves[`${period}-${limit}`] ?? [];
}

export function findBrand(id: string | null): Brand | null {
  return homeAggregates.brands.find((b) => b.id === id) ?? null;
}

/** Top 10% by steals (max 5), and only prompts stolen at least 10 times. */
export function legendaryIds(list: Prompt[] = prompts): Set<string> {
  const count = Math.min(5, Math.max(1, Math.ceil(list.length * 0.1)));
  return new Set(
    list
      .slice()
      .sort((a, b) => b.copyCount - a.copyCount || a.id.localeCompare(b.id))
      .slice(0, count)
      .filter((p) => p.copyCount >= 10)
      .map((p) => p.id),
  );
}

/** Case numbers count prompts in publish order, oldest first. */
export function caseNumbers(list: Prompt[] = prompts): Map<string, number> {
  return new Map(
    list
      .slice()
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((p, i) => [p.id, i + 1]),
  );
}
