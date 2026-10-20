// The 1080×1920 story card (source chunk `story-card`): a paper backdrop, the post
// on a tilted 3D card, the prompt's title / model / steals and the lootprompt.com
// footer. `renderStoryPng` is the still fallback; the video reuses the painters.

export const STORY_W = 1080;
export const STORY_H = 1920;

const INK = "#1f1a15";
const MUTED = "#6e6358";
const RUST = "#8a3b1e";

export type Point = [number, number];
export type Point3 = [number, number, number];
export type MakeCanvas = (width: number, height: number) => HTMLCanvasElement;
type Ctx = CanvasRenderingContext2D;

/** What the story shows of a prompt (source `R`). */
export interface StoryPrompt {
  id: string;
  title: string;
  model: string;
  prompt: string;
  copyCount: number;
  posterUrl: string | null;
}

/** One painted prompt line, kept so the thief can carry it off. */
export interface StoryLine {
  text: string;
  x: number;
  y: number;
  font: string;
  color: string;
}

export interface StoryTextLayout {
  stolenAt: Point;
  promptLines: StoryLine[];
}

/** Camera and card geometry shared by the still and the video. */
export const STORY_CARD = {
  cx: 540,
  cy: 690,
  yaw: -17,
  pitch: 7,
  roll: -2.5,
  focal: 2200,
  radius: 34,
  depth: 22,
} as const;

export const toRadians = (deg: number) => (deg * Math.PI) / 180;

/* ---------- fonts ---------- */

