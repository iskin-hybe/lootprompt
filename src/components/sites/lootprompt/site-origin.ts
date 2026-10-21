import { SITE_ORIGIN } from "./data";

/**
 * Origin for absolute URLs in the head (canonical, og:url, share cards, JSON-LD), so they
 * name the host serving the clone: `SITE_URL` when set (read at build time, since pages are
 * prerendered), else the Vercel production domain, else lootprompt.com like the source.
 */
export function siteOrigin(): string {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : SITE_ORIGIN);
  return origin.replace(/\/+$/, "");
}
