import type { ThemePreference } from "./preferences.js";

export function getEffectiveTheme(pref: ThemePreference): "light" | "dark" {
  if (pref === "system") {
    return globalThis.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

export function applyTheme(pref: ThemePreference): void {
  const effective = getEffectiveTheme(pref);
  document.documentElement.dataset.theme = effective;
  document.documentElement.style.colorScheme = effective;
}

/** Re-apply when OS theme changes while preference is "system". */
export function watchSystemTheme(
  pref: ThemePreference,
  callback: () => void,
): () => void {
  if (pref !== "system") {
    return () => {};
  }
  const mq = globalThis.matchMedia("(prefers-color-scheme: dark)");
  const handler = () => callback();
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}
