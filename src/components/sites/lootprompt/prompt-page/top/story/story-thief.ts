// The thief who walks into the story, pockets the prompt lines and zips off,
// followed by the STOLEN stamp (source chunk `story-video`, functions Fn…Yn).
// Times are seconds into the story; the thief moves at 12 poses a second.
import { storyFonts, type Point, type StoryLine } from "./story-card";

type Ctx = CanvasRenderingContext2D;

const INK = "#1f1a15";
const SHIRT = "#fdf8ee";
const SKIN = "#f2c9a0";
const DARK = "#2b2b2b";
const STAMP_RED = "#b3261e";
const BAG = "#b8895a";

/** Thief units → story pixels. */
const SCALE = 2.5;
const ENTER_AT = 1.2;
const WALK_IN = 2.6;
const WIND_UP_AT = 6.8;
const ZIP_AT = 7.15;
const POSES_PER_SECOND = 12;
const UPPER_ARM = 19;
const FOREARM = 18;

const clamp = (v: number, min = 0, max = 1) => Math.min(max, Math.max(min, v));
const smooth = (v: number) => {
  const t = clamp(v);
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerp2 = (a: Point, b: Point, t: number): Point => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
/** Eased 0→1 as `t` goes from `from` to `to`. */
const ramp = (t: number, from: number, to: number) => smooth((t - from) / (to - from));

export interface ThiefLayout {
  floorY: number;
  lines: StoryLine[];
  width: number;
}

interface Pose {
  tau: number;
  dir: number;
  px: number;
  py: number;
  lean: number;
  walk: number;
  cyc: number;
  footL: Point;
  footR: Point;
  headTilt: number;
  eye: number;
  face: "grin" | "";
  wink: boolean;
  squash: number;
  zip: number;
  windUp: number;
}

const JOINTS = [
  "pel",
  "chest",
  "head",
  "shL",
  "shR",
  "elL",
  "elR",
  "haL",
  "haR",
  "hipL",
  "hipR",
  "knL",
  "knR",
  "ftL",
  "ftR",
] as const;
type Joints = Record<(typeof JOINTS)[number], Point>;

/** Two-bone IK: returns [joint, end] reaching from `root` toward `target`. */
function solveLimb(root: Point, target: Point, upper: number, lower: number, bend: number): [Point, Point] {
  const dx = target[0] - root[0];
  const dy = target[1] - root[1];
  const dist = Math.hypot(dx, dy);
  const stretch = Math.min(1.45, Math.max(1, dist / (upper + lower - 2)));
  const a = upper * stretch;
  const b = lower * stretch;
  const reach = Math.max(Math.abs(a - b) + 0.1, Math.min(a + b - 0.1, dist));
  const angle = Math.atan2(dy, dx);
  const knee = Math.acos((a * a + reach * reach - b * b) / (2 * a * reach));
  return [
    [root[0] + a * Math.cos(angle + bend * knee), root[1] + a * Math.sin(angle + bend * knee)],
    [root[0] + Math.cos(angle) * reach, root[1] + Math.sin(angle) * reach],
  ];
}

/** Arm IK whose elbow points away from the body's centre line. */
function solveArm(shoulder: Point, hand: Point, centerX: number): [Point, Point] {
  const a = solveLimb(shoulder, hand, UPPER_ARM, FOREARM, 1);
  const b = solveLimb(shoulder, hand, UPPER_ARM, FOREARM, -1);
  return Math.abs(a[0][0] - centerX) >= Math.abs(b[0][0] - centerX) ? a : b;
}

/** Where the thief is and what he looks like at story time `time`. */
function poseAt(time: number, layout: ThiefLayout): Pose {
  const tau = time - ENTER_AT;
  const startX = (layout.width + 170) / SCALE;
  const walkDistance = startX - 780 / SCALE;
  let travelled: number;
  if (tau < WALK_IN) {
    const p = clamp(tau / WALK_IN);
    travelled = walkDistance * (1 - (1 - p) * (1 - p));
  } else if (tau < WIND_UP_AT) {
    travelled = walkDistance;
  } else if (tau < ZIP_AT) {
    travelled = walkDistance - 7 * Math.sin((Math.PI / 2) * clamp((tau - WIND_UP_AT) / (ZIP_AT - WIND_UP_AT)));
  } else {
    const p = clamp((tau - ZIP_AT) / 0.35);
    travelled = walkDistance - 7 + 395 * p * p * p;
  }
  const px = startX - travelled;
  const walk = tau < WALK_IN ? 1 - ramp(tau, 2.25, 2.7) : Number(tau > ZIP_AT);
  const windUp =
    tau >= WIND_UP_AT && tau < ZIP_AT ? Math.sin(Math.PI * clamp((tau - WIND_UP_AT) / (ZIP_AT - WIND_UP_AT))) : 0;
  const zip = Number(tau >= ZIP_AT && tau < 7.7);
  const stride = zip ? 40 : 24;
  const lift = zip ? 10 : 20;
  const foot = (phase: number, side: number): Point => {
    const steps = travelled / (2 * stride) + phase;
    const step = Math.floor(steps);
    const frac = steps - step;
    let fx: number;
    let up = 0;
    if (frac < 0.5) {
      fx = (step - phase) * 2 * stride + stride / 2;
    } else {
      const k = smooth((frac - 0.5) / 0.5);
      fx = lerp((step - phase) * 2 * stride + stride / 2, (step + 1 - phase) * 2 * stride + stride / 2, k);
      up = lift * Math.sin(Math.PI * k);
    }
    const planted: Point = [startX - fx + side * 3, -up];
    return lerp2([px + side * 9, 0], planted, walk);
  };
  const cyc = travelled / (2 * stride);
  const bob = walk * Math.max(0, Math.cos(4 * Math.PI * cyc));
  const bounce = walk * 3.2 * Math.abs(Math.sin(2 * Math.PI * cyc));
  const py = -(lerp(48, 43, walk) - 6 * windUp + bounce);
  const lean = -(walk * 7 + zip * 14) + windUp * 8;
  const squash = zip ? -0.22 : 0.06 * bob + 0.12 * windUp;
  let headTilt = walk * 3 * Math.sin(tau * 3.1);
  let eye = walk * 3 * Math.sin(tau * 2.4);
  let face: Pose["face"] = walk > 0.5 ? "grin" : "";
  let wink = false;
  if (tau >= WALK_IN && tau < 3.1) {
    eye = 0;
    headTilt = 0;
  }
  if (tau >= 3.1 && tau < 3.5) {
    eye = -3 * ramp(tau, 3.1, 3.25);
    headTilt = -8 * ramp(tau, 3.1, 3.3);
  }
  if (tau >= 3.5 && tau < 6.2) {
    eye = -3;
    headTilt = -6;
  }
  if (tau >= 6.2 && tau < WIND_UP_AT) {
    eye = 0;
    headTilt = 5 * ramp(tau, 6.2, 6.4);
    face = "grin";
    wink = tau > 6.3 && tau < 6.7;
  }
  if (tau >= WIND_UP_AT) {
    eye = -3;
    face = "grin";
  }
  return {
    tau,
    dir: -1,
    px,
    py,
    lean,
    walk,
    cyc,
    footL: foot(0, -1),
    footR: foot(0.5, 1),
    headTilt,
    eye,
    face,
    wink,
    squash,
    zip,
    windUp,
  };
}

interface Rig {
  J: Joints;
  lead: "L" | "R";
  pocketL: Point;
  pocketR: Point;
}

function buildRig(pose: Pose, hands: { lead: Point | null; trail: Point | null }): Rig {
  const lean = (pose.lean * Math.PI) / 180;
  const pel: Point = [pose.px, pose.py];
  const chest: Point = [pel[0] + Math.sin(lean) * 42, pel[1] - Math.cos(lean) * 42];
  const headAngle = lean + (pose.headTilt * Math.PI) / 180;
  const head: Point = [chest[0] + Math.sin(headAngle) * 20, chest[1] - Math.cos(headAngle) * 20];
  const shL: Point = [chest[0] - Math.cos(lean) * 12, chest[1] - Math.sin(lean) * 12];
  const shR: Point = [chest[0] + Math.cos(lean) * 12, chest[1] + Math.sin(lean) * 12];
  const hipL: Point = [pel[0] - 6, pel[1]];
  const hipR: Point = [pel[0] + 6, pel[1]];
  const lead = pose.dir < 0 ? "L" : "R";
  const pocketL: Point = [pel[0] - 14, pel[1] + 3];
  const pocketR: Point = [pel[0] + 14, pel[1] + 3];
  const handL = (lead === "L" ? hands.lead : hands.trail) ?? pocketL;
  const handR = (lead === "R" ? hands.lead : hands.trail) ?? pocketR;
  const [elL, haL] = solveArm(shL, handL, chest[0]);
  const [elR, haR] = solveArm(shR, handR, chest[0]);
  const kneeBend = pose.dir > 0 ? -1 : 1;
  const [knL, ftL] = solveLimb(hipL, pose.footL, 28, 26, kneeBend);
  const [knR, ftR] = solveLimb(hipR, pose.footR, 28, 26, kneeBend);
  return {
    J: { pel, chest, head, shL, shR, elL, elR, haL, haR, hipL, hipR, knL, knR, ftL, ftR },
    lead,
    pocketL,
    pocketR,
  };
}

/** A straight outlined segment (the torso). */
function drawSegment(ctx: Ctx, a: Point, b: Point, width: number, color: string): void {
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 5;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Burglar stripes across a straight segment. */
function drawStripes(ctx: Ctx, a: Point, b: Point, width: number, spacing: number): void {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (len < 1) return;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const half = width / 2 - 1.5;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "butt";
  for (let d = spacing / 2; d < len; d += spacing) {
    const x = a[0] + ux * d;
    const y = a[1] + uy * d;
    ctx.beginPath();
    ctx.moveTo(x - nx * half, y - ny * half);
    ctx.lineTo(x + nx * half, y + ny * half);
    ctx.stroke();
  }
}

/** A bent limb through `joint`, optionally striped. */
function drawLimb(ctx: Ctx, from: Point, joint: Point, to: Point, width: number, color: string, striped: boolean): void {
  const mid: Point = [(from[0] + to[0]) / 2, (from[1] + to[1]) / 2];
  const ctrl: Point = [joint[0] + (joint[0] - mid[0]) * 0.45, joint[1] + (joint[1] - mid[1]) * 0.45];
  const path = () => {
    ctx.beginPath();
    ctx.moveTo(from[0], from[1]);
    ctx.quadraticCurveTo(ctrl[0], ctrl[1], to[0], to[1]);
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  path();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 5;
  ctx.stroke();
  path();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  if (!striped) return;
  const at = (t: number): Point => [
    (1 - t) * (1 - t) * from[0] + 2 * (1 - t) * t * ctrl[0] + t * t * to[0],
    (1 - t) * (1 - t) * from[1] + 2 * (1 - t) * t * ctrl[1] + t * t * to[1],
  ];
  let total = 0;
  let prev = from;
  const samples: [number, Point][] = [];
  for (let k = 1; k <= 24; k++) {
    const p = at(k / 24);
    total += Math.hypot(p[0] - prev[0], p[1] - prev[1]);
    samples.push([total, p]);
    prev = p;
  }
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "butt";
  const half = width / 2 - 1.5;
  for (let d = 3; d < total - 2; d += 6) {
    const index = samples.findIndex(([s]) => s >= d);
    const cur = samples[Math.max(0, index)]?.[1];
    const before = samples[Math.max(0, index - 1)]?.[1] ?? from;
    if (!cur) continue;
    const dx = cur[0] - before[0];
    const dy = cur[1] - before[1];
    const len = Math.hypot(dx, dy) || 1;
    ctx.beginPath();
    ctx.moveTo(cur[0] + (dy / len) * half, cur[1] - (dx / len) * half);
    ctx.lineTo(cur[0] - (dy / len) * half, cur[1] + (dx / len) * half);
    ctx.stroke();
  }
}

function drawHand(ctx: Ctx, at: Point): void {
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(at[0], at[1], 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawThief(ctx: Ctx, J: Joints, pose: Pose, time: number, pocketed: { L: boolean; R: boolean }): void {
  drawLimb(ctx, J.hipL, J.knL, J.ftL, 11, DARK, false);
  drawLimb(ctx, J.hipR, J.knR, J.ftR, 11, DARK, false);
  ctx.fillStyle = INK;
  for (const [foot, knee] of [
    [J.ftL, J.knL],
    [J.ftR, J.knR],
  ] as const) {
    ctx.save();
    ctx.translate(foot[0], foot[1]);
    ctx.rotate(Math.atan2(foot[1] - knee[1], foot[0] - knee[0]) - Math.PI / 2);
    ctx.beginPath();
    ctx.ellipse(pose.dir * 3, 1, 8, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  drawSegment(ctx, J.pel, J.chest, 30, SHIRT);
  drawStripes(ctx, J.pel, J.chest, 30, 7);
  ctx.strokeStyle = "#555";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(J.pel[0] + side * 11, J.pel[1] - 1);
    ctx.lineTo(J.pel[0] + side * 15, J.pel[1] + 7);
    ctx.stroke();
  }
  drawLimb(ctx, J.shL, J.elL, J.haL, 11, SHIRT, true);
  drawLimb(ctx, J.shR, J.elR, J.haR, 11, SHIRT, true);

  const neck = Math.atan2(J.head[0] - J.chest[0], J.chest[1] - J.head[1]);
  ctx.save();
  ctx.translate(J.head[0], J.head[1]);
  ctx.rotate(neck);
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = INK;
  ctx.fillStyle = SKIN;
  for (const x of [-16, 16]) {
    ctx.beginPath();
    ctx.ellipse(x, 1, 3.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, 16, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Mask with fluttering ties.
  const back = -pose.dir;
  const flutter = Math.sin(time * 14) * 2;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(16 * back, -1);
  ctx.lineTo(24 * back, -4 + flutter);
  ctx.moveTo(16 * back, 1);
  ctx.lineTo(23 * back, 4 - flutter);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(-17, -7, 34, 12, 6);
  ctx.fill();
  ctx.fillStyle = SHIRT;
  for (const x of [-7, 7]) {
    ctx.beginPath();
    ctx.ellipse(x, -1, 4.6, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = INK;
  ctx.strokeStyle = INK;
  for (const x of [-7, 7]) {
    if (pose.wink && x === 7) {
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x - 3.5, -1);
      ctx.quadraticCurveTo(x, 1.5, x + 3.5, -1);
      ctx.stroke();
      continue;
    }
    ctx.beginPath();
    ctx.arc(x + pose.eye, -1, 1.8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.quadraticCurveTo(-2, 7, 1, 8);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (pose.face === "grin") {
    ctx.moveTo(-7, 10);
    ctx.quadraticCurveTo(0, 16, 8, 9);
  } else {
    ctx.moveTo(-5, 11);
    ctx.quadraticCurveTo(0, 14, 6, 10);
  }
  ctx.stroke();

  // Beanie, band and pom-pom.
  ctx.fillStyle = DARK;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(-16, -6);
  ctx.bezierCurveTo(-16, -24, 16, -24, 16, -6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#444";
  ctx.beginPath();
  ctx.roundRect(-17, -10, 34, 5, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#c0392b";
  ctx.beginPath();
  ctx.arc(0, -21, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  if (!pocketed.L) drawHand(ctx, J.haL);
  if (!pocketed.R) drawHand(ctx, J.haR);
}

/** The loot bag, fuller with every line dropped in. */
function drawBag(ctx: Ctx, at: Point, scale: number, open: number, fill: number, angle: number): void {
  if (scale <= 0.01) return;
  ctx.save();
  ctx.translate(at[0], at[1]);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  const w = 17 + fill * 5;
  const h = 30 + fill * 4;
  ctx.fillStyle = BAG;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.4;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(-7, 6);
  ctx.bezierCurveTo(-w - 4, 12, -w - 2, 6 + h, 0, 8 + h);
  ctx.bezierCurveTo(w + 2, 6 + h, w + 4, 12, 7, 6);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  if (open > 0.05) {
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.ellipse(0, 6, 8 + 5 * open, 2.5 + 3 * open, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.beginPath();
    ctx.moveTo(-5, 1);
    ctx.lineTo(0, 7);
    ctx.lineTo(5, 1);
    ctx.closePath();
    ctx.fillStyle = BAG;
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = "#7a5230";
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-6, 7);
    ctx.lineTo(6, 7);
    ctx.stroke();
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.ellipse(0, 12 + h * 0.55, 8, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = BAG;
  ctx.beginPath();
  ctx.ellipse(-3.6, 12 + h * 0.55, 2, 1.3, -0.15, 0, Math.PI * 2);
  ctx.ellipse(3.6, 12 + h * 0.55, 2, 1.3, 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** A prompt line, drawn in place or shrinking into the thief's hand. */
function drawLine(
  ctx: Ctx,
  line: StoryLine,
  anchor: number,
  at: Point,
  scale: number,
  angle: number,
  alpha: number,
): void {
  if (alpha <= 0 || scale <= 0.01) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(at[0], at[1]);
  ctx.rotate(angle);
  ctx.scale(scale, scale);
  ctx.font = line.font;
  ctx.fillStyle = line.color;
  ctx.fillText(line.text, -anchor, 10);
  ctx.restore();
}

/** The red STOLEN stamp that slams down at 9.2s. */
function drawStamp(ctx: Ctx, at: Point, time: number): void {
  const p = clamp((time - 9.2) / 0.28);
  if (p <= 0) return;
  const scale = p < 1 ? 1.7 - 0.7 * (1 - (1 - p) ** 3) : 1;
  ctx.save();
  ctx.translate(at[0], at[1]);
  ctx.rotate(-0.07);
  ctx.scale(scale, scale);
  ctx.globalAlpha = Math.min(1, p * 1.6) * 0.9;
  ctx.strokeStyle = STAMP_RED;
  ctx.fillStyle = STAMP_RED;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.roundRect(-190, -52, 380, 104, 14);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-178, -40, 356, 80, 9);
  ctx.stroke();
  ctx.font = `800 62px ${storyFonts().ui}, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.letterSpacing = "10px";
  ctx.fillText("STOLEN", 6, 3);
  ctx.letterSpacing = "0px";
  ctx.restore();
}

/** Small jitter per pose so the line work "boils" like hand-drawn animation. */
function boil(J: Joints, frame: number): Joints {
  const phase = frame % 3;
  const out = {} as Joints;
  JOINTS.forEach((key, i) => {
    const n = Math.sin((i + 1) * 12.9898 + phase * 78.233) * 43758.5453;
    const angle = (n - Math.floor(n)) * Math.PI * 2;
    out[key] = [J[key][0] + Math.cos(angle) * 0.7, J[key][1] + Math.sin(angle) * 0.7];
  });
  return out;
}

/** Dust cloud left behind when the thief zips off. */
function drawDust(ctx: Ctx, time: number, layout: ThiefLayout): void {
  const p = (time - ENTER_AT - ZIP_AT) / 0.75;
  if (p < 0 || p > 1) return;
  const y = layout.floorY - 18;
  ctx.save();
  ctx.globalAlpha = 1 - p;
  ctx.fillStyle = SHIRT;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  for (const [dx, dy, r] of [
    [-30, 0, 26],
    [0, -18, 32],
    [34, -4, 24],
    [12, 14, 20],
    [-10, -40, 18],
  ] as const) {
    ctx.beginPath();
    ctx.arc(780 + dx * (1 + p), y + dy * (1 + p * 0.6), r * (0.6 + p * 0.8), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawSpeedLines(ctx: Ctx, at: Point, dir: number, frame: number): void {
  ctx.save();
  ctx.strokeStyle = INK;
  ctx.lineCap = "round";
  ctx.globalAlpha = 0.75;
  [-150, -95, -40, 15, 70].forEach((dy, k) => {
    const wobble = ((frame + k) % 3) * 14;
    const len = 150 + ((k * 37) % 90) + wobble;
    ctx.lineWidth = k % 2 ? 3 : 5;
    ctx.beginPath();
    ctx.moveTo(at[0] - dir * 60, at[1] + dy);
    ctx.lineTo(at[0] - dir * (60 + len), at[1] + dy);
    ctx.stroke();
  });
  ctx.restore();
}

function stampPosition(lines: StoryLine[], layout: ThiefLayout): Point {
  const first = lines[0];
  if (!first) return [layout.width / 2, layout.floorY - 90];
  const lastY = lines[lines.length - 1]?.y ?? first.y;
  return [layout.width / 2, (first.y + lastY) / 2 - 10];
}

/** Paints the thief scene for story time `time` (source `Gn`). */
export function paintThief(ctx: Ctx, time: number, layout: ThiefLayout): void {
  const frame = Math.floor(time * POSES_PER_SECOND);
  const poseTime = frame / POSES_PER_SECOND;
  const pose = poseAt(poseTime, layout);
  const tau = pose.tau;
  const toScreen = (p: Point): Point => [p[0] * SCALE, layout.floorY + p[1] * SCALE];
  const toLocal = (p: Point): Point => [p[0] / SCALE, (p[1] - layout.floorY) / SCALE];
  const lines = layout.lines.slice(0, 2);
  const timings = lines.map((_, k) => ({ reach: 3.9 + k * 1.1, grab: 4.3 + k * 1.1, drop: 4.9 + k * 1.1 }));
  const dropped = timings.reduce((n, t) => n + Number(tau >= t.drop), 0);
  const lastDrop = timings.length ? (timings[timings.length - 1]?.drop ?? 3.9) : 3.9;
  const stow = ramp(tau, Math.max(lastDrop + 0.1, 5), Math.max(lastDrop + 0.6, 5.5));

  const rest = buildRig(pose, { lead: null, trail: null });
  const leadIsLeft = rest.lead === "L";
  const trailRest = leadIsLeft ? rest.J.haR : rest.J.haL;
  const leadRest = leadIsLeft ? rest.J.haL : rest.J.haR;
  const trailShoulder = leadIsLeft ? rest.J.shR : rest.J.shL;
  const bagLow: Point = [trailShoulder[0] - pose.dir * 10, trailShoulder[1] + 38];
  const bagHigh: Point = [trailShoulder[0] - pose.dir * 2, trailShoulder[1] - 20];
  const bagScale = ramp(tau, 3.5, 3.85);
  const raise = ramp(tau, 3.3, 3.6);
  let trailHand = lerp2(trailRest, lerp2(bagLow, bagHigh, stow), raise);
  if (tau > WIND_UP_AT) trailHand = [bagHigh[0], bagHigh[1] + 2 * Math.sin(4 * Math.PI * pose.cyc)];
  const bagMouth: Point = [trailHand[0], trailHand[1] + 6];
  const lineAnchor = (line: StoryLine): Point => [
    Math.min(line.x + 520, Math.max(line.x + 40, pose.px * SCALE + pose.dir * 70)),
    line.y - 10,
  ];

  let leadHand = leadRest;
  let from = leadRest;
  lines.forEach((line, k) => {
    const t = timings[k];
    if (!t) return;
    const target = toLocal(lineAnchor(line));
    if (tau >= t.reach) leadHand = lerp2(from, target, ramp(tau, t.reach, t.grab));
    if (tau >= t.grab) {
      const q = ramp(tau, t.grab, t.drop);
      leadHand = [lerp(target[0], bagMouth[0], q), lerp(target[1], bagMouth[1], q) - 14 * Math.sin(Math.PI * q)];
    }
    if (tau >= t.drop) leadHand = bagMouth;
    from = bagMouth;
  });
  if (tau >= lastDrop) leadHand = lerp2(bagMouth, leadRest, ramp(tau, lastDrop, lastDrop + 0.4));

  const rig = buildRig(pose, { lead: leadHand, trail: trailHand });
  const J = boil(rig.J, frame);
  const near = (a: Point, b: Point) => Math.hypot(a[0] - b[0], a[1] - b[1]) < 2.5;
  const pocketed = { L: near(rig.J.haL, rig.pocketL), R: near(rig.J.haR, rig.pocketR) };
  const leadHandDrawn = leadIsLeft ? J.haL : J.haR;
  const trailHandDrawn = leadIsLeft ? J.haR : J.haL;

  const flying: { line: StoryLine; at: Point; scale: number; angle: number; anchor: number }[] = [];
  lines.forEach((line, k) => {
    const t = timings[k];
    if (!t) return;
    const anchor = lineAnchor(line);
    if (tau < t.grab) {
      drawLine(ctx, line, anchor[0] - line.x, anchor, 1, 0, 1);
      return;
    }
    if (tau < t.drop) {
      const q = ramp(tau, t.grab, t.drop);
      flying.push({
        line,
        at: toScreen(leadHandDrawn),
        scale: lerp(1, 0.1, q),
        angle: pose.dir * -0.5 * q,
        anchor: anchor[0] - line.x,
      });
    }
  });

  if (tau < -0.2 || tau > 7.8) {
    drawStamp(ctx, stampPosition(lines, layout), time);
    return;
  }

  ctx.save();
  ctx.fillStyle = "rgba(40,28,15,0.16)";
  ctx.beginPath();
  ctx.ellipse(pose.px * SCALE, layout.floorY + 4, 58 * (pose.zip ? 1.6 : 1), 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  drawDust(ctx, poseTime, layout);
  if (pose.zip) drawSpeedLines(ctx, [pose.px * SCALE, layout.floorY - 120], pose.dir, frame);

  ctx.save();
  ctx.translate(0, layout.floorY);
  ctx.scale(SCALE, SCALE);
  if (pose.zip) {
    ctx.translate(pose.px, pose.py);
    ctx.scale(1.45, 0.84);
    ctx.translate(-pose.px, -pose.py);
  } else if (pose.squash) {
    ctx.translate(pose.px, 0);
    ctx.scale(1 + pose.squash, 1 - pose.squash);
    ctx.translate(-pose.px, 0);
  }
  const bagBehind = stow > 0.55;
  const bagAngle = bagBehind
    ? pose.dir * (0.35 + 0.08 * Math.sin(4 * Math.PI * pose.cyc))
    : 0.12 * Math.sin(tau * 5) * (1 - stow);
  if (bagBehind) drawBag(ctx, trailHandDrawn, bagScale, 0, dropped, bagAngle);
  drawThief(ctx, J, pose, poseTime, pocketed);
  if (!bagBehind) drawBag(ctx, trailHandDrawn, bagScale, Number(tau > 3.8 && stow < 0.2), dropped * 0.8, bagAngle);
  ctx.restore();

  for (const f of flying) drawLine(ctx, f.line, f.anchor, f.at, f.scale, f.angle, 1);
  drawStamp(ctx, stampPosition(lines, layout), time);
}
