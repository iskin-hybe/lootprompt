// Minimal MP4 (ISO BMFF) writer for a single H.264 track coming out of WebCodecs'
// VideoEncoder with `avc: { format: "avc" }`. The source bundles the mp4-muxer
// library for this; the story only needs one video track written "fast start"
// (moov before mdat) in memory, which is what this does.

const TIMESCALE = 90_000;
const MOVIE_TIMESCALE = 1000;

interface Sample {
  data: Uint8Array;
  /** Presentation time in µs. */
  timestamp: number;
  duration: number;
  key: boolean;
}

const ascii = (s: string) => Uint8Array.from(s, (c) => c.charCodeAt(0));

function u8(n: number): Uint8Array {
  return Uint8Array.of(n & 0xff);
}
function u16(n: number): Uint8Array {
  return Uint8Array.of((n >>> 8) & 0xff, n & 0xff);
}
function u24(n: number): Uint8Array {
  return Uint8Array.of((n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff);
}
function u32(n: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setUint32(0, n >>> 0);
  return out;
}
function i32(n: number): Uint8Array {
  const out = new Uint8Array(4);
  new DataView(out.buffer).setInt32(0, n);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array {
  const size = parts.reduce((n, p) => n + p.byteLength, 0);
  const out = new Uint8Array(size);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.byteLength;
  }
  return out;
}

function box(type: string, ...parts: Uint8Array[]): Uint8Array {
  const body = concat(parts);
  return concat([u32(8 + body.byteLength), ascii(type), body]);
}

function fullBox(type: string, version: number, flags: number, ...parts: Uint8Array[]): Uint8Array {
  return box(type, u8(version), u24(flags), ...parts);
}

const MATRIX = concat([0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].map(u32));

/** Run-length encodes consecutive equal values into [count, value] pairs. */
function runs(values: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (const v of values) {
    const last = out[out.length - 1];
    if (last && last[1] === v) last[0] += 1;
    else out.push([1, v]);
  }
  return out;
}

function toBytes(source: AllowSharedBufferSource): Uint8Array {
  if (source instanceof ArrayBuffer) return new Uint8Array(source.slice(0));
  if (ArrayBuffer.isView(source)) {
    return new Uint8Array(source.buffer, source.byteOffset, source.byteLength).slice();
  }
  return new Uint8Array(source).slice();
}

const ticks = (us: number) => Math.round((us * TIMESCALE) / 1e6);

export class Mp4Writer {
  private readonly samples: Sample[] = [];
  private avcC: Uint8Array | null = null;

  constructor(
    private readonly width: number,
    private readonly height: number,
  ) {}

  /** Pass straight through as the VideoEncoder's `output` callback. */
  addChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void {
    const description = meta?.decoderConfig?.description;
    if (description && !this.avcC) this.avcC = toBytes(description);
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    this.samples.push({ data, timestamp: chunk.timestamp, duration: chunk.duration ?? 0, key: chunk.type === "key" });
  }

  /** The finished file. */
  finalize(): Uint8Array<ArrayBuffer> {
    if (!this.avcC || this.samples.length === 0) throw new Error("No encoded video");
    const first = Math.min(...this.samples.map((s) => s.timestamp));
    // Presentation times in decode order, offset so the first frame starts at 0.
    const pts = this.samples.map((s) => ticks(s.timestamp - first));
    // Decode times: the presentation times sorted (identical when there are no B-frames).
    const dts = [...pts].sort((a, b) => a - b);
    const reordered = pts.some((p, i) => p !== dts[i]);
    // Composition offsets must not be negative: delay decoding and trim it with an edit list.
    const shift = reordered ? Math.max(0, ...pts.map((p, i) => (dts[i] ?? 0) - p)) : 0;
    const decode = dts.map((d) => d - shift);
    const lastDuration = Math.max(1, ticks(this.samples[this.samples.length - 1]?.duration ?? 0));
    const deltas = decode.map((d, i) => (i + 1 < decode.length ? (decode[i + 1] ?? d) - d : lastDuration));
    const mediaDuration = deltas.reduce((a, b) => a + b, 0);
    const movieDuration = Math.round((mediaDuration * MOVIE_TIMESCALE) / TIMESCALE);

    const sizes = this.samples.map((s) => s.data.byteLength);
    const stts = runs(deltas);
    const ctts = reordered ? runs(pts.map((p, i) => p - (decode[i] ?? 0))) : null;
    const keyFrames = this.samples.flatMap((s, i) => (s.key ? [i + 1] : []));

    const ftyp = box("ftyp", ascii("isom"), u32(512), ascii("isom"), ascii("iso2"), ascii("avc1"), ascii("mp41"));

    const buildMoov = (chunkOffset: number) => {
      const sampleEntry = box(
        "avc1",
        new Uint8Array(6),
        u16(1),
        u16(0),
        u16(0),
        new Uint8Array(12),
        u16(this.width),
        u16(this.height),
        u32(0x00480000),
        u32(0x00480000),
        u32(0),
        u16(1),
        new Uint8Array(32),
        u16(0x0018),
        u16(0xffff),
        box("avcC", this.avcC ?? new Uint8Array()),
      );
      const stbl = box(
        "stbl",
        fullBox("stsd", 0, 0, u32(1), sampleEntry),
        fullBox("stts", 0, 0, u32(stts.length), ...stts.flatMap(([count, delta]) => [u32(count), u32(delta)])),
        ...(ctts
          ? [fullBox("ctts", 0, 0, u32(ctts.length), ...ctts.flatMap(([count, off]) => [u32(count), u32(off)]))]
          : []),
        fullBox("stss", 0, 0, u32(keyFrames.length), ...keyFrames.map(u32)),
        fullBox("stsc", 0, 0, u32(1), u32(1), u32(this.samples.length), u32(1)),
        fullBox("stsz", 0, 0, u32(0), u32(sizes.length), ...sizes.map(u32)),
        fullBox("stco", 0, 0, u32(1), u32(chunkOffset)),
      );
      const minf = box(
        "minf",
        fullBox("vmhd", 0, 1, u16(0), u16(0), u16(0), u16(0)),
        box("dinf", fullBox("dref", 0, 0, u32(1), fullBox("url ", 0, 1))),
        stbl,
      );
      const mdia = box(
        "mdia",
        fullBox("mdhd", 0, 0, u32(0), u32(0), u32(TIMESCALE), u32(mediaDuration), u16(0x55c4), u16(0)),
        fullBox("hdlr", 0, 0, u32(0), ascii("vide"), new Uint8Array(12), ascii("VideoHandler\0")),
        minf,
      );
      const tkhd = fullBox(
        "tkhd",
        0,
        3,
        u32(0),
        u32(0),
        u32(1),
        u32(0),
        u32(movieDuration),
        new Uint8Array(8),
        u16(0),
        u16(0),
        u16(0),
        u16(0),
        MATRIX,
        u32(this.width * 0x10000),
        u32(this.height * 0x10000),
      );
      const edts = shift
        ? [box("edts", fullBox("elst", 0, 0, u32(1), u32(movieDuration), i32(shift), u16(1), u16(0)))]
        : [];
      const mvhd = fullBox(
        "mvhd",
        0,
        0,
        u32(0),
        u32(0),
        u32(MOVIE_TIMESCALE),
        u32(movieDuration),
        u32(0x00010000),
        u16(0x0100),
        new Uint8Array(10),
        MATRIX,
        new Uint8Array(24),
        u32(2),
      );
      return box("moov", mvhd, box("trak", tkhd, ...edts, mdia));
    };

    const moovSize = buildMoov(0).byteLength;
    const moov = buildMoov(ftyp.byteLength + moovSize + 8);
    const payload = concat(this.samples.map((s) => s.data));
    const mdatHeader = concat([u32(8 + payload.byteLength), ascii("mdat")]);
    const out = new Uint8Array(ftyp.byteLength + moov.byteLength + mdatHeader.byteLength + payload.byteLength);
    let offset = 0;
    for (const part of [ftyp, moov, mdatHeader, payload]) {
      out.set(part, offset);
      offset += part.byteLength;
    }
    return out;
  }
}
