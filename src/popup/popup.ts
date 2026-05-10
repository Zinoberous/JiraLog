import { getConnection } from "../lib/config.js";
import {
  saveUiPreferences,
  type ThemePreference,
  type LocalePreference,
} from "../lib/preferences.js";
import { t, resolveLocale, type AppLocale } from "../lib/i18n.js";
import { setupAppearance } from "../lib/ui-page.js";

const hint = document.getElementById("hint") as HTMLElement | null;
const mainPlaceholder = document.getElementById("main-placeholder") as HTMLElement | null;
const totalTime = document.getElementById("total-time") as HTMLElement | null;
const btnAbout = document.getElementById("btn-about") as HTMLButtonElement | null;
const btnSettings = document.getElementById("btn-settings") as HTMLButtonElement | null;
const themeSelect = document.getElementById("popup-pref-theme") as HTMLSelectElement;
const localeSelect = document.getElementById("popup-pref-locale") as HTMLSelectElement;

let currentLocale: AppLocale = "en";

function applyPopupI18n(locale: AppLocale): void {
  currentLocale = locale;
  document.documentElement.lang = locale;

  document.getElementById("popup-prefs-section")?.setAttribute(
    "aria-label",
    t(locale, "options.appearanceHeading"),
  );

  document.getElementById("popup-label-theme")!.textContent = t(locale, "theme.label");
  document.getElementById("popup-label-locale")!.textContent = t(locale, "locale.label");

  themeSelect.options[0]!.text = t(locale, "theme.system");
  themeSelect.options[1]!.text = t(locale, "theme.light");
  themeSelect.options[2]!.text = t(locale, "theme.dark");

  localeSelect.options[0]!.text = t(locale, "locale.system");
  localeSelect.options[1]!.text = t(locale, "locale.de");
  localeSelect.options[2]!.text = t(locale, "locale.en");

  if (totalTime) totalTime.textContent = t(locale, "popup.totalPreview");
  if (btnAbout) {
    btnAbout.textContent = t(locale, "popup.titleAbout");
    btnAbout.title = t(locale, "popup.titleAbout");
  }
  if (btnSettings) {
    btnSettings.title = t(locale, "popup.titleSettings");
  }
  if (mainPlaceholder) {
    mainPlaceholder.textContent = t(locale, "popup.mainPlaceholder");
  }
  void refreshHint();
}

async function refreshHint(): Promise<void> {
  if (!hint) return;
  const c = await getConnection();
  if (!c) {
    hint.textContent = t(currentLocale, "popup.hintNoConnection");
    return;
  }
  hint.textContent = t(currentLocale, "popup.hintConnected", { url: c.baseUrl });
}

btnAbout?.addEventListener("click", () => {
  const url = chrome.runtime.getURL("about.html");
  chrome.tabs.create({ url }).catch(() => {});
});

btnSettings?.addEventListener("click", () => {
  chrome.runtime.openOptionsPage().catch(() => {});
});

themeSelect.addEventListener("change", () => {
  void saveUiPreferences({
    theme: themeSelect.value as ThemePreference,
  });
});

localeSelect.addEventListener("change", () => {
  const locPref = localeSelect.value as LocalePreference;
  void saveUiPreferences({ locale: locPref }).then(() => {
    applyPopupI18n(resolveLocale(locPref));
  });
});

setupAppearance((prefs) => {
  themeSelect.value = prefs.theme;
  localeSelect.value = prefs.locale;
  applyPopupI18n(resolveLocale(prefs.locale));
});
