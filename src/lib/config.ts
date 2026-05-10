/** Stored Jira Cloud connection (API token auth; OAuth can extend this later). */
export type AuthMethod = "api_token";

export interface JiraConnection {
  /** e.g. https://your-site.atlassian.net (no trailing slash) */
  baseUrl: string;
  authMethod: AuthMethod;
  /** Atlassian account email (used with API token) */
  email: string;
  /** Raw token; stored only in chrome.storage.local on this device */
  apiToken: string;
}

const STORAGE_KEY = "jiraConnection";

export async function getConnection(): Promise<JiraConnection | null> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const raw = data[STORAGE_KEY];
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Partial<JiraConnection>;
  if (
    typeof c.baseUrl !== "string" ||
    typeof c.email !== "string" ||
    typeof c.apiToken !== "string" ||
    c.authMethod !== "api_token"
  ) {
    return null;
  }
  return {
    baseUrl: normalizeBaseUrl(c.baseUrl),
    authMethod: "api_token",
    email: c.email.trim(),
    apiToken: c.apiToken,
  };
}

export async function saveConnection(connection: JiraConnection): Promise<void> {
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      ...connection,
      baseUrl: normalizeBaseUrl(connection.baseUrl),
    },
  });
}

export async function clearConnection(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEY);
}

export function normalizeBaseUrl(url: string): string {
  let u = url.trim();
  if (!u) return u;
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  return u.replace(/\/+$/, "");
}
