import {
  saveUiPreferences,
  type ThemePreference,
  type LocalePreference,
} from "../lib/preferences.js";
import { t, resolveLocale, type AppLocale } from "../lib/i18n.js";
import { setupAppearance } from "../lib/ui-page.js";

const themeSelect = document.getElementById("about-pref-theme") as HTMLSelectElement;
const localeSelect = document.getElementById("about-pref-locale") as HTMLSelectElement;

function applyAboutI18n(locale: AppLocale): void {
  document.documentElement.lang = locale;
  document.title = t(locale, "about.pageTitle");

  document.getElementById("about-appearance-heading")!.textContent = t(
    locale,
    "options.appearanceHeading",
  );
  document.getElementById("about-label-theme")!.textContent = t(locale, "theme.label");
  document.getElementById("about-label-locale")!.textContent = t(locale, "locale.label");

  themeSelect.options[0]!.text = t(locale, "theme.system");
  themeSelect.options[1]!.text = t(locale, "theme.light");
  themeSelect.options[2]!.text = t(locale, "theme.dark");

  localeSelect.options[0]!.text = t(locale, "locale.system");
  localeSelect.options[1]!.text = t(locale, "locale.de");
  localeSelect.options[2]!.text = t(locale, "locale.en");

  document.getElementById("app-name")!.textContent = __APP_DISPLAY_NAME__;
  document.getElementById("app-desc")!.textContent = __APP_DESCRIPTION__;
  document.getElementById("meta-version")!.textContent = __APP_VERSION__;
  document.getElementById("meta-author")!.textContent = __APP_AUTHOR__;

  document.getElementById("label-version")!.textContent = t(locale, "about.version");
  document.getElementById("label-author")!.textContent = t(locale, "about.author");
  document.getElementById("label-license")!.textContent = t(locale, "about.license");

  document.getElementById("about-project-heading")!.textContent = t(
    locale,
    "about.projectHeading",
  );
  document.getElementById("about-project-body")!.textContent = t(locale, "about.projectBody");

  document.getElementById("link-settings")!.textContent = t(locale, "about.backSettings");
}

themeSelect.addEventListener("change", () => {
  void saveUiPreferences({
    theme: themeSelect.value as ThemePreference,
  });
});

localeSelect.addEventListener("change", () => {
  const locPref = localeSelect.value as LocalePreference;
  void saveUiPreferences({ locale: locPref }).then(() => {
    applyAboutI18n(resolveLocale(locPref));
  });
});

setupAppearance((prefs) => {
  themeSelect.value = prefs.theme;
  localeSelect.value = prefs.locale;
  applyAboutI18n(resolveLocale(prefs.locale));
});

const settingsLink = document.getElementById("link-settings") as HTMLAnchorElement | null;
if (settingsLink && chrome.runtime?.getURL) {
  settingsLink.href = chrome.runtime.getURL("options.html");
}