function cssFamily(variable: string, fallback: string): string {
  if (typeof document === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

/**
 * The page loads Inter Tight and Caveat through next/font, which registers them
 * under generated family names; canvas text needs those exact names.
 */
export function storyFonts(): { ui: string; hand: string } {
  return {
    ui: cssFamily("--font-inter-tight", "'Inter Tight'"),
    hand: cssFamily("--font-caveat", "Caveat"),
  };
}

export async function loadStoryFonts(): Promise<void> {
  const { ui, hand } = storyFonts();
  await Promise.all([
    document.fonts?.load?.(`600 80px ${ui}`).catch(() => null),
    document.fonts?.load?.(`700 64px ${hand}`).catch(() => null),
  ]);
  await document.fonts?.ready;
}

/* ---------- geometry ---------- */

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Word-wraps to at most `maxLines`, ending the last line with an ellipsis when cut. */
function wrapLines(ctx: Ctx, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.replace(/\s+/g, " ").trim().split(" ");
  const lines: string[] = [];
  let line = "";
  let i = 0;
  for (; i < words.length; i++) {
    const word = words[i] ?? "";
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === maxLines) break;
    } else {
      line = candidate;
    }
  }
  if (lines.length < maxLines && line) {
    lines.push(line);
    line = "";
    i = words.length;
  }
  if (i < words.length || line) {
    let last = lines[lines.length - 1] ?? "";
    while (last && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    lines[lines.length - 1] = `${last.trimEnd()}…`;
  }
  return lines;
}

/** The burglar-mask logo in the footer. */
function drawMask(ctx: Ctx, x: number, y: number, r: number, eyeColor: string): void {
  ctx.save();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = eyeColor;
  ctx.beginPath();
  ctx.ellipse(x - r * 0.45, y, r * 0.26, r * 0.16, -0.15, 0, Math.PI * 2);
  ctx.ellipse(x + r * 0.45, y, r * 0.26, r * 0.16, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export interface Projector {
  rot: (p: Point3) => Point3;
  project: (p: Point3) => Point;
}

/** Yaw → pitch → roll rotation with a pinhole projection around (cx, cy). */
export function makeProjector(
  cx: number,
  cy: number,
  yaw: number,
  pitch: number,
  roll: number,
  focal: number,
): Projector {
  const cosY = Math.cos(yaw);
  const sinY = Math.sin(yaw);
  const cosP = Math.cos(pitch);
  const sinP = Math.sin(pitch);
  const cosR = Math.cos(roll);
  const sinR = Math.sin(roll);
  const rot = ([x, y, z]: Point3): Point3 => {
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    const y2 = y * cosP - z1 * sinP;
    const z2 = y * sinP + z1 * cosP;
    return [x1 * cosR - y2 * sinR, x1 * sinR + y2 * cosR, z2];
  };
  return {
    rot,
    project: (p) => {
      const [x, y, z] = rot(p);
      const s = focal / (focal + z);
      return [cx + x * s, cy + y * s];
    },
  };
}

/** Draws the source triangle s0-s1-s2 of `image` onto the screen triangle d0-d1-d2. */
function drawTriangle(
  ctx: Ctx,
  image: CanvasImageSource,
  s0: Point,
  s1: Point,
  s2: Point,
  d0: Point,
  d1: Point,
  d2: Point,
): void {
  const cx = (d0[0] + d1[0] + d2[0]) / 3;
  const cy = (d0[1] + d1[1] + d2[1]) / 3;
  const m = ctx.getTransform();
  // Grow each triangle by ~1px so neighbouring triangles leave no hairline seams.
  const grow = 1.2 / Math.max(0.1, Math.hypot(m.a, m.b));
  const expand = (p: Point): Point => {
    const dx = p[0] - cx;
    const dy = p[1] - cy;
    const len = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / len) * grow, p[1] + (dy / len) * grow];
  };
  const [e0, e1, e2] = [expand(d0), expand(d1), expand(d2)];
  const det = s0[0] * (s1[1] - s2[1]) - s0[1] * (s1[0] - s2[0]) + (s1[0] * s2[1] - s2[0] * s1[1]);
  if (Math.abs(det) < 1e-9) return;
  const solve = (a: number, b: number, c: number): Point3 => [
    (a * (s1[1] - s2[1]) - s0[1] * (b - c) + (b * s2[1] - c * s1[1])) / det,
    (s0[0] * (b - c) - a * (s1[0] - s2[0]) + (s1[0] * c - s2[0] * b)) / det,
    (s0[0] * (s1[1] * c - s2[1] * b) - s0[1] * (s1[0] * c - s2[0] * b) + a * (s1[0] * s2[1] - s2[0] * s1[1])) /
      det,
  ];
  const [ma, mc, me] = solve(d0[0], d1[0], d2[0]);
  const [mb, md, mf] = solve(d0[1], d1[1], d2[1]);
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(e0[0], e0[1]);
  ctx.lineTo(e1[0], e1[1]);
  ctx.lineTo(e2[0], e2[1]);
  ctx.closePath();
  ctx.clip();
  ctx.transform(ma, mb, mc, md, me, mf);
  ctx.drawImage(image, 0, 0);
  ctx.restore();
}

function polygon(ctx: Ctx, points: Point[]): void {
  ctx.beginPath();
  points.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
  ctx.closePath();
}

/** Outline of a rounded rectangle centred on the origin, at depth `z`. */
export function roundedOutline(hw: number, hh: number, r: number, z: number, steps = 8): Point3[] {
  const points: Point3[] = [];
  const corners: Point3[] = [
    [hw - r, -hh + r, -Math.PI / 2],
    [hw - r, hh - r, 0],
    [-hw + r, hh - r, Math.PI / 2],
    [-hw + r, -hh + r, Math.PI],
  ];
  for (const [x, y, start] of corners) {
    for (let i = 0; i <= steps; i++) {
      const a = start + (Math.PI / 2) * (i / steps);
      points.push([x + Math.cos(a) * r, y + Math.sin(a) * r, z]);
    }
  }
  return points;
}

/** Card size for a media aspect ratio (width / height). */
export function storyCardSize(aspect: number): { cw: number; ch: number } {
  let cw = aspect > 1 ? 860 : 720;
  let ch = cw / aspect;
  if (ch > 1000) {
    ch = 1000;
    cw = ch * aspect;
  }
  return { cw, ch };
}

/* ---------- painters ---------- */

/** Soft contact shadow under the card (drawn off-canvas, only the shadow lands). */
export function paintCardShadow(ctx: Ctx, outline: Point[], cy: number): void {
  ctx.save();
  ctx.fillStyle = "#000";
  ctx.shadowOffsetX = 4000;
  ctx.shadowColor = "rgba(45,30,15,0.34)";
  ctx.shadowBlur = 110;
  polygon(
    ctx,
    outline.map(([x, y]) => [x + 60 + (y - cy) * 0.06 - 4000, y + 90]),
  );
  ctx.fill();
  ctx.shadowColor = "rgba(35,22,10,0.32)";
  ctx.shadowBlur = 34;
  polygon(
    ctx,
    outline.map(([x, y]) => [x + 16 - 4000, y + 24]),
  );
  ctx.fill();
  ctx.restore();
}

/** The card's paper edge: stacked outlines from the back face forward. */
export function paintCardEdge(
  ctx: Ctx,
  project: (p: Point3) => Point,
  hw: number,
  hh: number,
  radius: number,
  depth: number,
): void {
  for (let i = 10; i >= 1; i--) {
    const s = i / 10;
    polygon(ctx, roundedOutline(hw, hh, radius, depth * s).map(project));
    const c = Math.round(214 - s * 52);
    ctx.fillStyle = `rgb(${c}, ${Math.round(c * 0.95)}, ${Math.round(c * 0.86)})`;
    ctx.fill();
  }
}

/** Maps a flat face image onto the projected card with a grid of triangles. */
export function paintCardFaceMesh(
  ctx: Ctx,
  face: CanvasImageSource,
  project: (p: Point3) => Point,
  w: number,
  h: number,
  cells = 20,
): void {
  const hw = w / 2;
  const hh = h / 2;
  const grid: Point[][] = [];
  for (let row = 0; row <= cells; row++) {
    const line: Point[] = [];
    for (let col = 0; col <= cells; col++) line.push(project([-hw + (w * col) / cells, -hh + (h * row) / cells, 0]));
    grid.push(line);
  }
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const x0 = (w * col) / cells;
      const x1 = (w * (col + 1)) / cells;
      const y0 = (h * row) / cells;
      const y1 = (h * (row + 1)) / cells;
      const p00 = grid[row]?.[col];
      const p01 = grid[row]?.[col + 1];
      const p10 = grid[row + 1]?.[col];
      const p11 = grid[row + 1]?.[col + 1];
      if (!p00 || !p01 || !p10 || !p11) continue;
      drawTriangle(ctx, face, [x0, y0], [x1, y0], [x0, y1], p00, p01, p10);
      drawTriangle(ctx, face, [x1, y0], [x1, y1], [x0, y1], p01, p11, p10);
    }
  }
}

