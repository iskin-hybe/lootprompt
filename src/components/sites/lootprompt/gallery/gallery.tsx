"use client";

// Filter bar, pills, guest strips and the prompt grid (source: `In()` in the routes chunk,
// from the sticky filter bar down to the gallery section).
import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { flushSync } from "react-dom";
import { caseNumbers, homeAggregates, legendaryIds, prompts, type Prompt } from "../data";
import { InkRule } from "../shared/ink-rule";
import { Reveal } from "../shared/reveal";
import { BrandChip, useMounted } from "./card-parts";
import { CrewPromo, GuestNote } from "./crew-promo";
import { dealGrid, scrollLean } from "./grid-effects";
import { KeyboardNav } from "./kbd-nav";
import { CATEGORIES, EASE_OUT_EXPO, ORIENTATION_LABELS, isEditableTarget, prefersReducedMotion, type CategoryTab } from "./lib";
import { MasonryGrid, type MasonryItem } from "./masonry";
import { FinePointerProvider, PromptCard } from "./prompt-card";
import { useStolenIds } from "./stores";
import { SurpriseButton, SurpriseMark } from "./surprise";
import { ToastHost } from "./toast";
import "./gallery.css";

type SortId = "recent" | "copied";
type OrientationFilter = "landscape" | "portrait";

const SORTS: { id: SortId; label: string }[] = [
  { id: "recent", label: "Newest" },
  { id: "copied", label: "Most stolen" },
];

const pillClass = (active: boolean) =>
  `pill pill-sm border font-ui text-[0.7rem] ${
    active
      ? "border-foreground bg-foreground text-[var(--card-surface)]"
      : "border-[var(--paper-line)] text-muted-foreground hover:text-foreground"
  }`;

/** Applies `?category=` from the URL (kept in Suspense so the page stays prerendered). */
function CategoryFromUrl({ onCategory }: { onCategory: (c: CategoryTab) => void }) {
  const value = useSearchParams().get("category");
  useEffect(() => {
    const match = CATEGORIES.find((c) => c === value);
    if (match) onCategory(match);
  }, [value, onCategory]);
  return null;
}

