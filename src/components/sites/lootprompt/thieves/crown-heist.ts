// "Crown heist": a little masked burglar climbs up behind the #1 podium card,
// snatches the crown and either gets crushed by it, gets caught, or sees it
// spring back. Port of the source's canvas animation (keyframed pose + 2-bone
// IK for the arms, then a verlet ragdoll for the fall). Coordinates live in a
// 480×300 canvas whose point (240, 212) is the crown's anchor on the card top.

const INK = "#1f1a15";
const BONE = "#fdf8ee";
const SKIN = "#f2c9a0";
const BEANIE = "#2b2b2b";

const CANVAS_W = 480;
const CANVAS_H = 300;
/** Canvas x of the crown anchor. */
const ANCHOR_X = 240;
/** Canvas y of the card's top edge; nothing of the thief is drawn below it. */
const CARD_TOP = 212;

type Point = [number, number];

interface Pose {
  t: number;
  /** Pelvis position relative to the anchor. */
  px: number;
  py: number;
  /** Torso lean and head tilt, in degrees. */
  a: number;
  h: number;
  /** Pupil offset. */
  eye: number;
  /** Hand targets. */
  hL: Point;
  hR: Point;
  /** How far the hands follow the crown (0 = not at all, 1 = on it). */
  cr: number;
  /** Thigh and shin angles, in degrees. */
  thL: number;
  shL: number;
  thR: number;
  shR: number;
}

interface CrownPose {
  t: number;
  x: number;
  y: number;
  r: number;
}

type Keyed<T extends { t: number }> = Partial<T> & { t: number };

export type HeistEnding = "heavy" | "caught" | "spring";

interface EndingScript {
  keys: Keyed<Pose>[];
  crown: Keyed<CrownPose>[];
  /** When the ragdoll takes over. */
  rag?: number;
  /** Ragdoll impulse and spin. */
  imp?: Point;
  spin?: number;
  end: number;
  face: "" | "oh";
}

const easeInOutCubic = (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2);

/** Climb up, peek left and right, reach for the crown and lift it. */
const CLIMB_KEYS: Keyed<Pose>[] = [
  {
    t: 0,
    px: -62,
    py: 108,
    a: 0,
    h: 0,
    eye: 0,
    hL: [-80, 12],
    hR: [-44, 12],
    cr: 0,
    thL: -6,
    shL: 4,
    thR: 6,
    shR: -4,
  },
  { t: 0.5, py: 96, hL: [-78, -1] },
  { t: 0.9, py: 92, hR: [-46, -1] },
  { t: 1.5, py: 90 },
  { t: 2.3, py: 57 },
  { t: 2.7, h: -14, eye: -3 },
  { t: 3 },
  { t: 3.35, h: 14, eye: 3 },
  { t: 3.7, h: 0, eye: 0 },
  { t: 3.95, px: -58, py: 52, a: 8, hR: [-18, -11] },
  { t: 4.1 },
  { t: 4.3, px: -60, py: 55, a: -2, h: -8, hR: [-46, -1] },
  {
    t: 4.9,
    px: -46,
    py: 34,
    a: 0,
    h: 0,
    hL: [-60, -1],
    hR: [-30, -1],
    thL: -40,
    shL: 50,
  },
  {
    t: 5.4,
    px: -40,
    py: 29,
    a: 10,
    hL: [-21, -10],
    hR: [19, -10],
    cr: 1,
    thL: -10,
    shL: 10,
  },
  { t: 5.8, hL: [-21, -24], hR: [19, -24] },
  { t: 6.25, px: -38, a: 3, hL: [-55, -57], hR: [-15, -57] },
];

/** The crown wobbles when tapped, then is lifted off. */
const CROWN_KEYS: Keyed<CrownPose>[] = [
  { t: 0, x: 0, y: 0, r: 0 },
  { t: 4.02, r: 0 },
  { t: 4.1, r: 9 },
  { t: 4.18, r: -7 },
  { t: 4.26, r: 3 },
  { t: 4.34, r: 0 },
  { t: 5.4, x: 0, y: 0, r: 0 },
  { t: 5.8, y: -14, r: -6 },
  { t: 6.25, x: -35, y: -47, r: -10 },
];

