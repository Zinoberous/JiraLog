import {
  clearConnection,
  getConnection,
  normalizeBaseUrl,
  saveConnection,
  type JiraConnection,
} from "../lib/config.js";
import {
  saveUiPreferences,
  type ThemePreference,
  type LocalePreference,
} from "../lib/preferences.js";
import { t, resolveLocale, type AppLocale } from "../lib/i18n.js";
import { setupAppearance } from "../lib/ui-page.js";

const form = document.getElementById("form-conn") as HTMLFormElement;
const baseUrlInput = document.getElementById("base-url") as HTMLInputElement;
const emailInput = document.getElementById("email") as HTMLInputElement;
const tokenInput = document.getElementById("api-token") as HTMLInputElement;
const btnTest = document.getElementById("btn-test");
const btnClear = document.getElementById("btn-clear");
const messageEl = document.getElementById("form-message") as HTMLElement;
const themeSelect = document.getElementById("pref-theme") as HTMLSelectElement;
const localeSelect = document.getElementById("pref-locale") as HTMLSelectElement;

let currentLocale: AppLocale = "en";

function setMessage(text: string, kind: "neutral" | "ok" | "err") {
  messageEl.textContent = text;
  messageEl.classList.remove("form-message--ok", "form-message--err");
  if (kind === "ok") messageEl.classList.add("form-message--ok");
  if (kind === "err") messageEl.classList.add("form-message--err");
}

function applyOptionsI18n(locale: AppLocale): void {
  currentLocale = locale;
  document.documentElement.lang = locale;
  document.title = t(locale, "options.pageTitle");

  document.getElementById("appearance-heading")!.textContent = t(
    locale,
    "options.appearanceHeading",
  );
  document.getElementById("label-theme")!.textContent = t(locale, "theme.label");
  document.getElementById("label-locale")!.textContent = t(locale, "locale.label");

  themeSelect.options[0]!.text = t(locale, "theme.system");
  themeSelect.options[1]!.text = t(locale, "theme.light");
  themeSelect.options[2]!.text = t(locale, "theme.dark");

  localeSelect.options[0]!.text = t(locale, "locale.system");
  localeSelect.options[1]!.text = t(locale, "locale.de");
  localeSelect.options[2]!.text = t(locale, "locale.en");

  document.getElementById("connect-heading")!.textContent = t(
    locale,
    "options.connectHeading",
  );
  document.getElementById("intro-before")!.textContent = t(locale, "options.introBefore");
  document.getElementById("intro-link-text")!.textContent = t(locale, "options.introLink");
  document.getElementById("intro-after")!.textContent = t(locale, "options.introAfter");

  document.getElementById("label-base")!.textContent = t(locale, "options.baseUrl");
  document.getElementById("label-email")!.textContent = t(locale, "options.email");
  document.getElementById("label-token")!.textContent = t(locale, "options.apiToken");

  baseUrlInput.placeholder = t(locale, "options.placeholderBase");
  emailInput.placeholder = t(locale, "options.placeholderEmail");

  document.getElementById("btn-save")!.textContent = t(locale, "options.save");
  document.getElementById("btn-test")!.textContent = t(locale, "options.test");
  document.getElementById("btn-clear")!.textContent = t(locale, "options.clear");
  document.getElementById("link-about")!.textContent = t(locale, "options.footerInfo");

  void refreshTokenPlaceholder(locale);
}

async function refreshTokenPlaceholder(locale: AppLocale): Promise<void> {
  const existing = await getConnection();
  if (!tokenInput.value) {
    if (!existing) {
      tokenInput.placeholder = t(locale, "options.tokenPlaceholderNew");
    } else {
      tokenInput.placeholder = t(locale, "options.tokenPlaceholderUnchanged");
    }
  }
}

async function testConnection(conn: JiraConnection): Promise<void> {
  const auth = btoa(`${conn.email}:${conn.apiToken}`);
  const url = `${conn.baseUrl}/rest/api/3/myself`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
}

function readForm(existing: JiraConnection | null): JiraConnection | null {
  const baseUrl = normalizeBaseUrl(baseUrlInput.value);
  const email = emailInput.value.trim();
  let apiToken = tokenInput.value.trim();
  if (existing && !apiToken) {
    apiToken = existing.apiToken;
  }
  if (!baseUrl || !email || !apiToken) return null;
  return {
    baseUrl,
    authMethod: "api_token",
    email,
    apiToken,
  };
}

themeSelect.addEventListener("change", () => {
  void saveUiPreferences({
    theme: themeSelect.value as ThemePreference,
  });
});

localeSelect.addEventListener("change", () => {
  const locPref = localeSelect.value as LocalePreference;
  void saveUiPreferences({ locale: locPref }).then(() => {
    applyOptionsI18n(resolveLocale(locPref));
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const existing = await getConnection();
  const conn = readForm(existing);
  if (!conn) {
    setMessage(t(currentLocale, "msg.fillAll"), "err");
    return;
  }
  setMessage(t(currentLocale, "msg.saving"), "neutral");
  try {
    await testConnection(conn);
    await saveConnection(conn);
    tokenInput.value = "";
    applyOptionsI18n(currentLocale);
    tokenInput.placeholder = t(currentLocale, "options.tokenPlaceholderSaved");
    setMessage(t(currentLocale, "msg.savedOk"), "ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setMessage(`${t(currentLocale, "msg.errorPrefix")}${msg}`, "err");
  }
});

btnTest?.addEventListener("click", async () => {
  const existing = await getConnection();
  const conn = readForm(existing);
  if (!conn) {
    setMessage(t(currentLocale, "msg.fillAll"), "err");
    return;
  }
  setMessage(t(currentLocale, "msg.testing"), "neutral");
  try {
    await testConnection(conn);
    setMessage(t(currentLocale, "msg.testOk"), "ok");
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setMessage(`${t(currentLocale, "msg.testFailPrefix")}${msg}`, "err");
  }
});

btnClear?.addEventListener("click", async () => {
  await clearConnection();
  emailInput.value = "";
  baseUrlInput.value = "";
  tokenInput.value = "";
  applyOptionsI18n(currentLocale);
  setMessage(t(currentLocale, "msg.cleared"), "neutral");
});

setupAppearance((prefs) => {
  themeSelect.value = prefs.theme;
  localeSelect.value = prefs.locale;
  applyOptionsI18n(resolveLocale(prefs.locale));
});

void (async () => {
  const aboutLink = document.getElementById("link-about") as HTMLAnchorElement | null;
  if (aboutLink && chrome.runtime?.getURL) {
    aboutLink.href = chrome.runtime.getURL("about.html");
  }

  const existing = await getConnection();
  if (existing) {
    baseUrlInput.value = existing.baseUrl;
    emailInput.value = existing.email;
  }
})();
