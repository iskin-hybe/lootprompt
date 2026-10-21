// The story video (source chunk `story-video`): the post plays on a floating 3D
// card while the thief steals the prompt. Encoded with WebCodecs to H.264 and
// written to MP4 in the browser; `startStoryPreview` drives the live thumbnail
// in the "Save as story" hint.
import { Mp4Writer } from "./mp4-writer";
import {
  STORY_CARD,
  STORY_H,
  STORY_W,
  deliverFile,
  loadStoryFonts,
  makeCanvas,
  makeProjector,
  paintBackdrop,
  paintCardEdge,
  paintCardFaceMesh,
  paintCardShadow,
  paintStolen,
  paintStoryText,
  roundRect,
  roundedOutline,
  storyCardSize,
  toRadians,
  type DeliverResult,
  type MakeCanvas,
  type Point,
  type Point3,
  type StoryPrompt,
  type StoryTextLayout,
} from "./story-card";
import { paintThief } from "./story-thief";

type Ctx = CanvasRenderingContext2D;

const FPS = 30;
const MAX_SECONDS = 30;
const PREVIEW_LOOP = 11.6;
const CODECS = ["avc1.640028", "avc1.4d0028", "avc1.640032"];

/** Smootherstep 0→1. */
const settleCurve = (v: number) => {
  const t = Math.min(1, Math.max(0, v));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

interface ProjectedPoint {
  x: number;
  y: number;
  /** 1 / perspective scale, for perspective-correct texturing. */
  w: number;
}
type Project3 = (p: Point3) => ProjectedPoint;
type FaceDrawer = (face: HTMLCanvasElement, project3: Project3, project: (p: Point3) => Point) => void;

/** The card's slow float: settles in over 1.6s, then drifts and lifts. */
function cardPose(time: number) {
  const card = STORY_CARD;
  const settle = settleCurve(time / 1.6);
  const turn = 2 * Math.PI;
  const lift = settle * (0.5 - 0.5 * Math.cos((turn * time) / 6.5));
  return {
    yaw: toRadians(card.yaw + settle * 5.5 * Math.sin((turn * time) / 8.5)),
    pitch: toRadians(card.pitch + settle * 2.6 * Math.sin((turn * time) / 10.5 + 1.1)),
    roll: toRadians(card.roll + settle * 1.3 * Math.sin((turn * time) / 12.5 + 0.4)),
    dy: -12 * lift,
    scale: 1 + 0.014 * lift,
    lift,
  };
}

/** Backdrop and text that never move (the count and prompt lines are animated). */
function paintStaticLayer(ctx: Ctx, make: MakeCanvas, prompt: StoryPrompt): StoryTextLayout {
  const card = STORY_CARD;
  paintBackdrop(ctx, make, card.cx - 120, card.cy - 260);
  return paintStoryText(ctx, prompt, { stolen: false, prompt: false });
}

function paintShadowLayer(ctx: Ctx, cw: number, ch: number): void {
  const card = STORY_CARD;
  const { project } = makeProjector(
    card.cx,
    card.cy,
    toRadians(card.yaw),
    toRadians(card.pitch),
    toRadians(card.roll),
    card.focal,
  );
  paintCardShadow(ctx, roundedOutline(cw / 2, ch / 2, card.radius, 0).map(project), card.cy);
}

/** The card face for one frame: media (cover-fit), shade, glare and a passing sheen. */
function paintVideoFace(
  ctx: Ctx,
  frame: CanvasImageSource,
  frameW: number,
  frameH: number,
  cw: number,
  ch: number,
  time: number,
): void {
  const r = STORY_CARD.radius;
  ctx.clearRect(0, 0, cw + 2, ch + 2);
  ctx.save();
  roundRect(ctx, 0, 0, cw, ch, r);
  ctx.clip();
  ctx.fillStyle = "#1f1a15";
  ctx.fillRect(0, 0, cw, ch);
  if (frameW > 0 && frameH > 0) {
    const s = Math.max(cw / frameW, ch / frameH);
    ctx.drawImage(frame, (cw - frameW * s) / 2, (ch - frameH * s) / 2, frameW * s, frameH * s);
  }
  const shade = ctx.createLinearGradient(0, 0, 0, ch);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(0.7, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(10,6,2,0.28)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, cw, ch);
  const glare = ctx.createLinearGradient(0, 0, cw, ch);
  glare.addColorStop(0, "rgba(255,255,255,0.14)");
  glare.addColorStop(0.3, "rgba(255,255,255,0.03)");
  glare.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = glare;
  ctx.fillRect(0, 0, cw, ch);
  const cycle = (((time - 0.4) % 7) + 7) % 7;
  if (cycle < 1.8) {
    const center = -0.35 + (cycle / 1.8) * 1.7;
    const sheen = ctx.createLinearGradient(0, 0, cw, ch);
    const stop = (offset: number, alpha: number) =>
      sheen.addColorStop(Math.min(1, Math.max(0, center + offset)), `rgba(255,255,255,${alpha})`);
    stop(-0.12, 0);
    stop(-0.03, 0.16);
    stop(0, 0.26);
    stop(0.03, 0.16);
    stop(0.12, 0);
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, cw, ch);
  }
  ctx.restore();
  roundRect(ctx, 1.5, 1.5, cw - 3, ch - 3, r - 1.5);
  ctx.strokeStyle = "rgba(255,255,255,0.55)";
  ctx.lineWidth = 3;
  ctx.stroke();
}