const ENDINGS: Record<HeistEnding, EndingScript> = {
  // Too heavy: the thief topples backwards and the crown bounces home.
  heavy: {
    keys: [
      { t: 6.45, py: 33, a: -4 },
      { t: 6.6, py: 31, a: 5 },
    ],
    crown: [
      { t: 6.45, x: -35, y: -45, r: 8 },
      { t: 6.6, x: -31, y: -50, r: -13 },
      { t: 6.75, x: -28, y: -46, r: 10 },
      { t: 6.95, x: -12, y: -30, r: 24 },
      { t: 7.15, x: 0, y: 0, r: -5 },
      { t: 7.3, y: -6, r: 3 },
      { t: 7.45, x: 0, y: 0, r: 0 },
    ],
    rag: 6.75,
    imp: [-130, 40],
    spin: -1,
    end: 8.9,
    face: "oh",
  },
  // Caught: the #1 thief blinks, the burglar puts the crown back and slinks off.
  caught: {
    keys: [
      { t: 6.45 },
      { t: 7.05 },
      { t: 7.65, px: -40, py: 30, hL: [-21, -10], hR: [19, -10] },
      { t: 7.95, hL: [-50, -1], hR: [-28, -1], cr: 0 },
      { t: 8.2, px: -42, py: 33, h: 12, hL: [-68, -22], hR: [-14, -22] },
      { t: 8.4, h: 0, hL: [-52, -1], hR: [-30, -1] },
      { t: 8.8, py: 80, hL: [-60, 24], hR: [-32, -20] },
      { t: 8.95, hR: [-24, -24] },
      { t: 9.1, hR: [-36, -20] },
      { t: 9.25, hR: [-24, -24] },
      { t: 9.4, hR: [-36, -20] },
      { t: 9.8, py: 112, hR: [-32, 30] },
    ],
    crown: [
      { t: 6.45, x: -35, y: -47, r: -10 },
      { t: 7.05 },
      { t: 7.65, x: 0, y: 0, r: 4 },
      { t: 7.8, r: -3 },
      { t: 7.95, r: 0 },
    ],
    end: 9.9,
    face: "",
  },
  // Spring-loaded: the crown flips back onto the card, flinging the thief.
  spring: {
    keys: [{ t: 6.42 }],
    crown: [
      { t: 6.4, x: -35, y: -47, r: -10 },
      { t: 6.75, x: -22, y: -112, r: 170 },
      { t: 7.1, x: -8, y: -84, r: 345 },
      { t: 7.35, x: 0, y: 0, r: 362 },
      { t: 7.47, y: -5, r: 356 },
      { t: 7.57, x: 0, y: 0, r: 360 },
    ],
    rag: 6.45,
    imp: [-170, -90],
    spin: -1.4,
    end: 8.7,
    face: "oh",
  },
};

export const HEIST_ENDINGS: HeistEnding[] = ["heavy", "caught", "spring"];

/** Fill in each keyframe with the values carried over from earlier ones. */
function accumulate<T extends { t: number }>(keys: Keyed<T>[]): T[] {
  let current = {} as T;
  return keys.map((key) => (current = { ...current, ...key }));
}

/** Eased interpolation between the keyframes around time `t`. */
function sample<T extends { t: number }>(keys: T[], t: number): T {
  let index = 0;
  while (index < keys.length - 1 && keys[index + 1].t <= t) index++;
  const from = keys[index];
  const to = keys[Math.min(index + 1, keys.length - 1)];
  if (from === to || t <= from.t) return from;
  const k = easeInOutCubic(Math.min(1, (t - from.t) / (to.t - from.t)));
  const out: Record<string, number | Point> = {};
  const fromRecord = from as unknown as Record<string, number | Point>;
  const toRecord = to as unknown as Record<string, number | Point>;
  for (const name of Object.keys(fromRecord)) {
    const a = fromRecord[name];
    const b = toRecord[name] ?? a;
    out[name] = Array.isArray(a)
      ? [a[0] + ((b as Point)[0] - a[0]) * k, a[1] + ((b as Point)[1] - a[1]) * k]
      : a + ((b as number) - a) * k;
  }
  return out as unknown as T;
}

