/** UI preferences (no secrets – safe for sync). */
export type ThemePreference = "system" | "light" | "dark";
export type LocalePreference = "system" | "de" | "en";

export interface UiPreferences {
  theme: ThemePreference;
  locale: LocalePreference;
}

const STORAGE_KEY = "uiPreferences";

const DEFAULTS: UiPreferences = {
  theme: "system",
  locale: "system",
};

function normalizePrefs(raw: unknown): UiPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULTS };
  const o = raw as Record<string, unknown>;
  const theme =
    o.theme === "light" || o.theme === "dark" || o.theme === "system"
      ? o.theme
      : DEFAULTS.theme;
  const locale =
    o.locale === "de" || o.locale === "en" || o.locale === "system"
      ? o.locale
      : DEFAULTS.locale;
  return { theme, locale };
}

export async function getUiPreferences(): Promise<UiPreferences> {
  const [syncData, localData] = await Promise.all([
    chrome.storage.sync.get(STORAGE_KEY),
    chrome.storage.local.get(STORAGE_KEY),
  ]);
  const raw = syncData[STORAGE_KEY] ?? localData[STORAGE_KEY];
  return normalizePrefs(raw);
}

export async function saveUiPreferences(
  partial: Partial<UiPreferences>,
): Promise<void> {
  const current = await getUiPreferences();
  const next: UiPreferences = { ...current, ...partial };
  try {
    await chrome.storage.sync.set({ [STORAGE_KEY]: next });
  } catch {
    await chrome.storage.local.set({ [STORAGE_KEY]: next });
  }
}
