import Link from "next/link";
import { homeAggregates, prompts, type Category } from "../data";
import { InstagramIconLink } from "../instagram/instagram-glyph";
import { LazyMount } from "../shared/lazy-mount";
import { localPromptHref } from "../shared/member-view";
import { InkPad } from "./ink-pad";
import { InstallAppButton } from "./install-app-button";
import { VaultFooterLink } from "./vault-footer-link";

const CATEGORY_LINKS: { value: Category; label: string }[] = [
  { value: "Video", label: "Video prompts" },
  { value: "Photo", label: "Photo prompts" },
  { value: "Video + Photo", label: "Video + Photo prompts" },
  { value: "Audio", label: "Audio prompts" },
];

const VAULT_HREF = "/vault-3d";

// Same-origin routes, as in the source. Only "The Vault" has a local stand-in (its guest gate).
const EXPLORE_LINKS: { href: string; label: string }[] = [
  { href: "/about", label: "About LootPrompt" },
  { href: VAULT_HREF, label: "The Vault" },
  { href: "/most-wanted", label: "Most Wanted" },
  { href: "/jobs", label: "The Job Board" },
  { href: "/olay-yeri", label: "Crime Scene" },
];

const HEADING = "font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground";
const LIST = "mt-4 space-y-2 font-ui text-sm";
const LINK = "text-muted-foreground transition-colors hover:text-foreground";

const mostStolen = prompts
  .slice()
  .sort((a, b) => b.copyCount - a.copyCount)
  .slice(0, 5);

/** This week's vault whisper (the code hint), when the vault has one. */
function VaultWhisper() {
  const status = homeAggregates.vault_status as { prompt_id?: string; whisper?: string } | null;
  const whisper = status?.prompt_id ? status.whisper?.trim() : "";
  if (!whisper) return null;
  return (
    <p
      className="vault-whisper hand-headline mt-4 text-[0.9rem] text-muted-foreground"
      title="This week's vault code"
    >
      {whisper}
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--paper-line)]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <p className="hand-headline text-3xl sm:text-4xl">Deniz Akkabak</p>
          <p className="mt-2 max-w-xs font-ui text-[0.7rem] text-muted-foreground">
            © {new Date().getFullYear()} Deniz Akkabak — stealing encouraged.
          </p>
        </div>

        <nav aria-label="Browse by category">
          <p className={HEADING}>Categories</p>
          <ul className={LIST}>
            {CATEGORY_LINKS.map((category) => (
              <li key={category.value}>
                <Link href={{ pathname: "/", query: { category: category.value } }} className={LINK}>
                  {category.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Top prompts and site pages">
          <p className={HEADING}>Most stolen</p>
          <ul className={LIST}>
            {mostStolen.map((prompt) => (
              <li key={prompt.id}>
                <Link href={localPromptHref(prompt.id)} prefetch={false} className={`block truncate ${LINK}`}>
                  {prompt.title}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Explore">
          <p className={HEADING}>Explore</p>
          <ul className={LIST}>
            {EXPLORE_LINKS.map((link) => (
              <li key={link.href}>
                {link.href === VAULT_HREF ? (
                  <VaultFooterLink href={link.href} label={link.label} className={LINK} />
                ) : (
                  <a href={link.href} className={LINK}>
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-3 px-5 pb-14 text-center sm:px-6">
        <LazyMount minHeight={48}>
          <InkPad promptId={null} compact />
          <InstagramIconLink />
        </LazyMount>
        <VaultWhisper />
        <InstallAppButton />
      </div>
    </footer>
  );
}