/** Unit direction for an angle measured from "straight down". */
const downAt = (angle: number): Point => [Math.sin(angle), Math.cos(angle)];

/** Two-bone IK: elbow and (reachable) hand for a shoulder reaching to `target`. */
function solveArm(shoulder: Point, target: Point, upper: number, lower: number, bend: number): [Point, Point] {
  const dx = target[0] - shoulder[0];
  const dy = target[1] - shoulder[1];
  const reach = Math.max(Math.abs(upper - lower) + 0.1, Math.min(upper + lower - 0.1, Math.hypot(dx, dy)));
  const heading = Math.atan2(dy, dx);
  const elbowAngle = Math.acos((upper * upper + reach * reach - lower * lower) / (2 * upper * reach));
  return [
    [shoulder[0] + upper * Math.cos(heading + bend * elbowAngle), shoulder[1] + upper * Math.sin(heading + bend * elbowAngle)],
    [shoulder[0] + Math.cos(heading) * reach, shoulder[1] + Math.sin(heading) * reach],
  ];
}

type JointName =
  | "pel"
  | "chest"
  | "head"
  | "shL"
  | "shR"
  | "elL"
  | "elR"
  | "haL"
  | "haR"
  | "hipL"
  | "hipR"
  | "knL"
  | "knR"
  | "ftL"
  | "ftR";

type Joints = Record<JointName, Point>;

/** Distance constraints that hold the ragdoll together. */
const BONES: [JointName, JointName][] = [
  ["pel", "chest"],
  ["chest", "head"],
  ["chest", "shL"],
  ["chest", "shR"],
  ["shL", "shR"],
  ["shL", "pel"],
  ["shR", "pel"],
  ["shL", "elL"],
  ["elL", "haL"],
  ["shR", "elR"],
  ["elR", "haR"],
  ["pel", "hipL"],
  ["pel", "hipR"],
  ["hipL", "hipR"],
  ["hipL", "chest"],
  ["hipR", "chest"],
  ["hipL", "knL"],
  ["knL", "ftL"],
  ["hipR", "knR"],
  ["knR", "ftR"],
  ["head", "shL"],
  ["head", "shR"],
];

interface Ragdoll {
  points: Record<JointName, { p: Point; q: Point }>;
  links: [JointName, JointName, number][];
}

export interface HeistFrame {
  t: number;
  J: Joints;
  eye: number;
  face: "" | "oh";
  crown: { x: number; y: number; r: number };
  alert: boolean;
  /** Sweat-drop progress 0..1, or -1 when not shown. */
  sweat: number;
  side: 1 | -1;
}

export class CrownThief {
  private t = 0;
  private prevJ: Joints | null = null;
  private curJ: Joints | null = null;
  private rag: Ragdoll | null = null;
  private blinked = false;
  /** 1 = climbs from the left of the crown, -1 = mirrored. */
  private readonly side: 1 | -1;
  private readonly ending: HeistEnding;
  /** Crown bottom relative to the card top. */
  private readonly crownDy: number;
  private readonly onBlink?: () => void;
  private readonly script: EndingScript;
  private readonly keys: Pose[];
  private readonly crownKeys: CrownPose[];

  constructor(side: 1 | -1, ending: HeistEnding, crownDy: number, onBlink?: () => void) {
    this.side = side;
    this.ending = ending;
    this.crownDy = crownDy;
    this.onBlink = onBlink;
    this.script = ENDINGS[ending];
    this.keys = accumulate<Pose>([...CLIMB_KEYS, ...this.script.keys]);
    this.crownKeys = accumulate<CrownPose>([...CROWN_KEYS, ...this.script.crown]);
  }

  get done(): boolean {
    return this.t >= this.script.end;
  }

  private worldX(x: number): number {
    return ANCHOR_X + x * this.side;
  }

  private worldY(y: number): number {
    return CARD_TOP + y;
  }