/** Composites one story frame. */
function paintFrame(
  ctx: Ctx,
  staticLayer: HTMLCanvasElement,
  shadowLayer: HTMLCanvasElement,
  face: HTMLCanvasElement,
  cw: number,
  ch: number,
  time: number,
  prompt: StoryPrompt,
  layout: StoryTextLayout,
  drawFace: FaceDrawer,
): void {
  const card = STORY_CARD;
  const pose = cardPose(time);
  const { rot } = makeProjector(0, 0, pose.yaw, pose.pitch, pose.roll, card.focal);
  const ox = card.cx;
  const oy = card.cy + pose.dy;
  const project3: Project3 = (p) => {
    const [x, y, z] = rot([p[0] * pose.scale, p[1] * pose.scale, p[2] * pose.scale]);
    const s = card.focal / (card.focal + z);
    return { x: ox + x * s, y: oy + y * s, w: 1 / s };
  };
  const project = (p: Point3): Point => {
    const q = project3(p);
    return [q.x, q.y];
  };
  ctx.drawImage(staticLayer, 0, 0);
  ctx.save();
  ctx.globalAlpha = 1 - 0.38 * pose.lift;
  ctx.translate(card.cx + 14 * pose.lift, card.cy + 22 * pose.lift);
  ctx.scale(1 + 0.05 * pose.lift, 1 + 0.05 * pose.lift);
  ctx.translate(-card.cx, -card.cy);
  ctx.drawImage(shadowLayer, 0, 0);
  ctx.restore();
  paintCardEdge(ctx, project, (cw / 2) * pose.scale, (ch / 2) * pose.scale, card.radius * pose.scale, card.depth);
  drawFace(face, project3, project);
  paintStolen(ctx, prompt.copyCount, layout.stolenAt, Math.min(1, Math.max(0, (time - 0.3) / 0.9)));
  paintThief(ctx, time, { floorY: STORY_H - 170, lines: layout.promptLines, width: STORY_W });
}

/** Affine triangle mesh (used by the preview, and when WebGL is unavailable). */
function meshFaceDrawer(ctx: Ctx, cw: number, ch: number): FaceDrawer {
  return (face, _project3, project) => paintCardFaceMesh(ctx, face, project, cw, ch, 12);
}