/** Warm paper, a light pool, graph lines, vignette and grain. */
export function paintBackdrop(ctx: Ctx, makeCanvas: MakeCanvas, lightX: number, lightY: number): void {
  const base = ctx.createLinearGradient(0, 0, 0, STORY_H);
  base.addColorStop(0, "#f6f0e4");
  base.addColorStop(1, "#ece2d0");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  const light = ctx.createRadialGradient(lightX, lightY, 40, lightX, lightY, 900);
  light.addColorStop(0, "rgba(255,252,244,0.95)");
  light.addColorStop(0.45, "rgba(255,249,236,0.35)");
  light.addColorStop(1, "rgba(255,249,236,0)");
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  ctx.strokeStyle = "rgba(60,45,30,0.045)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= STORY_W; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, STORY_H);
    ctx.stroke();
  }
  for (let y = 0; y <= STORY_H; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(STORY_W, y + 0.5);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(
    STORY_W / 2,
    STORY_H * 0.45,
    STORY_H * 0.35,
    STORY_W / 2,
    STORY_H * 0.45,
    STORY_H * 0.85,
  );
  vignette.addColorStop(0, "rgba(70,50,30,0)");
  vignette.addColorStop(1, "rgba(70,50,30,0.16)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, STORY_W, STORY_H);

  const grain = makeCanvas(256, 256);
  const g = grain.getContext("2d");
  if (g) {
    const data = g.createImageData(256, 256);
    let seed = 7;
    for (let i = 0; i < data.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const v = seed % 255;
      data.data[i] = data.data[i + 1] = data.data[i + 2] = v;
      data.data[i + 3] = 14;
    }
    g.putImageData(data, 0, 0);
    const pattern = ctx.createPattern(grain, "repeat");
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, STORY_W, STORY_H);
    }
  }
}