  private joints(pose: Pose, t: number): Joints {
    const side = this.side;
    const scramble = t > 0.5 && t < 1.5 ? Math.sin(t * 42) * 0.6 : 0;
    const hop = t > 0.95 && t < 1.8 ? Math.max(0, Math.sin(t * 22)) : 0;
    const breathe = t > 1.5 && t < 6.4 ? Math.sin(t * 3.2) * 0.9 : 0;
    const lean = ((pose.a * Math.PI) / 180) * side;
    const pelX = this.worldX(pose.px);
    const pelY = this.worldY(pose.py + breathe);
    const chestX = pelX + Math.sin(lean) * 42;
    const chestY = pelY - Math.cos(lean) * 42;
    const headAngle = lean + ((pose.h * Math.PI) / 180) * side;
    const across: Point = [Math.cos(lean), Math.sin(lean)];
    const shoulderL: Point = [chestX - across[0] * 12 * side, chestY - across[1] * 12 * side];
    const shoulderR: Point = [chestX + across[0] * 12 * side, chestY + across[1] * 12 * side];
    const lift = pose.cr * this.crownDy;
    const targetL: Point = [
      this.worldX(pose.hL[0]),
      this.worldY(pose.hL[1] + lift + scramble + (side > 0 ? -hop * 1.6 : 0)),
    ];
    const targetR: Point = [
      this.worldX(pose.hR[0]),
      this.worldY(pose.hR[1] + lift - scramble + (side < 0 ? -hop * 1.6 : 0)),
    ];
    const [elbowL, handL] = solveArm(shoulderL, targetL, 24, 23, -side);
    const [elbowR, handR] = solveArm(shoulderR, targetR, 24, 23, side);
    const hipL: Point = [pelX - across[0] * 7 * side, pelY - across[1] * 7 * side];
    const hipR: Point = [pelX + across[0] * 7 * side, pelY + across[1] * 7 * side];
    const thighL = ((pose.thL * Math.PI) / 180) * side;
    const thighR = ((pose.thR * Math.PI) / 180) * side;
    const kneeL: Point = [hipL[0] + downAt(thighL)[0] * 28, hipL[1] + downAt(thighL)[1] * 28];
    const kneeR: Point = [hipR[0] + downAt(thighR)[0] * 28, hipR[1] + downAt(thighR)[1] * 28];
    const shinL = thighL + ((pose.shL * Math.PI) / 180) * side;
    const shinR = thighR + ((pose.shR * Math.PI) / 180) * side;
    return {
      pel: [pelX, pelY],
      chest: [chestX, chestY],
      head: [chestX + Math.sin(headAngle) * 20, chestY - Math.cos(headAngle) * 20],
      shL: shoulderL,
      shR: shoulderR,
      elL: elbowL,
      elR: elbowR,
      haL: handL,
      haR: handR,
      hipL,
      hipR,
      knL: kneeL,
      knR: kneeR,
      ftL: [kneeL[0] + downAt(shinL)[0] * 26, kneeL[1] + downAt(shinL)[1] * 26],
      ftR: [kneeR[0] + downAt(shinR)[0] * 26, kneeR[1] + downAt(shinR)[1] * 26],
    };
  }

  private startRag(joints: Joints, dt: number) {
    const { imp, spin } = this.script;
    const side = this.side;
    const points = {} as Ragdoll["points"];
    for (const name of Object.keys(joints) as JointName[]) {
      const [x, y] = joints[name];
      const velocity: Point = this.prevJ
        ? [(x - this.prevJ[name][0]) / dt, (y - this.prevJ[name][1]) / dt]
        : [0, 0];
      const height = (joints.pel[1] - y) / 60;
      const kick: Point = [
        velocity[0] + (imp?.[0] ?? 0) * side + (spin ?? 0) * side * height * 90,
        velocity[1] + (imp?.[1] ?? 0),
      ];
      points[name] = { p: [x, y], q: [x - kick[0] / 120, y - kick[1] / 120] };
    }
    this.rag = {
      points,
      links: BONES.map(([a, b]) => [a, b, Math.hypot(joints[a][0] - joints[b][0], joints[a][1] - joints[b][1])]),
    };
  }

