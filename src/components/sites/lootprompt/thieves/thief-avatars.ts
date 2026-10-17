// Port of lootprompt's thief avatar generator (source chunk `thief-avatars`).
// Every avatar is a 120×120 SVG assembled from small string builders; the output
// is byte-for-byte identical to the source so data URIs match the live site.

const INK = "#1f1a15";
const BONE = "#fdf8ee";
const SKIN_LIGHT = "#f2c9a0";
const SKIN_MID = "#d9a27a";
const SKIN_DARK = "#a8714f";

const BODY_PATH = "M14 124c2-22 20-34 46-34s44 12 46 34Z";

/** Round badge: background disc, clipped artwork, ink outline. */
function frame(content: string, background: string, defs = ""): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs>${defs}<clipPath id="c"><circle cx="60" cy="60" r="57"/></clipPath></defs><circle cx="60" cy="60" r="57" fill="${background}"/><g clip-path="url(#c)">${content}</g><circle cx="60" cy="60" r="57" fill="none" stroke="${INK}" stroke-width="3"/></svg>`;
}

/** Shoulders, with optional collar/scarf details drawn on top. */
function body(fill: string, details = ""): string {
  return `<path d="${BODY_PATH}" fill="${fill}" stroke="${INK}" stroke-width="2.5"/>${details}`;
}

function neck(skin: string): string {
  return `<path d="M50 82v12h20V82" fill="${skin}" stroke="${INK}" stroke-width="2.5"/>`;
}

function head(skin: string, rx = 25, ry = 29, cy = 58): string {
  return `<ellipse cx="60" cy="${cy}" rx="${rx}" ry="${ry}" fill="${skin}" stroke="${INK}" stroke-width="2.5"/>`;
}

function ears(skin: string): string {
  return `<ellipse cx="35" cy="60" rx="5" ry="7" fill="${skin}" stroke="${INK}" stroke-width="2.2"/><ellipse cx="85" cy="60" rx="5" ry="7" fill="${skin}" stroke="${INK}" stroke-width="2.2"/>`;
}

function eyes(cy: number, rx = 6, ry = 4, leftX = 50, rightX = 70, pupil = 2.2): string {
  return `<ellipse cx="${leftX}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${BONE}"/><ellipse cx="${rightX}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${BONE}"/><circle cx="${leftX + 1}" cy="${cy}" r="${pupil}" fill="${INK}"/><circle cx="${rightX + 1}" cy="${cy}" r="${pupil}" fill="${INK}"/>`;
}

/** Robber's eye mask (a tied band or a cat-eye domino) with eyes in it. */
function eyeMask(fill = INK, y = 51, shape: "band" | "cat" = "band"): string {
  const mask =
    shape === "band"
      ? `<path d="M33 ${y}c9-4 45-4 54 0v11c-9 4-45 4-54 0Z" fill="${fill}" stroke="${INK}" stroke-width="2"/><path d="M33 ${y + 5}l-8-3M87 ${y + 5}l9-4" stroke="${fill}" stroke-width="4" stroke-linecap="round"/>`
      : `<path d="M34 ${y + 1}c8-6 18-3 26 2c8-5 18-8 26-2l2 7c-6 7-19 7-28 2c-9 5-22 5-28-2Z" fill="${fill}" stroke="${INK}" stroke-width="2"/>`;
  return mask + eyes(y + 5.5);
}

function smile(y = 73): string {
  return `<path d="M52 ${y}c4 3 11 3 16-1" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`;
}

function nose(y = 64): string {
  return `<path d="M60 ${y}c-2 3-2 5 1 6" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
}

/** Breton-striped shirt. */
function stripedShirt(fill: string, stripe: string): string {
  const stripes = [98, 105, 112, 119]
    .map((y) => `<path d="M10 ${y}h100" stroke="${stripe}" stroke-width="3.5"/>`)
    .join("");
  return `<path d="${BODY_PATH}" fill="${fill}"/>${stripes}<path d="${BODY_PATH}" fill="none" stroke="${INK}" stroke-width="2.5"/>`;
}