/** Hand-inked underline that slides under the active category tab. */
function TabInk({ style }: { style: CSSProperties }) {
  return (
    <svg
      viewBox="0 0 100 8"
      fill="none"
      aria-hidden="true"
      className="ink-draw pointer-events-none absolute bottom-0 left-0 text-foreground"
      style={style}
      preserveAspectRatio="none"
    >
      <path d="M2 5.4C18 2.6 44 1.8 68 2.6C80 3 90 3.8 98 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function filterPrompts(
  list: Prompt[],
  opts: {
    category: CategoryTab;
    query: string;
    brandId: string | null;
    notStolen: boolean;
    stolenIds: Set<string>;
    orientation: OrientationFilter | null;
    sort: SortId;
  },
): Prompt[] {
  const q = opts.query.trim().toLowerCase();
  const out = list.filter((p) => {
    const inCategory = opts.category === "All" || p.category === opts.category;
    const inBrand = opts.brandId === null || p.brandId === opts.brandId;
    const fresh = !opts.notStolen || !opts.stolenIds.has(p.id);
    const shaped =
      opts.orientation === null ||
      (opts.orientation === "landscape"
        ? p.aspect.orientation !== "portrait"
        : p.aspect.orientation === opts.orientation);
    const matches = q === "" || p.title.toLowerCase().includes(q) || p.prompt.toLowerCase().includes(q);
    return inCategory && matches && inBrand && fresh && shaped;
  });
  return opts.sort === "copied" ? out.slice().sort((a, b) => b.copyCount - a.copyCount) : out;
}

/** The grid's direct children's first child (the Reveal wrapper) — what the flip animates. */
function flipTargets(grid: HTMLElement | null): Element[] {
  if (!grid) return [];
  return Array.from(grid.querySelectorAll(":scope > div"))
    .map((cell) => cell.firstElementChild)
    .filter((el): el is Element => !!el);
}

export function Gallery() {
  const mounted = useMounted();
  const [category, setCategory] = useState<CategoryTab>("All");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortId>("recent");
  const [brandId, setBrandId] = useState<string | null>(null);
  const [notStolen, setNotStolen] = useState(false);
  const [orientation, setOrientation] = useState<OrientationFilter | null>(null);
  const [ink, setInk] = useState({ left: 0, width: 0 });
  const searchRef = useRef<HTMLInputElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const stolen = useStolenIds();

  const legendary = useMemo(() => legendaryIds(prompts), []);
  const cases = useMemo(() => caseNumbers(prompts), []);
  // The source fetches trending ids after hydration.
  const trending = mounted ? homeAggregates.trending : [];
  const brands = homeAggregates.brands;

  const filtered = useMemo(
    () =>
      filterPrompts(prompts, {
        category,
        query,
        brandId,
        notStolen,
        stolenIds: stolen.ids,
        orientation,
        sort,
      }),
    [category, query, brandId, notStolen, stolen.ids, orientation, sort],
  );

  // Surprise me: a shuffled order with the pick first, plus its ink circle.
  const [shuffle, setShuffle] = useState<string[] | null>(null);
  const [pick, setPick] = useState<{ id: string; lootedAll: boolean } | null>(null);
  const [showTag, setShowTag] = useState(false);

  // Any filter change drops the surprise order.
  const filterKey = JSON.stringify([category, query, sort, brandId, notStolen, orientation]);
  const [lastFilterKey, setLastFilterKey] = useState(filterKey);
  if (lastFilterKey !== filterKey) {
    setLastFilterKey(filterKey);
    setShuffle(null);
    setPick(null);
    setShowTag(false);
  }

  const ordered = useMemo(() => {
    if (!shuffle) return filtered;
    const rank = new Map(shuffle.map((id, i) => [id, i]));
    const last = Number.MAX_SAFE_INTEGER;
    return filtered.slice().sort((a, b) => (rank.get(a.id) ?? last) - (rank.get(b.id) ?? last));
  }, [filtered, shuffle]);

  // "/" focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/") return;
      const target = e.target as HTMLElement | null;
      if (target && /input|textarea/i.test(target.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Slide the ink underline under the active tab.
  useEffect(() => {
    const measure = () => {
      const row = tabsRef.current;
      const tab = row?.querySelector(`[data-tab="${CSS.escape(category)}"]`);
      if (!row || !tab) return;
      const a = row.getBoundingClientRect();
      const b = tab.getBoundingClientRect();
      setInk({ left: b.left - a.left + row.scrollLeft, width: b.width });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [category]);

  // Deal/develop the cards and lean them with scroll.
  const count = ordered.length;
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || !count) return;
    const stopDeal = dealGrid(grid);
    const stopLean = scrollLean(grid);
    return () => {
      stopDeal();
      stopLean();
    };
  }, [count]);

  const surprise = useCallback(() => {
    if (filtered.length === 0) return;
    const unseen = filtered.filter((p) => !stolen.ids.has(p.id));
    const lootedAll = unseen.length === 0;
    const pool = lootedAll ? filtered : unseen;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (!chosen) return;
    const rest = filtered.filter((p) => p.id !== chosen.id).map((p) => p.id);
    for (let i = rest.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    const order = [chosen.id, ...rest];
    const apply = () => {
      setShuffle(order);
      setPick({ id: chosen.id, lootedAll });
      setShowTag(true);
    };
    const cards = flipTargets(gridRef.current);
    if (prefersReducedMotion() || cards.length === 0) {
      apply();
      return;
    }
    cards.forEach((el, i) => {
      el.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(90deg)" }], {
        duration: 260,
        delay: Math.min(i, 10) * 25,
        easing: "ease-in",
        fill: "forwards",
      });
    });
    window.setTimeout(() => {
      flushSync(apply);
      requestAnimationFrame(() => {
        flipTargets(gridRef.current).forEach((el, i) => {
          el.getAnimations().forEach((a) => a.cancel());
          el.animate([{ transform: "rotateY(-90deg)" }, { transform: "rotateY(0deg)" }], {
            duration: 260,
            delay: Math.min(i, 10) * 25,
            easing: "ease-out",
          });
        });
      });
    }, 300);
  }, [filtered, stolen.ids]);

  // The "try this one" tag clears after 5s or on the next interaction.
  useEffect(() => {
    if (!showTag) return;
    const hide = () => setShowTag(false);
    const timer = window.setTimeout(hide, 5000);
    window.addEventListener("pointerdown", hide);
    window.addEventListener("keydown", hide);
    window.addEventListener("wheel", hide, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", hide);
      window.removeEventListener("keydown", hide);
      window.removeEventListener("wheel", hide);
    };
  }, [showTag]);

  // R = surprise me.
  const surpriseRef = useRef(surprise);
  useEffect(() => {
    surpriseRef.current = surprise;
  });
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key !== "r" && e.key !== "R") || e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditableTarget(e.target)) return;
      e.preventDefault();
      surpriseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const items: MasonryItem[] = ordered.map((p, i) => {
    const card = (
      <PromptCard prompt={p} caseNumber={cases.get(p.id)} trending={trending.includes(p.id)} legendary={legendary.has(p.id)} />
    );
    return {
      key: p.id,
      node: (
        <Reveal delay={(i % 4) * 60}>
          {pick?.id === p.id ? (
            <SurpriseMark showTag={showTag} tag={pick.lootedAll ? "you've looted it all — steal again" : "try this one"}>
              {card}
            </SurpriseMark>
          ) : (
            card
          )}
        </Reveal>
      ),
    };
  });

  return (
    <>
      <Suspense fallback={null}>
        <CategoryFromUrl onCategory={setCategory} />
      </Suspense>
      <ToastHost />

      <section className="filter-bar" aria-label="Filter prompts">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-4 sm:px-6 md:flex-row md:items-center md:justify-between md:gap-6 md:py-6">
          <div ref={tabsRef} className="relative -mx-1 flex items-center gap-5 overflow-x-auto px-1 sm:gap-7 md:gap-9">
            {CATEGORIES.map((c) => {
              const active = c === category;
              return (
                <button
                  key={c}
                  type="button"
                  data-tab={c}
                  onClick={() => setCategory(c)}
                  aria-current={active ? "true" : undefined}
                  className="relative shrink-0 pb-2 font-ui text-base transition-colors sm:text-lg"
                >
                  <span className={active ? "text-foreground" : "text-muted-foreground"}>{c}</span>
                </button>
              );
            })}
            <TabInk
              style={{
                width: ink.width,
                transform: `translateX(${ink.left}px)`,
                opacity: ink.width ? 1 : 0,
                transition: `transform 420ms ${EASE_OUT_EXPO}, width 420ms ${EASE_OUT_EXPO}, opacity 200ms ease`,
              }}
            />
          </div>

          <div className="relative w-full md:w-96">
            <label className="sr-only" htmlFor="prompt-search">
              Search prompts
            </label>
            <input
              id="prompt-search"
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search prompts..."
              className="search-field"
            />
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            />
          </div>

          <div className="flex shrink-0 items-center gap-3">
            {SORTS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSort(s.id)}
                aria-pressed={sort === s.id}
                className={`font-ui text-[0.72rem] uppercase tracking-[0.14em] transition-colors ${
                  sort === s.id
                    ? "text-foreground underline decoration-[var(--accent)] decoration-2 underline-offset-4"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s.label}
              </button>
            ))}
            <SurpriseButton onTrigger={surprise} />
          </div>

          <span
            className="key-chip command-key-hint hidden shrink-0 !h-7 !min-w-[3.1rem] !text-[0.68rem] md:inline-flex"
            aria-label="Command palette: Command or Control plus K"
          >
            ⌘K
          </span>
        </div>
      </section>

      <div className="mx-auto w-full max-w-6xl px-5 sm:px-6">
        <InkRule />
      </div>

      <section className="mx-auto w-full max-w-6xl px-5 pt-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          {(["landscape", "portrait"] as const).map((o) => {
            const active = orientation === o;
            return (
              <button
                key={o}
                type="button"
                onClick={() => setOrientation(active ? null : o)}
                aria-pressed={active}
                className={pillClass(active)}
              >
                {ORIENTATION_LABELS[o]}
              </button>
            );
          })}
          <button type="button" onClick={() => setNotStolen((v) => !v)} aria-pressed={notStolen} className={pillClass(notStolen)}>
            Not stolen yet
          </button>
        </div>
      </section>

      {mounted && brands.length > 0 ? (
        <section className="mx-auto w-full max-w-6xl px-5 pt-3 sm:px-6" aria-label="Brand filter">
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 font-ui text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Brand</span>
            <button
              type="button"
              onClick={() => setBrandId(null)}
              aria-pressed={brandId === null}
              className={pillClass(brandId === null)}
            >
              All
            </button>
            {brands.map((b) => {
              const active = brandId === b.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setBrandId(active ? null : b.id)}
                  aria-pressed={active}
                  aria-label={b.name}
                  className={`pill pill-sm border font-ui text-[0.7rem] ${
                    active
                      ? "border-foreground text-foreground"
                      : "border-[var(--paper-line)] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <BrandChip brand={b} />
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {/* Signed-in only in the source (missions panel, comeback note): nothing for guests. */}
      <CrewPromo />
      <GuestNote />

      <section className="mx-auto w-full max-w-6xl px-5 pb-24 pt-6 sm:px-6" aria-label="Prompt gallery">
        {items.length > 0 ? (
          <FinePointerProvider>
            <KeyboardNav />
            <MasonryGrid containerRef={gridRef} className="cine-grid masonry-grid" items={items} />
          </FinePointerProvider>
        ) : (
          <p className="py-16 text-center font-ui text-sm text-muted-foreground">No prompts match your search.</p>
        )}
      </section>
    </>
  );
}