  private stepRag(rag: Ragdoll, dt: number): Joints {
    let remaining = dt;
    while (remaining > 0) {
      const step = Math.min(1 / 120, remaining);
      remaining -= step;
      for (const point of Object.values(rag.points)) {
        const vx = (point.p[0] - point.q[0]) * 0.996;
        const vy = (point.p[1] - point.q[1]) * 0.996;
        point.q = [point.p[0], point.p[1]];
        point.p[0] += vx;
        point.p[1] += vy + 1500 * step * step;
      }
      for (let iteration = 0; iteration < 8; iteration++) {
        for (const [a, b, length] of rag.links) {
          const pa = rag.points[a].p;
          const pb = rag.points[b].p;
          const dx = pb[0] - pa[0];
          const dy = pb[1] - pa[1];
          const distance = Math.hypot(dx, dy) || 0.001;
          const correction = ((distance - length) / distance) * 0.5;
          pa[0] += dx * correction;
          pa[1] += dy * correction;
          pb[0] -= dx * correction;
          pb[1] -= dy * correction;
        }
      }
    }
    const joints = {} as Joints;
    for (const name of Object.keys(rag.points) as JointName[]) joints[name] = rag.points[name].p;
    return joints;
  }

  step(dt: number): HeistFrame {
    this.t += dt;
    const t = this.t;
    const script = this.script;
    const pose = sample(this.keys, t);
    const crown = sample(this.crownKeys, t);
    let joints: Joints;
    if (script.rag !== undefined && t >= script.rag) {
      if (!this.rag) this.startRag(this.joints(pose, t), Math.max(dt, 0.001));
      joints = this.stepRag(this.rag as Ragdoll, dt);
    } else {
      joints = this.joints(pose, t);
      this.prevJ = this.curJ;
      this.curJ = joints;
    }
    if (this.ending === "caught" && !this.blinked && t > 6.5) {
      this.blinked = true;
      this.onBlink?.();
    }
    return {
      t,
      J: joints,
      eye: pose.eye,
      face: t > 6.4 ? script.face : "",
      crown: { x: ANCHOR_X + crown.x * this.side, y: CARD_TOP + this.crownDy + crown.y, r: crown.r * this.side },
      alert: this.ending === "caught" && t > 6.55 && t < 7.1,
      sweat: t > 4.3 && t < 4.9 ? (t - 4.3) / 0.6 : -1,
      side: this.side,
    };
  }
}