/** The flat card face: media stretched to the card, shade, glare and a light rim. */
function paintCardFace(
  makeCanvas: MakeCanvas,
  image: CanvasImageSource | null,
  w: number,
  h: number,
  r: number,
): HTMLCanvasElement {
  const canvas = makeCanvas(Math.ceil(w), Math.ceil(h));
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  roundRect(ctx, 0, 0, w, h, r);
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "#e6dccb";
  ctx.fillRect(0, 0, w, h);
  if (image) ctx.drawImage(image, 0, 0, w, h);
  const shade = ctx.createLinearGradient(0, 0, 0, h);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.7, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(10,6,2,0.28)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  const glare = ctx.createLinearGradient(0, 0, w, h);
  glare.addColorStop(0, "rgba(255,255,255,0.20)");
  glare.addColorStop(0.28, "rgba(255,255,255,0.05)");
  glare.addColorStop(0.36, "rgba(255,255,255,0.18)");
  glare.addColorStop(0.44, "rgba(255,255,255,0.02)");
  glare.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
  roundRect(ctx, 1.5, 1.5, w - 3, h - 3, r - 1.5);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();
  return canvas;
}

/** The whole still story. */
function paintStory(
  ctx: Ctx,
  makeCanvas: MakeCanvas,
  image: HTMLImageElement | null,
  imageW: number,
  imageH: number,
  prompt: StoryPrompt,
): void {
  const card = STORY_CARD;
  paintBackdrop(ctx, makeCanvas, card.cx - 120, card.cy - 260);
  const { cw, ch } = storyCardSize(image && imageW && imageH ? imageW / imageH : 9 / 16);
  const { project } = makeProjector(
    card.cx,
    card.cy,
    toRadians(card.yaw),
    toRadians(card.pitch),
    toRadians(card.roll),
    card.focal,
  );
  const hw = cw / 2;
  const hh = ch / 2;
  paintCardShadow(ctx, roundedOutline(hw, hh, card.radius, 0).map(project), card.cy);
  paintCardEdge(ctx, project, hw, hh, card.radius, card.depth);
  paintCardFaceMesh(ctx, paintCardFace(makeCanvas, image, cw, ch, card.radius), project, cw, ch);
  paintStoryText(ctx, prompt);
}

