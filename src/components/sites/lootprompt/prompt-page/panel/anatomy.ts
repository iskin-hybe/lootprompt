// "Prompt anatomy": long prompts written as `LABEL: …` lines or `[Stage n …]`
// headers split into colour-coded, collapsible sections (source route helpers G and J).

export interface AnatomySection {
  id: string;
  label: string;
  chip: string;
  kind: "intro" | "stage" | "label";
  body: string;
}

const LABEL_LINE = /^\s*([A-Z][A-Z0-9 &/_-]{1,40}):\s*(.*)$/;
const STAGE_LINE = /^\s*\[\s*stage\s*(\d+)[^\]]*\]\s*$/i;
const MIN_SECTIONS = 3;
const MIN_LENGTH = 160;

const LABEL_COLORS = [
  "oklch(0.52 0.08 45)",
  "oklch(0.5 0.06 150)",
  "oklch(0.48 0.07 250)",
  "oklch(0.5 0.08 330)",
  "oklch(0.55 0.08 85)",
];
const INTRO_COLOR = "oklch(0.45 0.03 60)";
const STAGE_COLOR = "oklch(0.47 0.06 200)";

function introSection(): AnatomySection {
  return { id: "intro", label: "Intro", chip: "Intro", kind: "intro", body: "" };
}

/** Splits a prompt into sections, or returns null when it doesn't read as one. */
export function parseAnatomy(text: string): AnatomySection[] | null {
  const trimmed = text.trim();
  if (trimmed.length < MIN_LENGTH || trimmed.startsWith("{") || trimmed.startsWith("[{") || /^\[\s*"/.test(trimmed)) {
    return null;
  }

  const sections: AnatomySection[] = [];
  let current: AnatomySection | null = null;
  const lines: string[] = [];
  const flush = () => {
    if (current) {
      current.body = lines.join("\n").replace(/^\n+|\n+$/g, "");
      sections.push(current);
    }
    lines.length = 0;
  };

  for (const line of text.split(/\r?\n/)) {
    const stage = STAGE_LINE.exec(line);
    const label = stage ? null : LABEL_LINE.exec(line);
    if (!stage && !label) {
      lines.push(line);
      continue;
    }
    if (current || lines.some((l) => l.trim())) {
      current ??= introSection();
      flush();
    }
    const id = `s${sections.length}`;
    if (stage) {
      current = { id, label: line.trim().replace(/^\[|\]$/g, ""), chip: `Stage ${stage[1]}`, kind: "stage", body: "" };
    } else if (label) {
      const name = label[1].trim();
      current = { id, label: name, chip: name, kind: "label", body: "" };
      if (label[2]) lines.push(label[2]);
    }
  }

  if (!current && sections.length === 0) return null;
  current ??= introSection();
  flush();

  const kept = sections.filter((section) => section.body.trim() || section.kind !== "intro");
  return kept.length >= MIN_SECTIONS ? kept : null;
}

/** Stable colour per section label (stages and the intro have their own). */
export function sectionColor(section: AnatomySection): string {
  if (section.kind === "stage") return STAGE_COLOR;
  if (section.kind === "intro") return INTRO_COLOR;
  let hash = 0;
  for (const char of section.label) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return LABEL_COLORS[hash % LABEL_COLORS.length];
}