/** An outlined limb segment (ink edge under a coloured core). */
function drawLimb(ctx: CanvasRenderingContext2D, from: Point, to: Point, width: number, color: string) {
  ctx.lineCap = "round";
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 5;
  ctx.beginPath();
  ctx.moveTo(from[0], from[1]);
  ctx.lineTo(to[0], to[1]);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Breton stripes across a limb. */
function drawStripes(ctx: CanvasRenderingContext2D, from: Point, to: Point, width: number, gap: number) {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const ux = dx / length;
  const uy = dy / length;
  const nx = -uy;
  const ny = ux;
  const half = width / 2 - 1.5;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.6;
  ctx.lineCap = "butt";
  for (let along = gap / 2; along < length; along += gap) {
    const x = from[0] + ux * along;
    const y = from[1] + uy * along;
    ctx.beginPath();
    ctx.moveTo(x - nx * half, y - ny * half);
    ctx.lineTo(x + nx * half, y + ny * half);
    ctx.stroke();
  }
}

function drawHand(ctx: CanvasRenderingContext2D, at: Point) {
  ctx.fillStyle = SKIN;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(at[0], at[1], 5.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** The podium crown, drawn with its bottom-centre at (x, y). */
function drawCrown(ctx: CanvasRenderingContext2D, x: number, y: number, rotation: number, color: string, width = 52) {
  const scale = width / 54;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.scale(scale, scale);
  ctx.translate(-27, -26);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(4, 8);
  ctx.lineTo(14, 16);
  ctx.lineTo(26, 3);
  ctx.lineTo(38, 16);
  ctx.lineTo(50, 7);
  ctx.lineTo(46, 24);
  ctx.lineTo(9, 24);
  ctx.closePath();
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(10, 24);
  ctx.quadraticCurveTo(28, 21, 46, 24);
  ctx.stroke();
  ctx.restore();
}

/** Masked head with beanie, rotated to follow the neck. */
function drawHead(ctx: CanvasRenderingContext2D, frame: HeistFrame) {
  const { J, side, t } = frame;
  const tilt = Math.atan2(J.head[0] - J.chest[0], J.chest[1] - J.head[1]);
  ctx.save();
  ctx.translate(J.head[0], J.head[1]);
  ctx.rotate(tilt);
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
  // Mask ties flapping behind the head.
  const flap = Math.sin(t * 14) * 2;
  ctx.lineWidth = 3.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-16 * side, -1);
  ctx.lineTo(-24 * side, -4 + flap);
  ctx.moveTo(-16 * side, 1);
  ctx.lineTo(-23 * side, 4 - flap);
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.roundRect(-17, -7, 34, 12, 6);
  ctx.fill();
  ctx.fillStyle = BONE;
  for (const x of [-7, 7]) {
    ctx.beginPath();
    ctx.ellipse(x, -1, 4.6, 3.2, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = INK;
  const pupil = frame.face === "oh" ? 1.1 : 1.8;
  for (const x of [-7, 7]) {
    ctx.beginPath();
    ctx.arc(x + frame.eye * side, -1, pupil, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.quadraticCurveTo(-2, 7, 1, 8);
  ctx.stroke();
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  if (frame.face === "oh") {
    ctx.ellipse(1, 12.5, 2.5, 3, 0, 0, Math.PI * 2);
  } else {
    ctx.moveTo(-5, 11);
    ctx.quadraticCurveTo(0, 14, 6, 10);
  }
  ctx.stroke();
  ctx.fillStyle = BEANIE;
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
}

/** Paint one frame: the thief (clipped to above the card), the crown and FX. */
export function drawHeistFrame(
  ctx: CanvasRenderingContext2D,
  frame: HeistFrame,
  crownColor: string,
  crownWidth: number,
) {
  const { J, side } = frame;
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, CANVAS_W, CARD_TOP);
  ctx.clip();
  drawLimb(ctx, J.hipL, J.knL, 11, BEANIE);
  drawLimb(ctx, J.knL, J.ftL, 10, BEANIE);
  drawLimb(ctx, J.hipR, J.knR, 11, BEANIE);
  drawLimb(ctx, J.knR, J.ftR, 10, BEANIE);
  ctx.fillStyle = INK;
  for (const foot of [J.ftL, J.ftR]) {
    ctx.beginPath();
    ctx.ellipse(foot[0], foot[1], 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  drawLimb(ctx, J.pel, J.chest, 30, BONE);
  drawStripes(ctx, J.pel, J.chest, 30, 7);
  for (const [shoulder, elbow, hand] of [
    [J.shL, J.elL, J.haL],
    [J.shR, J.elR, J.haR],
  ]) {
    drawLimb(ctx, shoulder, elbow, 11, BONE);
    drawStripes(ctx, shoulder, elbow, 11, 6);
    drawLimb(ctx, elbow, hand, 10, BONE);
    drawStripes(ctx, elbow, hand, 10, 6);
  }
  drawHead(ctx, frame);
  drawHand(ctx, J.haL);
  drawHand(ctx, J.haR);
  ctx.restore();

  drawCrown(ctx, frame.crown.x, frame.crown.y, frame.crown.r, crownColor, crownWidth);

  if (frame.alert) {
    ctx.fillStyle = INK;
    ctx.font = "500 22px serif";
    ctx.textAlign = "center";
    ctx.fillText("!", J.head[0] + 14 * side, J.head[1] - 30);
  }
  if (frame.sweat >= 0) {
    const progress = frame.sweat;
    const x = J.head[0] + 17 * side;
    const y = J.head[1] - 8 + progress * 10;
    ctx.globalAlpha = 1 - progress;
    ctx.fillStyle = "#7fb7ff";
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.quadraticCurveTo(x + 4, y + 2, x, y + 3);
    ctx.quadraticCurveTo(x - 4, y + 2, x, y - 5);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

export const HEIST_CANVAS = { width: CANVAS_W, height: CANVAS_H, anchorX: ANCHOR_X, cardTop: CARD_TOP };