/** Model, title, steals, two prompt lines and the footer; returns where things went. */
export function paintStoryText(
  ctx: Ctx,
  prompt: StoryPrompt,
  options: { stolen?: boolean; prompt?: boolean } = {},
): StoryTextLayout {
  const { ui, hand } = storyFonts();
  let y = 1340;
  ctx.fillStyle = MUTED;
  ctx.font = `600 26px ${ui}, sans-serif`;
  ctx.letterSpacing = "6px";
  const model = prompt.model.toUpperCase();
  ctx.fillText(model, 110, y);
  const modelWidth = ctx.measureText(model).width;
  ctx.letterSpacing = "0px";
  ctx.strokeStyle = "rgba(110,99,88,0.45)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(110 + modelWidth + 24, y - 9);
  ctx.lineTo(970, y - 9);
  ctx.stroke();

  y += 84;
  ctx.fillStyle = INK;
  ctx.font = `600 68px ${ui}, sans-serif`;
  ctx.letterSpacing = "-1px";
  for (const line of wrapLines(ctx, prompt.title, 860, 2)) {
    ctx.fillText(line, 110, y);
    y += 78;
  }
  ctx.letterSpacing = "0px";

  const stolenAt: Point = [110, y + 6];
  if (options.stolen !== false) paintStolen(ctx, prompt.copyCount, stolenAt, 1);

  y += 88;
  ctx.fillStyle = MUTED;
  ctx.font = `30px ${ui}, sans-serif`;
  const promptLines: StoryLine[] = [];
  for (const line of wrapLines(ctx, prompt.prompt, 860, 2)) {
    promptLines.push({ text: line, x: 110, y, font: ctx.font, color: MUTED });
    if (options.prompt !== false) ctx.fillText(line, 110, y);
    y += 44;
  }

  ctx.strokeStyle = "rgba(110,99,88,0.3)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(110, 1750);
  ctx.lineTo(970, 1750);
  ctx.stroke();
  drawMask(ctx, 142, 1814, 32, "#efe6d6");
  ctx.fillStyle = INK;
  ctx.font = `600 30px ${ui}, sans-serif`;
  ctx.fillText("lootprompt.com", 196, 1806);
  ctx.fillStyle = MUTED;
  ctx.font = `24px ${ui}, sans-serif`;
  ctx.fillText(`/prompt/${prompt.id}`, 196, 1840);
  ctx.textAlign = "right";
  ctx.font = `700 44px ${hand}, cursive`;
  ctx.fillStyle = INK;
  ctx.fillText("steal it", 912, 1826);
  ctx.textAlign = "left";
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(924, 1814);
  ctx.quadraticCurveTo(946, 1808, 968, 1814);
  ctx.moveTo(956, 1804);
  ctx.lineTo(968, 1814);
  ctx.lineTo(957, 1824);
  ctx.stroke();
  return { stolenAt, promptLines };
}

/** Handwritten "stolen N×", wiped in left to right while `progress` < 1. */
export function paintStolen(ctx: Ctx, count: number, at: Point, progress: number): void {
  if (progress <= 0) return;
  const { hand } = storyFonts();
  ctx.save();
  ctx.translate(at[0], at[1]);
  ctx.rotate(-0.035);
  ctx.font = `700 62px ${hand}, cursive`;
  const text = `stolen ${count}×`;
  if (progress < 1) {
    const width = ctx.measureText(text).width + 20;
    ctx.beginPath();
    ctx.rect(-10, -70, width * progress, 100);
    ctx.clip();
  }
  ctx.fillStyle = RUST;
  ctx.fillText(text, 0, 0);
  ctx.restore();
}

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export const makeCanvas: MakeCanvas = (width, height) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
};

/** The still story as a PNG (source `renderStoryPng`). */
export async function renderStoryPng(prompt: StoryPrompt): Promise<Blob> {
  const pending = prompt.posterUrl ? loadImage(prompt.posterUrl) : Promise.resolve(null);
  await loadStoryFonts();
  const image = await pending;
  const canvas = makeCanvas(STORY_W, STORY_H);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");
  paintStory(ctx, makeCanvas, image, image?.naturalWidth ?? 0, image?.naturalHeight ?? 0, prompt);
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))), "image/png"),
  );
}

export type DeliverResult = "shared" | "cancelled" | "needs-gesture" | "downloaded";

/** Opens the share sheet where files can be shared, otherwise downloads the file. */
export async function deliverFile(blob: Blob, filename: string, type: string, revokeAfterMs: number): Promise<DeliverResult> {
  const file = new File([blob], filename, { type });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch (error) {
      return error instanceof DOMException && error.name === "AbortError" ? "cancelled" : "needs-gesture";
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), revokeAfterMs);
  return "downloaded";
}

/** Shares or downloads the PNG story (source `deliverStory`). */
export function deliverStory(blob: Blob, slug: string): Promise<DeliverResult> {
  return deliverFile(blob, `lootprompt-${slug}.png`, "image/png", 2000);
}
