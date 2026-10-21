// A paper slip with the start of the stolen prompt flies from where the steal
// happened into the vault presence pill, which squashes and shows "+1 loot"
// (source prompt-card chunk, export `r`). Styles: `.loot-slip*` in lootprompt.css.
import { prefersReducedMotion } from "../../gallery/lib";

const FALLBACK_INSET = 36;

export async function flyLootSlip(from: HTMLElement | DOMRect | null, text: string): Promise<void> {
  if (!from || prefersReducedMotion()) return;
  const start = from instanceof HTMLElement ? from.getBoundingClientRect() : from;

  const pill = document.querySelector<HTMLElement>(".vault-pill-body");
  const pillBox = pill?.getBoundingClientRect();
  const target = pill && pillBox && pillBox.bottom > 0 && pillBox.top < window.innerHeight ? pill : null;
  const end = target?.getBoundingClientRect();
  const dx = (end ? end.left + end.width / 2 : FALLBACK_INSET) - start.left - start.width / 2;
  const dy = (end ? end.top + end.height / 2 : window.innerHeight - FALLBACK_INSET) - start.top - start.height / 2;

  const slip = document.createElement("span");
  slip.className = "loot-slip";
  slip.textContent = text.replace(/\s+/g, " ").trim().slice(0, 26);
  slip.style.left = `${start.left + start.width / 2}px`;
  slip.style.top = `${start.top + start.height / 2}px`;
  document.body.append(slip);
  try {
    await slip.animate(
      [
        { transform: "translate(-50%,-50%) rotate(-8deg) scale(1)", opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx * 0.45}px),calc(-50% + ${dy * 0.32 - 90}px)) rotate(24deg) scale(.85)`,
          opacity: 1,
          offset: 0.45,
        },
        { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) rotate(50deg) scale(.15)`, opacity: 0 },
      ],
      { duration: 800, easing: "cubic-bezier(.35,.1,.7,1)", fill: "forwards" },
    ).finished;
  } finally {
    slip.remove();
  }
  if (!target) return;

  const chip = document.createElement("span");
  chip.className = "loot-slip-chip";
  chip.textContent = "+1 loot";
  target.parentElement?.append(chip);
  target
    .animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.12,.86)", offset: 0.35 },
        { transform: "scale(.97,1.05)", offset: 0.7 },
        { transform: "none" },
      ],
      { duration: 340 },
    )
    .finished.catch(() => {});
  window.setTimeout(() => chip.remove(), 1000);
}
