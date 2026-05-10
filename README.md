# JiraLog

Browser extension (Manifest V3) for **Jira Cloud**: manage day-focused worklogs. The UI is currently a **popup** with a link to the **sign-in page** (base URL + API token) and an **about page** (version, author, description).

## Requirements

- [Node.js](https://nodejs.org/) 18+
- Jira **Cloud** (`*.atlassian.net`)

## Development

```bash
npm install
npm run build
```

Output goes to **`dist/`**. In Chrome/Edge: **Extensions** → **Developer mode** → **Load unpacked** → select the `dist` folder.

During active development:

```bash
npm run dev
```

(Reload the extension in the browser after each build.)

## Sign-in (API token)

1. Atlassian: [Create an API token](https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/).
2. In **extension options** (opened on first install or via the ⚙ icon in the popup): save base URL (`https://…atlassian.net`), Atlassian account email, and token.

Credentials are stored only in **`chrome.storage.local`** on this device (not synced). **OAuth 2.0 (3LO)** is planned for a later release.

## Appearance & language

- **Theme:** choose *Auto (system)*, *Light*, or *Dark*. With *Auto*, the UI follows `prefers-color-scheme` and updates when the OS theme changes.
- **Language:** *Auto (system)* picks German if the browser language starts with `de`, otherwise English; or fixed *Deutsch* / *English*.

These settings are stored in **`chrome.storage.sync`** (with a fallback to `local` if sync is unavailable) so they can follow you across signed-in browser profiles.

Controls: dropdowns in the **popup**, on the **about** page, and in the top **Settings** block.

## Project layout

| Path | Contents |
|------|----------|
| `src/manifest.json` | MV3 manifest; `package.json` overrides version/name/description at build time |
| `src/popup/` | Popup UI |
| `src/options/` | Sign-in & Jira connection |
| `src/about/` | About page (version, author, …) |
| `src/background/` | Service worker |
| `src/lib/config.ts` | Read/write stored connection |
| `src/lib/preferences.ts` | Theme and language preferences |
| `src/lib/theme.ts` | Apply light/dark, system mode |
| `src/lib/i18n.ts` | DE/EN strings |
| `src/lib/ui-page.ts` | Shared theme / storage wiring |

## Version & metadata

Shown on the **about** page and taken from `package.json` at build time: `version`, `author`, `description`, `displayName` (extension display name).

## License

MIT (see [LICENSE](LICENSE)).
