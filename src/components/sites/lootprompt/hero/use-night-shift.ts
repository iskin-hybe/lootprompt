"use client";

import { useEffect, useState } from "react";

/** The "night shift" runs from midnight to 5am on the visitor's clock. */
export function isNightShift(at: Date = new Date()): boolean {
  const hour = at.getHours();
  return hour >= 0 && hour < 5;
}

/**
 * Tracks the night shift on the real local clock (re-checked every minute and
 * when the tab becomes visible) and mirrors it to `<html data-night>`.
 */
export function useNightShift(): boolean {
  const [night, setNight] = useState(false);

  useEffect(() => {
    const check = () => {
      const isNight = isNightShift();
      setNight(isNight);
      const root = document.documentElement;
      if (isNight) root.dataset.night = "true";
      else delete root.dataset.night;
    };
    check();
    const timer = window.setInterval(check, 60_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);

  return night;
}
