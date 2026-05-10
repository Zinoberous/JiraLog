import type { LocalePreference } from "./preferences.js";

export type AppLocale = "de" | "en";

export type MessageKey =
  | "theme.label"
  | "theme.system"
  | "theme.light"
  | "theme.dark"
  | "locale.label"
  | "locale.system"
  | "locale.de"
  | "locale.en"
  | "options.pageTitle"
  | "options.connectHeading"
  | "options.introBefore"
  | "options.introLink"
  | "options.introAfter"
  | "options.baseUrl"
  | "options.email"
  | "options.apiToken"
  | "options.placeholderBase"
  | "options.placeholderEmail"
  | "options.tokenPlaceholderNew"
  | "options.tokenPlaceholderSaved"
  | "options.tokenPlaceholderUnchanged"
  | "options.save"
  | "options.test"
  | "options.clear"
  | "options.appearanceHeading"
  | "options.footerInfo"
  | "msg.fillAll"
  | "msg.saving"
  | "msg.savedOk"
  | "msg.errorPrefix"
  | "msg.testing"
  | "msg.testOk"
  | "msg.testFailPrefix"
  | "msg.cleared"
  | "popup.totalPreview"
  | "popup.titleAbout"
  | "popup.titleSettings"
  | "popup.hintNoConnection"
  | "popup.hintConnected"
  | "popup.mainPlaceholder"
  | "about.pageTitle"
  | "about.version"
  | "about.author"
  | "about.license"
  | "about.projectHeading"
  | "about.projectBody"
  | "about.backSettings";

const DE: Record<MessageKey, string> = {
  "theme.label": "Design",
  "theme.system": "Automatisch (System)",
  "theme.light": "Hell",
  "theme.dark": "Dunkel",
  "locale.label": "Sprache",
  "locale.system": "Automatisch (System)",
  "locale.de": "Deutsch",
  "locale.en": "English",
  "options.pageTitle": "JiraLog – Anmeldung",
  "options.connectHeading": "Jira Cloud verbinden",
  "options.introBefore": "Hinterlegen Sie Ihre Jira-Cloud-Basis-URL und ein ",
  "options.introLink": "Atlassian-API-Token",
  "options.introAfter":
    " (HTTP Basic: E-Mail + Token). Die Daten werden nur lokal in dieser Extension gespeichert (dieses Gerät). OAuth 3LO kann später ergänzt werden.",
  "options.baseUrl": "Jira-Basis-URL",
  "options.email": "E-Mail (Atlassian-Konto)",
  "options.apiToken": "API-Token",
  "options.placeholderBase": "https://ihre-firma.atlassian.net",
  "options.placeholderEmail": "name@firma.de",
  "options.tokenPlaceholderNew": "Token einfügen",
  "options.tokenPlaceholderSaved": "(gespeichert – neues Token optional eintragen)",
  "options.tokenPlaceholderUnchanged": "(unverändert lassen oder neues Token eintragen)",
  "options.save": "Speichern",
  "options.test": "Verbindung testen",
  "options.clear": "Zugangsdaten löschen",
  "options.appearanceHeading": "Darstellung & Sprache",
  "options.footerInfo": "Info & Version",
  "msg.fillAll": "Bitte alle Felder ausfüllen.",
  "msg.saving": "Speichern…",
  "msg.savedOk": "Gespeichert. Verbindung erfolgreich.",
  "msg.errorPrefix": "Fehler: ",
  "msg.testing": "Teste…",
  "msg.testOk": "Verbindung in Ordnung.",
  "msg.testFailPrefix": "Test fehlgeschlagen: ",
  "msg.cleared": "Zugangsdaten gelöscht.",
  "popup.totalPreview": "Gesamt: —",
  "popup.titleAbout": "Info",
  "popup.titleSettings": "Einstellungen & Jira",
  "popup.hintNoConnection":
    "Noch keine Verbindung. Öffnen Sie die Einstellungen und hinterlegen Sie den Jira-Zugang.",
  "popup.hintConnected": "Verbunden mit {{url}}",
  "popup.mainPlaceholder": "Worklog-Liste folgt. Zuerst unter Einstellungen mit Jira verbinden.",
  "about.pageTitle": "JiraLog – Info",
  "about.version": "Version",
  "about.author": "Autor",
  "about.license": "Lizenz",
  "about.projectHeading": "Projekt",
  "about.projectBody":
    "Quelltext und Issues: Repository-Link kann hier ergänzt werden (z. B. GitHub).",
  "about.backSettings": "Zurück zu den Einstellungen",
};

const EN: Record<MessageKey, string> = {
  "theme.label": "Theme",
  "theme.system": "Auto (system)",
  "theme.light": "Light",
  "theme.dark": "Dark",
  "locale.label": "Language",
  "locale.system": "Auto (system)",
  "locale.de": "German",
  "locale.en": "English",
  "options.pageTitle": "JiraLog – Sign in",
  "options.connectHeading": "Connect Jira Cloud",
  "options.introBefore": "Enter your Jira Cloud base URL and an ",
  "options.introLink": "Atlassian API token",
  "options.introAfter":
    " (HTTP Basic: email + token). Data is stored only locally in this extension on this device. OAuth 3LO may be added later.",
  "options.baseUrl": "Jira base URL",
  "options.email": "Email (Atlassian account)",
  "options.apiToken": "API token",
  "options.placeholderBase": "https://your-site.atlassian.net",
  "options.placeholderEmail": "you@company.com",
  "options.tokenPlaceholderNew": "Paste token",
  "options.tokenPlaceholderSaved": "(saved — optionally enter a new token)",
  "options.tokenPlaceholderUnchanged": "(leave unchanged or paste a new token)",
  "options.save": "Save",
  "options.test": "Test connection",
  "options.clear": "Clear credentials",
  "options.appearanceHeading": "Appearance & language",
  "options.footerInfo": "About & version",
  "msg.fillAll": "Please fill in all fields.",
  "msg.saving": "Saving…",
  "msg.savedOk": "Saved. Connection successful.",
  "msg.errorPrefix": "Error: ",
  "msg.testing": "Testing…",
  "msg.testOk": "Connection OK.",
  "msg.testFailPrefix": "Test failed: ",
  "msg.cleared": "Credentials removed.",
  "popup.totalPreview": "Total: —",
  "popup.titleAbout": "About",
  "popup.titleSettings": "Settings & Jira",
  "popup.hintNoConnection": "Not connected yet. Open settings and add your Jira credentials.",
  "popup.hintConnected": "Connected to {{url}}",
  "popup.mainPlaceholder": "Worklog list coming soon. Connect Jira in Settings first.",
  "about.pageTitle": "JiraLog – About",
  "about.version": "Version",
  "about.author": "Author",
  "about.license": "License",
  "about.projectHeading": "Project",
  "about.projectBody":
    "Source and issues: add a repository link here (e.g. GitHub).",
  "about.backSettings": "Back to settings",
};

const CATALOG: Record<AppLocale, Record<MessageKey, string>> = {
  de: DE,
  en: EN,
};

export function resolveLocale(pref: LocalePreference): AppLocale {
  if (pref === "de") return "de";
  if (pref === "en") return "en";
  const nav = navigator.language.toLowerCase();
  if (nav.startsWith("de")) return "de";
  return "en";
}

export function t(
  locale: AppLocale,
  key: MessageKey,
  vars?: Record<string, string>,
): string {
  let text = CATALOG[locale][key] ?? CATALOG.en[key] ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replaceAll(`{{${k}}}`, v);
    }
  }
  return text;
}
