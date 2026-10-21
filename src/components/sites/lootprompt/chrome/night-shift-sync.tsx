"use client";

import { useNightShift } from "../hero/use-night-shift";

/** Keeps `<html data-night>` (the night-shift paper) in sync on every page, as the source's root does. */
export function NightShiftSync() {
  useNightShift();
  return null;
}
