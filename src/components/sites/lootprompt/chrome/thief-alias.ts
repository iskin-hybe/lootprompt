import { readStorage, writeStorage } from "./use-hydrated";

// Anonymous per-tab identity on the vault floor (source `hf`): a random
// "<adjective> <noun>" alias plus a mask, kept in sessionStorage.

export type ThiefMaskVariant =
  | "classic"
  | "monocle"
  | "harlequin"
  | "cat-eye"
  | "bandit"
  | "domino"
  | "phantom"
  | "owl"
  | "fox";

export interface ThiefIdentity {
  alias: string;
  mask: string;
}

const ALIAS_KEY = "pda:thief-alias";
const MASK_KEY = "pda:thief-mask";

/** What the server (and the first client render) shows before the tab's identity loads. */
export const DEFAULT_IDENTITY: ThiefIdentity = { alias: "Velvet Crowbar", mask: "classic" };

const ADJECTIVES =
  "Velvet.Midnight.Silk-Glove.Quiet.Golden.Invisible.Clever.Crimson.Hushed.Roving.Dapper.Shadow.Moonlit.Slick.Masked.Secret.Lucky.Swift.Cinematic.Paper.Neon.Phantom.Silver.Rogue.Whispering.Electric.Stolen.Nocturnal.Careful.Wily.Hidden.Faint.Polished.Scarlet.Dusty.Mysterious.Tactical.Dusk.Feral.Satin.Cobalt.Brisk.Low-Key.Crooked.Nimble.Stealthy.Lunar.Cunning.Smoky.Razor-Sharp.Offbeat.Midair.Rare.Streetwise.Soft-Step.Black-Tie.Quick.Undercover.After-Hours.Unseen".split(
    ".",
  );

const NOUNS =
  "Crowbar.Locksmith.Bandit.Pickpocket.Safecracker.Cat Burglar.Lookout.Ringleader.Vault Ghost.Cutpurse.Key Thief.Artful Dodger.Night Fox.Sleight.Fence.Inside Job.Shadow Walker.Mask Maker.Floor Walker.Silk Thief.Codebreaker.Rogue Agent.Door Whisperer.Paper Tiger.Gem Runner.Quiet Hand.Keymaster.Back-Alley Ace.Heist Artist.False Bottom.Window Ghost.Pocket Wizard.Red Herring.Moon Runner.Ink Thief.The Decoy.Soft Touch.Alarm Dodger.Glove Ghost.Caper Chief.Sneak Artist.Lock Picker.Cloak Runner.Vault Runner.Quick Hand.Hidden Ace.Rooftop Fox.The Inside Man.Mask Bandit.Prompt Pirate.Shadow Fox.Slick Operator.Silent Partner.Night Operator.Floor Phantom.Secret Keeper.Paper Bandit.The Getaway.Whisper Thief.Clever Hands".split(
    ".",
  );

const MASKS: ThiefMaskVariant[] = [
  "classic",
  "monocle",
  "harlequin",
  "cat-eye",
  "bandit",
  "domino",
  "phantom",
  "owl",
  "fox",
];

const pick = <T,>(list: readonly T[]): T | undefined => list[Math.floor(Math.random() * list.length)];

let cached: ThiefIdentity | null = null;

/** This tab's alias and mask, created on first use. Client-only. */
export function getThiefIdentity(): ThiefIdentity {
  if (cached) return cached;
  const alias = readStorage("session", ALIAS_KEY);
  const mask = readStorage("session", MASK_KEY);
  if (alias && mask) {
    cached = { alias, mask };
    return cached;
  }
  const generated = {
    alias: `${pick(ADJECTIVES) ?? "Velvet"} ${pick(NOUNS) ?? "Crowbar"}`,
    mask: pick(MASKS) ?? "classic",
  };
  writeStorage("session", ALIAS_KEY, generated.alias);
  writeStorage("session", MASK_KEY, generated.mask);
  cached = generated;
  return cached;
}