/** Four-point twinkle. */
function sparkle(x: number, y: number, size = 5, fill = "#fff5c2"): string {
  const short = +(size * 0.3).toFixed(2);
  const long = +(size * 0.7).toFixed(2);
  return `<path d="M${x} ${y - size}l${short} ${long} ${long} ${short}-${long} ${short}-${short} ${long}-${short}-${long}-${long}-${short} ${long}-${short}Z" fill="${fill}"/>`;
}

/** A path drawn three times with widening translucent strokes (neon glow). */
function neonStroke(d: string, color: string): string {
  const passes: [number, number][] = [
    [9, 0.12],
    [6, 0.25],
    [2.6, 1],
  ];
  return passes
    .map(
      ([width, opacity]) =>
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join("");
}

function topHat(fill: string, band: string): string {
  return `<path d="M40 36h40l-4-24H44Z" fill="${fill}" stroke="${INK}" stroke-width="2.5"/><path d="M42 29h36v6H42Z" fill="${band}"/><path d="M28 36h64c2 0 2 5 0 5H28c-2 0-2-5 0-5Z" fill="${fill}" stroke="${INK}" stroke-width="2.5"/>`;
}

/** Neck, ears and head in one skin tone. */
function face(skin: string): string {
  return neck(skin) + ears(skin) + head(skin);
}

export type AvatarTier = "common" | "premium";

interface AvatarDefinition {
  tier: AvatarTier;
  name: string;
  render: () => string;
}

const AVATARS = {
  classic_robber: {
    tier: "common",
    name: "Classic Robber",
    render: () =>
      frame(
        stripedShirt(BONE, INK) +
          face(SKIN_LIGHT) +
          eyeMask() +
          nose() +
          smile() +
          `<path d="M33 46c0-18 12-26 27-26s27 8 27 26Z" fill="#2b2b2b" stroke="${INK}" stroke-width="2.5"/><path d="M31 44h58v6H31Z" fill="#444" stroke="${INK}" stroke-width="2.2"/><circle cx="60" cy="19" r="5" fill="#c0392b" stroke="${INK}" stroke-width="2"/>`,
        "#7fb7a8",
      ),
  },
  cat_burglar: {
    tier: "common",
    name: "Cat Burglar",
    render: () =>
      frame(
        body("#2a2a35") +
          `<path d="M30 70c0-28 12-44 30-44s30 16 30 44c0 16-12 26-30 26S30 86 30 70Z" fill="#2a2a35" stroke="${INK}" stroke-width="2.5"/><path d="M36 38l2-18 12 12M84 38l-2-18-12 12" fill="#2a2a35" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/><path d="M40 30l1-6 5 5M80 30l-1-6-5 5" fill="#e0a7c2"/>` +
          head(SKIN_MID, 21, 23, 62) +
          eyeMask("#8e44ad", 54, "cat") +
          smile(76),
        "#2e3a59",
      ),
  },
  safecracker: {
    tier: "common",
    name: "Safecracker",
    render: () =>
      frame(
        body("#6b4f3a") +
          `<path d="M42 96c-4 10 2 18 10 18M78 96c4 10-2 18-10 18" fill="none" stroke="#9aa3ad" stroke-width="3.5" stroke-linecap="round"/><circle cx="60" cy="114" r="6" fill="#c8ced4" stroke="${INK}" stroke-width="2"/>` +
          face(SKIN_MID) +
          eyeMask() +
          nose() +
          smile() +
          `<path d="M31 44c2-14 14-22 29-22s28 7 31 20c-10 4-50 6-60 2Z" fill="#8a6a4a" stroke="${INK}" stroke-width="2.5"/><path d="M84 42c8 0 14 2 16 5-6 2-12 2-18 0Z" fill="#8a6a4a" stroke="${INK}" stroke-width="2.2"/><circle cx="46" cy="38" r="7" fill="#bfe3f0" stroke="${INK}" stroke-width="2.2"/><circle cx="66" cy="38" r="7" fill="#bfe3f0" stroke="${INK}" stroke-width="2.2"/><path d="M53 38h6" stroke="${INK}" stroke-width="2.2"/>`,
        "#f2b84b",
      ),
  },
  gentleman_thief: {
    tier: "common",
    name: "Gentleman Thief",
    render: () =>
      frame(
        body(
          "#1f1f26",
          `<path d="M50 92l10 8 10-8-10 16Z" fill="${BONE}" stroke="${INK}" stroke-width="2"/><path d="M52 98l8 4 8-4-8-3Z" fill="#b8413a" stroke="${INK}" stroke-width="1.8"/>`,
        ) +
          ears(SKIN_LIGHT) +
          head(SKIN_LIGHT) +
          eyeMask() +
          nose() +
          `<path d="M48 72c4-3 8-3 12 0 4-3 8-3 12 0-2 4-6 4-8 1-2 3-6 3-8 0-2 3-6 3-8-1Z" fill="#3a2a1e" stroke="${INK}" stroke-width="1.8"/><circle cx="70" cy="56.5" r="8" fill="none" stroke="#d4a017" stroke-width="2.5"/><path d="M78 58c3 6 3 14 1 20" fill="none" stroke="#d4a017" stroke-width="1.5"/>` +
          topHat("#1f1f26", "#b8413a"),
        "#b8413a",
      ),
  },
  pickpocket: {
    tier: "common",
    name: "Pickpocket",
    render: () => {
      const stubble = [
        [46, 76],
        [50, 79],
        [55, 80],
        [65, 80],
        [70, 79],
        [74, 76],
        [52, 77],
        [68, 77],
        [60, 81],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1"/>`)
        .join("");
      return frame(
        body(
          "#5b6b3a",
          `<path d="M36 92c8 6 40 6 48 0l-2 10c-10 5-34 5-44 0Z" fill="#c0392b" stroke="${INK}" stroke-width="2.2"/><path d="M76 98l6 20-8-2Z" fill="#c0392b" stroke="${INK}" stroke-width="2"/>`,
        ) +
          ears(SKIN_DARK) +
          head(SKIN_DARK) +
          eyeMask() +
          nose() +
          smile() +
          `<g fill="#3a2a1e" opacity=".55">${stubble}</g><path d="M32 46c-2-14 12-24 30-24 17 0 30 8 28 22-12 4-44 6-58 2Z" fill="#9c8a6a" stroke="${INK}" stroke-width="2.5"/><path d="M34 44c14 6 38 6 54 0l8 5c-20 8-50 8-66 0Z" fill="#7d6d52" stroke="${INK}" stroke-width="2.2"/><circle cx="60" cy="23" r="3" fill="#7d6d52" stroke="${INK}" stroke-width="1.8"/>`,
        "#9cb86a",
      );
    },
  },
  ninja: {
    tier: "common",
    name: "Ninja",
    render: () =>
      frame(
        body("#232323") +
          `<path d="M30 64c0-26 13-40 30-40s30 14 30 40c0 20-13 32-30 32S30 84 30 64Z" fill="#232323" stroke="${INK}" stroke-width="2.5"/><path d="M36 50h48v14H36Z" fill="${SKIN_MID}" stroke="${INK}" stroke-width="2"/>` +
          eyes(57, 6, 3.5) +
          `<path d="M44 51l12 3M76 51l-12 3" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M31 42h58v7H31Z" fill="#d63a2f" stroke="${INK}" stroke-width="2"/><path d="M88 44c8 2 14 8 16 16M88 46c6 6 8 14 6 20" fill="none" stroke="#d63a2f" stroke-width="4" stroke-linecap="round"/>`,
        "#f0e0c0",
      ),
  },
  getaway_driver: {
    tier: "common",
    name: "Getaway Driver",
    render: () =>
      frame(
        body(
          "#6b3b24",
          `<path d="M38 92l22 10 22-10-4 14-18 6-18-6Z" fill="#8a4d2e" stroke="${INK}" stroke-width="2"/>`,
        ) +
          face(SKIN_MID) +
          nose() +
          smile() +
          `<path d="M34 52c8-3 18-3 22 2 4-5 14-5 22-2l-2 9c-5 3-13 3-17-1-2-2-4-2-6 0-4 4-12 4-17 1Z" fill="#141414" stroke="${INK}" stroke-width="2"/><path d="M40 54l8 4M66 54l8 4" stroke="#9fd3ff" stroke-width="2" stroke-linecap="round"/><path d="M31 44c0-14 12-22 29-22s29 8 29 22Z" fill="#e8e8e8" stroke="${INK}" stroke-width="2.5"/><path d="M52 23h16v21H52Z" fill="#d63a2f"/><path d="M30 44h60c4 0 8 3 10 6H30Z" fill="#e8e8e8" stroke="${INK}" stroke-width="2.5"/>`,
        "#3f7cbf",
      ),
  },
  hacker: {
    tier: "common",
    name: "Hacker",
    render: () =>
      frame(
        body("#2f7d4a") +
          `<path d="M28 70c0-30 14-46 32-46s32 16 32 46v20H28Z" fill="#2f7d4a" stroke="${INK}" stroke-width="2.5"/>` +
          head(SKIN_DARK, 22, 25, 64) +
          nose(68) +
          smile(78) +
          `<rect x="38" y="54" width="18" height="11" rx="3" fill="#0f2418" stroke="${INK}" stroke-width="2"/><rect x="64" y="54" width="18" height="11" rx="3" fill="#0f2418" stroke="${INK}" stroke-width="2"/><path d="M56 59h8" stroke="${INK}" stroke-width="2"/><path d="M41 58h10M41 61h7M67 58h10M67 61h7" stroke="#39ff88" stroke-width="1.6"/><path d="M46 92l4 10M74 92l-4 10" stroke="${BONE}" stroke-width="2.5" stroke-linecap="round"/>`,
        "#1f2a33",
      ),
  },
  pirate: {
    tier: "common",
    name: "Pirate",
    render: () => {
      const bandanaDots = [
        [42, 34],
        [52, 28],
        [64, 28],
        [76, 34],
        [58, 38],
        [46, 40],
        [70, 40],
      ]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.8" fill="${BONE}"/>`)
        .join("");
      return frame(
        stripedShirt(BONE, "#c0392b") +
          face(SKIN_MID) +
          nose() +
          `<path d="M52 74c5 4 12 3 16-2" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/><ellipse cx="50" cy="56" rx="6" ry="4" fill="${BONE}" stroke="${INK}" stroke-width="1.5"/><circle cx="51" cy="56" r="2.2" fill="${INK}"/><rect x="62" y="50" width="16" height="12" rx="3" fill="${INK}"/><path d="M36 44l26 10M76 52l12-6" stroke="${INK}" stroke-width="2.2"/><circle cx="85" cy="70" r="4" fill="none" stroke="#d4a017" stroke-width="2.5"/><path d="M33 48c0-16 12-24 27-24s27 8 27 24Z" fill="#c0392b" stroke="${INK}" stroke-width="2.5"/>` +
          bandanaDots +
          `<path d="M86 46l12 6-6 6M86 46l10-2" fill="#c0392b" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/>`,
        "#2f6f8f",
      );
    },
  },
  mime: {
    tier: "common",
    name: "Mime",
    render: () =>
      frame(
        stripedShirt(BONE, INK) +
          face("#fbfbf7") +
          `<path d="M44 52l6 6 6-6M64 52l6 6 6-6" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M50 42v8M70 42v8" stroke="${INK}" stroke-width="2"/><path d="M53 72c4 4 10 4 14 0" fill="#d63a2f" stroke="${INK}" stroke-width="2"/><circle cx="43" cy="68" r="3" fill="#e8806a" opacity=".6"/><circle cx="77" cy="68" r="3" fill="#e8806a" opacity=".6"/><path d="M34 40c4-12 16-17 30-15 12 2 22 7 24 13-14 5-40 7-54 2Z" fill="${INK}" stroke="${INK}" stroke-width="2"/><path d="M60 24v-6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`,
        "#f4c7c3",
      ),
  },
  outlaw: {
    tier: "common",
    name: "Outlaw",
    render: () =>
      frame(
        body("#7a4a2a") +
          face(SKIN_MID) +
          eyes(55, 5, 3.5, 50, 70, 2) +
          `<path d="M43 49l12 2M77 49l-12 2" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/><path d="M34 62c8 2 44 2 52 0c0 16-10 26-26 28-16-2-26-12-26-28Z" fill="#c0392b" stroke="${INK}" stroke-width="2.4"/><path d="M42 70l4 3M56 74l3 3M70 71l3 3" stroke="${BONE}" stroke-width="1.8" stroke-linecap="round"/><path d="M36 38c2-14 12-20 24-20s22 6 24 20Z" fill="#8a5a32" stroke="${INK}" stroke-width="2.5"/><path d="M36 34h48" stroke="#4a2e18" stroke-width="3"/><path d="M14 42c10-6 82-6 92 0-4 6-88 6-92 0Z" fill="#8a5a32" stroke="${INK}" stroke-width="2.5"/>`,
        "#d9864a",
      ),
  },
  art_forger: {
    tier: "common",
    name: "Art Forger",
    render: () =>
      frame(
        body(
          "#2e4057",
          `<path d="M44 92c6 4 26 4 32 0l-4 8c-8 3-16 3-24 0Z" fill="#f2b84b" stroke="${INK}" stroke-width="2"/>`,
        ) +
          ears(SKIN_LIGHT) +
          head(SKIN_LIGHT) +
          eyeMask() +
          nose() +
          smile(75) +
          `<path d="M50 70h20" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><circle cx="44" cy="72" r="3.5" fill="#2e86de"/><circle cx="48" cy="76" r="2.2" fill="#f2b84b"/><circle cx="78" cy="74" r="2.6" fill="#d63a2f"/><path d="M30 42c2-12 14-20 32-18 16 2 26 10 26 16-10 6-46 8-58 2Z" fill="#d63a2f" stroke="${INK}" stroke-width="2.5"/><path d="M62 24l2-6" stroke="${INK}" stroke-width="3" stroke-linecap="round"/><path d="M84 56l18-22" stroke="#c9a46a" stroke-width="3.5" stroke-linecap="round"/><path d="M100 36l4-6" stroke="#7e5ba6" stroke-width="5" stroke-linecap="round"/>`,
        "#7e5ba6",
      ),
  },
  jewel_thief: {
    tier: "common",
    name: "Jewel Thief",
    render: () =>
      frame(
        body(
          "#111",
          `<path d="M40 94c6 6 34 6 40 0" fill="none" stroke="#f5f0e6" stroke-width="3" stroke-dasharray="1 5" stroke-linecap="round"/>`,
        ) +
          `<path d="M30 66c-2-26 10-42 30-42s32 16 30 42c-2 10-4 14-6 16H36c-2-2-5-6-6-16Z" fill="#141414" stroke="${INK}" stroke-width="2.5"/>` +
          head(SKIN_LIGHT, 23, 27, 62) +
          `<path d="M36 50c6-16 30-20 44-6-10-2-30 0-44 6Z" fill="#141414"/><path d="M36 53c8-5 17-4 24 1 7-5 16-6 24-1l-1 8c-6 4-15 4-23-1-8 5-17 5-23 1Z" fill="#141414" stroke="${INK}" stroke-width="1.8"/>` +
          eyes(57, 5, 3.5, 49, 71, 2) +
          `<path d="M53 74c4 3 10 3 14 0-4-2-10-2-14 0Z" fill="#c0392b" stroke="${INK}" stroke-width="1.5"/><circle cx="37" cy="72" r="3.5" fill="#f5f0e6" stroke="${INK}" stroke-width="1.5"/><circle cx="83" cy="72" r="3.5" fill="#f5f0e6" stroke="${INK}" stroke-width="1.5"/><ellipse cx="42" cy="70" rx="5" ry="3" fill="#e8806a" opacity=".45"/><ellipse cx="78" cy="70" rx="5" ry="3" fill="#e8806a" opacity=".45"/>`,
        "#e0a7c2",
      ),
  },
  heist_clown: {
    tier: "common",
    name: "Heist Clown",
    render: () => {
      const hairPuffs = [
        [30, 46, 10],
        [90, 46, 10],
        [36, 34, 8],
        [84, 34, 8],
      ]
        .map(
          ([x, y, r]) =>
            `<circle cx="${x}" cy="${y}" r="${r}" fill="#2e86de" stroke="${INK}" stroke-width="2.2"/>`,
        )
        .join("");
      return frame(
        body(
          "#2e86de",
          `<path d="M36 92l8 8 8-8 8 8 8-8 8 8 8-8" fill="none" stroke="#f2d14b" stroke-width="3" stroke-linejoin="round"/>`,
        ) +
          hairPuffs +
          head("#fbfbf7") +
          `<path d="M42 50l8-4 8 4M62 50l8-4 8 4" fill="none" stroke="${INK}" stroke-width="2"/><ellipse cx="50" cy="56" rx="5" ry="4" fill="${INK}"/><ellipse cx="70" cy="56" rx="5" ry="4" fill="${INK}"/><circle cx="51" cy="55" r="1.4" fill="#fff"/><circle cx="71" cy="55" r="1.4" fill="#fff"/><circle cx="60" cy="65" r="6" fill="#d63a2f" stroke="${INK}" stroke-width="2"/><path d="M44 74c6 8 26 8 32 0" fill="#d63a2f" stroke="${INK}" stroke-width="2.2"/><path d="M48 76c4 3 20 3 24 0" stroke="${BONE}" stroke-width="2"/>`,
        "#f2d14b",
      );
    },
  },
  masquerade: {
    tier: "common",
    name: "Masquerade",
    render: () =>
      frame(
        body(
          "#1f3d36",
          `<path d="M48 92h24l-6 10h-12Z" fill="#d4a017" stroke="${INK}" stroke-width="2"/>`,
        ) +
          face(SKIN_MID) +
          nose(66) +
          smile(76) +
          `<path d="M32 54c6-8 18-10 28-3 10-7 22-5 28 3-2 8-10 12-18 11-4 0-7-3-10-5-3 2-6 5-10 5-8 1-16-3-18-11Z" fill="#d4a017" stroke="${INK}" stroke-width="2"/><path d="M36 54c6 2 10 2 14 0M70 54c4 2 8 2 14 0" stroke="#fff3c4" stroke-width="1.5"/>` +
          eyes(57, 5, 3.2, 49, 71, 2) +
          `<path d="M84 50c6-16 10-26 18-32-2 12-8 24-16 34Z" fill="#c0392b" stroke="${INK}" stroke-width="1.8"/><path d="M86 50c2-12 2-22 8-30" stroke="#8e44ad" stroke-width="3" stroke-linecap="round"/><path d="M36 38c4-12 14-16 24-16s20 4 24 16c-10-3-38-3-48 0Z" fill="#3a2a1e" stroke="${INK}" stroke-width="2.2"/>`,
        "#3c8d7a",
      ),
  },
  golden_phantom: {
    tier: "premium",
    name: "Golden Phantom",
    render: () =>
      frame(
        body("#1b1b22", `<path d="M50 92l10 10 10-10" fill="none" stroke="url(#gm)" stroke-width="4"/>`) +
          ears(SKIN_LIGHT) +
          head(SKIN_LIGHT) +
          nose() +
          smile() +
          `<path d="M31 50c10-6 48-6 58 0v13c-10 6-48 6-58 0Z" fill="url(#gm)" stroke="${INK}" stroke-width="2"/><path d="M36 52c10-3 38-3 48 0" stroke="#fffbe0" stroke-width="2" opacity=".9"/><ellipse cx="50" cy="57" rx="6" ry="4" fill="#1b1b22"/><ellipse cx="70" cy="57" rx="6" ry="4" fill="#1b1b22"/><circle cx="51" cy="57" r="2" fill="#ffe27a"/><circle cx="71" cy="57" r="2" fill="#ffe27a"/>` +
          topHat("#1b1b22", "url(#gm)") +
          sparkle(24, 30, 6) +
          sparkle(96, 78, 5) +
          sparkle(92, 22, 4),
        "url(#g)",
        `<radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#fff2a8"/><stop offset=".55" stop-color="#e2b33c"/><stop offset="1" stop-color="#8a5a12"/></radialGradient><linearGradient id="gm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff6c8"/><stop offset=".5" stop-color="#e0a82e"/><stop offset="1" stop-color="#9c6a14"/></linearGradient>`,
      ),
  },
  neon_ghost: {
    tier: "premium",
    name: "Neon Ghost",
    render: () =>
      frame(
        neonStroke(
          "M60 26c16 0 26 14 26 34v40l-8-6-6 6-6-6-6 6-6-6-6 6-6-6-8 6V60c0-20 10-34 26-34Z",
          "#3ff3ff",
        ) +
          neonStroke("M40 54c8-5 32-5 40 0v9c-8 5-32 5-40 0Z", "#ff4fd8") +
          `<circle cx="51" cy="58.5" r="3" fill="#ffffff"/><circle cx="69" cy="58.5" r="3" fill="#ffffff"/>` +
          neonStroke("M52 74c4 3 12 3 16 0", "#3ff3ff") +
          sparkle(26, 30, 4, "#3ff3ff") +
          sparkle(94, 36, 5, "#ff4fd8") +
          sparkle(90, 92, 4, "#3ff3ff"),
        "url(#n)",
        `<radialGradient id="n" cx="50%" cy="45%" r="65%"><stop offset="0" stop-color="#1c2550"/><stop offset="1" stop-color="#05070f"/></radialGradient>`,
      ),
  },
  diamond_duke: {
    tier: "premium",
    name: "Diamond Duke",
    render: () =>
      frame(
        body("#3b2a6b", `<path d="M46 92l14 12 14-12" fill="url(#cr)" stroke="${INK}" stroke-width="2"/>`) +
          ears(SKIN_LIGHT) +
          head(SKIN_LIGHT) +
          eyeMask("#3b2a6b") +
          nose() +
          smile() +
          `<path d="M36 36l8-18 8 12 8-16 8 16 8-12 8 18Z" fill="url(#cr)" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/><path d="M44 18l4 18M60 14v22M76 18l-4 18" stroke="#ffffff" stroke-width="1.2" opacity=".8"/><path d="M34 36h52v5H34Z" fill="url(#cr)" stroke="${INK}" stroke-width="2"/><path d="M70 50l6 5-6 8-6-8Z" fill="url(#cr)" stroke="${INK}" stroke-width="1.6"/>` +
          sparkle(24, 28, 6, "#ffffff") +
          sparkle(98, 48, 5, "#ffffff") +
          sparkle(94, 90, 4, "#e9e2ff"),
        "url(#d)",
        `<linearGradient id="d" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9e2ff"/><stop offset="1" stop-color="#9b8cd9"/></linearGradient><linearGradient id="cr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset=".4" stop-color="#bfe9ff"/><stop offset=".7" stop-color="#d9c2ff"/><stop offset="1" stop-color="#8fd6ff"/></linearGradient>`,
      ),
  },
  shadow_king: {
    tier: "premium",
    name: "Shadow King",
    render: () => {
      const glowRings: [number, number][] = [
        [8, 0.15],
        [5, 0.35],
        [3, 1],
      ];
      const glowingEyes = [50, 70]
        .map((cx) =>
          glowRings
            .map(
              ([rx, opacity]) =>
                `<ellipse cx="${cx}" cy="62" rx="${rx}" ry="${+(rx * 0.6).toFixed(2)}" fill="#ffd23f" opacity="${opacity}"/>`,
            )
            .join(""),
        )
        .join("");
      return frame(
        `<path d="M10 124c4-40 20-86 50-94 30 8 46 54 50 94Z" fill="#120a1c" stroke="${INK}" stroke-width="2.5"/><path d="M34 70c0-22 11-36 26-36s26 14 26 36c0 16-11 26-26 26S34 86 34 70Z" fill="#050308"/>` +
          glowingEyes +
          `<path d="M42 30l6-14 6 9 6-12 6 12 6-9 6 14Z" fill="#2a1540" stroke="#8e5bd6" stroke-width="2" stroke-linejoin="round"/><circle cx="60" cy="20" r="2.5" fill="#ffd23f"/>` +
          sparkle(26, 40, 4, "#b98cff") +
          sparkle(94, 34, 4, "#b98cff"),
        "url(#s)",
        `<radialGradient id="s" cx="50%" cy="40%" r="70%"><stop offset="0" stop-color="#4a2a6b"/><stop offset="1" stop-color="#0d0714"/></radialGradient>`,
      );
    },
  },
  holo_legend: {
    tier: "premium",
    name: "Holo Legend",
    render: () =>
      frame(
        body(BONE, `<path d="${BODY_PATH}" fill="url(#hm)" opacity=".55"/>`) +
          face(SKIN_LIGHT) +
          nose() +
          smile() +
          `<path d="M31 50c10-6 48-6 58 0v13c-10 6-48 6-58 0Z" fill="url(#hm)" stroke="${INK}" stroke-width="2"/>` +
          eyes(57) +
          `<path d="M60 14l8 16H52Z" fill="url(#hm)" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/><path d="M36 36c4-12 14-16 24-16s20 4 24 16c-10-3-38-3-48 0Z" fill="#141414" stroke="${INK}" stroke-width="2.2"/>` +
          sparkle(24, 30, 6, "#ffffff") +
          sparkle(96, 82, 5, "#ffffff") +
          sparkle(92, 24, 4, "#ffffff"),
        "url(#h)",
        `<linearGradient id="h" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb3d9"/><stop offset=".25" stop-color="#b3e5ff"/><stop offset=".5" stop-color="#d4ffb3"/><stop offset=".75" stop-color="#fff0b3"/><stop offset="1" stop-color="#d9b3ff"/></linearGradient><linearGradient id="hm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ff6fb5"/><stop offset=".33" stop-color="#6fc8ff"/><stop offset=".66" stop-color="#8dff6f"/><stop offset="1" stop-color="#b56fff"/></linearGradient>`,
      ),
  },
} satisfies Record<string, AvatarDefinition>;

export type AvatarStyle = keyof typeof AVATARS;

const CATALOGUE: Record<AvatarStyle, AvatarDefinition> = AVATARS;

/** Every avatar style, in catalogue order. */
export const AVATAR_STYLES = Object.keys(CATALOGUE) as AvatarStyle[];

/** Styles a seed can land on (premium ones must be chosen explicitly). */
const COMMON_STYLES = AVATAR_STYLES.filter((style) => CATALOGUE[style].tier === "common");

function isAvatarStyle(value: string): value is AvatarStyle {
  return Object.prototype.hasOwnProperty.call(CATALOGUE, value);
}

const svgCache = new Map<AvatarStyle, string>();

/** Raw SVG markup for a style (memoised). */
export function avatarSvg(style: AvatarStyle): string {
  let svg = svgCache.get(style);
  if (!svg) {
    svg = CATALOGUE[style].render();
    svgCache.set(style, svg);
  }
  return svg;
}

export function avatarDataUri(style: AvatarStyle): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(avatarSvg(style))}`;
}

export function avatarMeta(style: AvatarStyle): { tier: AvatarTier; name: string } {
  const { tier, name } = CATALOGUE[style];
  return { tier, name };
}

/** Deterministic common style for a seed (string hash mod 100003). */
export function styleForSeed(seed: string): AvatarStyle {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 100003;
  return COMMON_STYLES[hash % COMMON_STYLES.length] ?? "classic_robber";
}

/** The thief's chosen style when valid, otherwise the one derived from their seed. */
export function resolveAvatarStyle(style: string | null | undefined, seed: string): AvatarStyle {
  return style && isAvatarStyle(style) ? style : styleForSeed(seed || "thief");
}

/** Returns an SVG data URI for a thief avatar from its seed (and optional chosen style). */
export function thiefAvatarUri(seed: string, style?: string | null): string {
  return avatarDataUri(resolveAvatarStyle(style, seed));
}