/** Perspective-correct card face through WebGL, composited onto `ctx`. */
function webglFaceDrawer(ctx: Ctx, cw: number, ch: number): FaceDrawer | null {
  const canvas = makeCanvas(STORY_W, STORY_H);
  const gl = canvas.getContext("webgl", {
    premultipliedAlpha: true,
    preserveDrawingBuffer: true,
    antialias: true,
    alpha: true,
  });
  if (!gl) return null;
  const compile = (type: number, source: string) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };
  const vertex = compile(
    gl.VERTEX_SHADER,
    "attribute vec4 a_pos;attribute vec2 a_uv;varying vec2 v_uv;void main(){gl_Position=a_pos;v_uv=a_uv;}",
  );
  const fragment = compile(
    gl.FRAGMENT_SHADER,
    "precision mediump float;varying vec2 v_uv;uniform sampler2D u_tex;void main(){gl_FragColor=texture2D(u_tex,v_uv);}",
  );
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!buffer || !texture) return null;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  const aPos = gl.getAttribLocation(program, "a_pos");
  const aUv = gl.getAttribLocation(program, "a_uv");
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aPos, 4, gl.FLOAT, false, 24, 0);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 24, 16);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.viewport(0, 0, STORY_W, STORY_H);
  const hw = cw / 2;
  const hh = ch / 2;
  const corners: [Point3, number, number][] = [
    [[-hw, -hh, 0], 0, 0],
    [[hw, -hh, 0], 1, 0],
    [[hw, hh, 0], 1, 1],
    [[-hw, hh, 0], 0, 1],
  ];
  const order = [0, 1, 2, 0, 2, 3];
  const vertices = new Float32Array(order.length * 6);
  return (face, project3) => {
    order.forEach((corner, i) => {
      const c = corners[corner];
      if (!c) return;
      const p = project3(c[0]);
      const x = (p.x / STORY_W) * 2 - 1;
      const y = 1 - (p.y / STORY_H) * 2;
      vertices.set([x * p.w, y * p.w, 0, p.w, c[1], c[2]], i * 6);
    });
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, face);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, order.length);
    ctx.drawImage(canvas, 0, 0);
  };
}

/* ---------- media sources ---------- */

/** Frames of the post for the card face. */
export interface StoryMedia {
  width: number;
  height: number;
  /** Clip length in seconds (0 for a still). */
  clip: number;
  frameAt: (time: number) => Promise<CanvasImageSource>;
  close: () => void;
}

/** A muted, hidden <video> that has its first frame ready. */
function loadVideo(url: string, loop: boolean): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = true;
    video.playsInline = true;
    video.loop = loop;
    video.preload = "auto";
    video.style.cssText = "position:fixed;left:0;top:0;width:2px;height:2px;opacity:0;pointer-events:none;";
    const cleanup = () => {
      video.removeEventListener("loadeddata", onReady);
      video.removeEventListener("error", onError);
    };
    const onReady = () => {
      cleanup();
      resolve(video);
    };
    const onError = () => {
      cleanup();
      video.remove();
      reject(new Error("Video could not be loaded"));
    };
    video.addEventListener("loadeddata", onReady);
    video.addEventListener("error", onError);
    video.src = url;
    document.body.appendChild(video);
  });
}

function seek(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve) => {
    let timer = 0;
    const done = () => {
      window.clearTimeout(timer);
      video.removeEventListener("seeked", done);
      resolve();
    };
    video.addEventListener("seeked", done);
    timer = window.setTimeout(done, 1500);
    video.currentTime = time;
  });
}

function releaseVideo(video: HTMLVideoElement): void {
  video.removeAttribute("src");
  video.load();
  video.remove();
}

/** Frame-accurate source for encoding: seeks the video to each frame time. */
function seekingVideoSource(video: HTMLVideoElement): StoryMedia {
  const clip = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  return {
    width: video.videoWidth,
    height: video.videoHeight,
    clip,
    async frameAt(time) {
      await seek(video, clip ? Math.min(time % clip, Math.max(0, clip - 0.001)) : 0);
      return video;
    },
    close: () => releaseVideo(video),
  };
}

