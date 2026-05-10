import { getUiPreferences, type UiPreferences } from "./preferences.js";
import { applyTheme, watchSystemTheme } from "./theme.js";

const PREF_KEY = "uiPreferences" as const;

/**
 * Applies theme, keeps system-theme media subscription in sync, and notifies on any saved pref change.
 */
export function setupAppearance(
  onPreferencesApplied: (prefs: UiPreferences) => void,
): () => void {
  let unwatch: () => void = () => {};

  function syncFromPrefs(prefs: UiPreferences): void {
    applyTheme(prefs.theme);
    unwatch();
    unwatch = watchSystemTheme(prefs.theme, () => {
      void getUiPreferences().then((p) => applyTheme(p.theme));
    });
    onPreferencesApplied(prefs);
  }

  void getUiPreferences().then(syncFromPrefs);

  const onStorageChanged: Parameters<
    typeof chrome.storage.onChanged.addListener
  >[0] = (changes, area) => {
    if (area !== "sync" && area !== "local") return;
    if (!changes[PREF_KEY]) return;
    void getUiPreferences().then(syncFromPrefs);
  };
  chrome.storage.onChanged.addListener(onStorageChanged);

  return () => {
    chrome.storage.onChanged.removeListener(onStorageChanged);
    unwatch();
  };
}