function stillSource(image: CanvasImageSource, width: number, height: number): StoryMedia {
  return { width, height, clip: 0, frameAt: async () => image, close: () => undefined };
}

/**
 * The post's motion clip (the MP4 re-encode of the source GIF) for the hint's
 * live preview: it simply plays on a loop and each frame shows what is current.
 */
export async function loadPreviewMotion(url: string): Promise<StoryMedia | null> {
  try {
    const video = await loadVideo(url, true);
    await video.play().catch(() => undefined);
    return {
      width: video.videoWidth,
      height: video.videoHeight,
      clip: Number.isFinite(video.duration) ? video.duration : 0,
      frameAt: async () => video,
      close: () => releaseVideo(video),
    };
  } catch {
    return null;
  }
}

export interface StoryMediaSpec {
  videoUrl?: string;
  imageUrl?: string;
}

async function loadStoryMedia(spec: StoryMediaSpec & { posterUrl: string | null }): Promise<StoryMedia> {
  if (spec.videoUrl) return seekingVideoSource(await loadVideo(spec.videoUrl, false));
  const url = spec.imageUrl ?? spec.posterUrl;
  if (!url) throw new Error("No media for this story");
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Media request failed (${response.status})`);
  const bitmap = await createImageBitmap(await response.blob());
  return stillSource(bitmap, bitmap.width, bitmap.height);
}

/** Story length follows the clip, between 11 and 30 seconds. */
function storyDuration(clip: number): number {
  return clip > 0 ? Math.min(MAX_SECONDS, Math.max(11, clip)) : 11.6;
}

async function supportedCodec(): Promise<string | null> {
  if (typeof VideoEncoder === "undefined" || typeof VideoFrame === "undefined") return null;
  for (const codec of CODECS) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width: STORY_W,
        height: STORY_H,
        bitrate: 6e6,
        framerate: FPS,
      });
      if (support.supported) return codec;
    } catch {
      // try the next profile
    }
  }
  return null;
}

/** True when this browser can encode the H.264 story. */
export async function storyVideoSupported(): Promise<boolean> {
  return (await supportedCodec()) !== null;
}

/** Renders the story to an MP4 blob, reporting progress 0…1 (source `renderStoryVideo`). */
export async function renderStoryVideo(
  spec: StoryPrompt & StoryMediaSpec,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal,
): Promise<Blob> {
  const codec = await supportedCodec();
  if (!codec) throw new Error("Video encoding not supported");
  const media = await loadStoryMedia(spec);
  try {
    await loadStoryFonts();
    const duration = storyDuration(media.clip);
    const { cw, ch } = storyCardSize(media.width && media.height ? media.width / media.height : 9 / 16);
    const staticLayer = makeCanvas(STORY_W, STORY_H);
    const shadowLayer = makeCanvas(STORY_W, STORY_H);
    const output = makeCanvas(STORY_W, STORY_H);
    const face = makeCanvas(Math.ceil(cw) + 2, Math.ceil(ch) + 2);
    const staticCtx = staticLayer.getContext("2d");
    const shadowCtx = shadowLayer.getContext("2d");
    const outputCtx = output.getContext("2d");
    const faceCtx = face.getContext("2d");
    if (!staticCtx || !shadowCtx || !outputCtx || !faceCtx) throw new Error("Canvas unavailable");
    const layout = paintStaticLayer(staticCtx, makeCanvas, spec);
    paintShadowLayer(shadowCtx, cw, ch);
    const drawFace = webglFaceDrawer(outputCtx, cw, ch) ?? meshFaceDrawer(outputCtx, cw, ch);

    const writer = new Mp4Writer(STORY_W, STORY_H);
    let failure: unknown = null;
    const encoder = new VideoEncoder({
      output: (chunk, meta) => writer.addChunk(chunk, meta),
      error: (error) => {
        failure = error;
      },
    });
    encoder.configure({
      codec,
      width: STORY_W,
      height: STORY_H,
      bitrate: 6e6,
      framerate: FPS,
      avc: { format: "avc" },
    });
    const drain = async () => {
      while (encoder.encodeQueueSize > 4) await new Promise((resolve) => setTimeout(resolve, 4));
    };
    const frames = Math.max(1, Math.round(duration * FPS));
    for (let i = 0; i < frames; i++) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      if (failure) throw failure;
      const time = i / FPS;
      paintVideoFace(faceCtx, await media.frameAt(time), media.width, media.height, cw, ch, time);
      paintFrame(outputCtx, staticLayer, shadowLayer, face, cw, ch, time, spec, layout, drawFace);
      const frame = new VideoFrame(output, {
        timestamp: Math.round(time * 1e6),
        duration: Math.round(1e6 / FPS),
      });
      encoder.encode(frame, { keyFrame: i % 60 === 0 });
      frame.close();
      onProgress?.(Math.min(0.99, time / duration));
      await drain();
    }
    await encoder.flush();
    encoder.close();
    if (failure) throw failure;
    const file = writer.finalize();
    onProgress?.(1);
    return new Blob([file], { type: "video/mp4" });
  } finally {
    media.close();
  }
}

/** Shares or downloads the MP4 story (source `deliverStoryVideo`). */
export function deliverStoryVideo(blob: Blob, slug: string): Promise<DeliverResult> {
  return deliverFile(blob, `lootprompt-${slug}.mp4`, "video/mp4", 4000);
}

/**
 * Draws the story on loop into `canvas` at `fps` until the returned stop
 * function is called (the 150×267 thumbnail in the hint).
 */
export function startStoryPreview(
  canvas: HTMLCanvasElement,
  prompt: StoryPrompt,
  poster: HTMLImageElement | null,
  fps = 24,
  motion: StoryMedia | null = null,
): () => void {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => undefined;
  const frameW = motion?.width ?? poster?.naturalWidth ?? 0;
  const frameH = motion?.height ?? poster?.naturalHeight ?? 0;
  const { cw, ch } = storyCardSize(frameW && frameH ? frameW / frameH : 9 / 16);
  const staticLayer = makeCanvas(STORY_W, STORY_H);
  const shadowLayer = makeCanvas(STORY_W, STORY_H);
  const face = makeCanvas(Math.ceil(cw) + 2, Math.ceil(ch) + 2);
  const staticCtx = staticLayer.getContext("2d");
  const shadowCtx = shadowLayer.getContext("2d");
  const faceCtx = face.getContext("2d");
  if (!staticCtx || !shadowCtx || !faceCtx) return () => undefined;
  const layout = paintStaticLayer(staticCtx, makeCanvas, prompt);
  paintShadowLayer(shadowCtx, cw, ch);
  const drawFace = meshFaceDrawer(ctx, cw, ch);

  let raf = 0;
  let last = 0;
  let time = 0;
  let stopped = false;
  let fetching = false;
  let current: CanvasImageSource | null = motion ? null : poster;
  const fetchFrame = (t: number) => {
    if (!motion || fetching) return;
    fetching = true;
    motion
      .frameAt(t)
      .then((frame) => {
        current = frame;
      })
      .catch(() => undefined)
      .finally(() => {
        fetching = false;
      });
  };
  fetchFrame(0);

  const tick = (now: number) => {
    if (stopped) return;
    raf = requestAnimationFrame(tick);
    if (document.visibilityState !== "visible") {
      last = now;
      return;
    }
    const dt = last ? (now - last) / 1000 : 0;
    if (last && dt < 1 / fps) return;
    last = now;
    time = (time + Math.min(dt, 0.1)) % PREVIEW_LOOP;
    fetchFrame(time);
    const k = canvas.width / STORY_W;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);
    paintVideoFace(faceCtx, current ?? face, current ? frameW : 0, current ? frameH : 0, cw, ch, time);
    paintFrame(ctx, staticLayer, shadowLayer, face, cw, ch, time, prompt, layout, drawFace);
  };
  raf = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(raf);
  };
}
