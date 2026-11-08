const storage = chrome.storage.local;
const alarmName = "jira-issues-refresh";
const interval = 5 * 60 * 1000;
let refreshJob;

function configured(settings) {
  return Boolean(settings?.jiraEmail && settings.jiraToken &&
    /^https:\/\/[a-z0-9-]+\.atlassian\.net\/?$/i.test(settings.jiraHost ?? ""));
}

function sameCredentials(a, b) {
  return a?.jiraHost === b?.jiraHost && a?.jiraEmail === b?.jiraEmail && a?.jiraToken === b?.jiraToken;
}

async function updateBadge() {
  const { settings, issuesCache } = await storage.get(["settings", "issuesCache"]);
  const count = configured(settings) && issuesCache?.host === settings.jiraHost &&
    issuesCache.email === settings.jiraEmail ? issuesCache.issues.length : 0;
  await chrome.action.setBadgeText({ text: count > 999 ? "999+" : count ? String(count) : "" });
}

async function ensureAlarm() {
  const { settings } = await storage.get("settings");
  if (!configured(settings)) {
    await chrome.alarms.clear(alarmName);
  } else if (!await chrome.alarms.get(alarmName)) {
    await chrome.alarms.create(alarmName, { periodInMinutes: interval / 60000 });
  }
}

async function loadIssues(settings) {
  const url = new URL("/rest/api/3/search/jql", settings.jiraHost);
  const credentials = new TextEncoder().encode(`${settings.jiraEmail}:${settings.jiraToken}`);
  const authorization = "Basic " + btoa(String.fromCharCode(...credentials));
  const issues = new Map();
  const seenTokens = new Set();
  let nextPageToken;
  do {
    const response = await fetch(url, {
      method: "POST",
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: authorization, Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        jql: "assignee = currentUser() AND statusCategory != Done ORDER BY updated DESC, key ASC",
        fields: ["summary", "status", "priority", "duedate", "issuetype", "parent"],
        maxResults: 100,
        nextPageToken
      })
    });
    if (!response.ok) {
      const retry = response.headers.get("Retry-After");
      const retryAt = retry && (/^\d+$/.test(retry) ? Date.now() + Number(retry) * 1000 : Date.parse(retry));
      throw Object.assign(new Error(`HTTP ${response.status}`), { status: response.status, retryAt });
    }
    const page = await response.json();
    if (!Array.isArray(page.issues) || (page.isLast === false && !page.nextPageToken)) {
      throw new Error("invalidIssuesResponse");
    }
    for (const issue of page.issues) {
      const fields = issue.fields ?? {};
      issues.set(issue.key, {
        key: issue.key, summary: fields.summary, status: fields.status?.name,
        priority: fields.priority?.name, dueDate: fields.duedate, type: fields.issuetype?.name,
        parent: fields.parent?.key ? { key: fields.parent.key, summary: fields.parent.fields?.summary } : null
      });
    }
    nextPageToken = page.isLast ? undefined : page.nextPageToken;
    if (nextPageToken && seenTokens.has(nextPageToken)) throw new Error("invalidIssuesResponse");
    if (nextPageToken) seenTokens.add(nextPageToken);
  } while (nextPageToken);
  return [...issues.values()];
}

function refresh() {
  if (refreshJob) return refreshJob;
  refreshJob = (async () => {
    const { settings, issuesCache } = await storage.get(["settings", "issuesCache"]);
    if (!configured(settings)) return;
    const cache = issuesCache?.host === settings.jiraHost && issuesCache.email === settings.jiraEmail ? issuesCache : null;
    if (cache?.blocked || Date.now() < (cache?.nextRefreshAt ?? 0)) return;
    const scope = { host: settings.jiraHost, email: settings.jiraEmail };
    let result;
    try {
      const issues = await loadIssues(settings);
      result = { ...scope, issues, updatedAt: Date.now(), nextRefreshAt: Date.now() + interval };
    } catch (error) {
      const blocked = error.status === 401 || error.status === 403;
      result = {
        ...scope, issues: blocked ? [] : cache?.issues ?? [], updatedAt: blocked ? null : cache?.updatedAt ?? null,
        error: error.status ? error.message : "issuesRequestFailed", blocked,
        nextRefreshAt: Math.max(Date.now() + interval, error.retryAt || 0)
      };
    }
    const current = (await storage.get("settings")).settings;
    if (sameCredentials(settings, current)) await storage.set({ issuesCache: result });
  })().finally(() => { refreshJob = null; });
  return refreshJob;
}

async function startSync() {
  const { settings: current } = await storage.get("settings");
  const origin = configured(current) ? new URL(current.jiraHost).origin : null;
  if (!origin || !await chrome.permissions.contains({ origins: [`${origin}/*`] })) {
    await chrome.alarms.clear(alarmName);
    await chrome.action.setBadgeText({ text: "" });
    return;
  }
  await updateBadge();
  await ensureAlarm();
  await refresh();
  await updateBadge();
  const { settings, issuesCache } = await storage.get(["settings", "issuesCache"]);
  if (!configured(settings) || issuesCache?.blocked) {
    await chrome.alarms.clear(alarmName);
  } else {
    const when = issuesCache?.nextRefreshAt ?? Date.now() + interval;
    await chrome.alarms.create(alarmName, { when });
  }
}

function runSync() { return startSync().catch(console.error); }

chrome.runtime.onInstalled.addListener(runSync);
chrome.runtime.onStartup.addListener(runSync);
chrome.permissions.onAdded.addListener(runSync);
chrome.permissions.onRemoved.addListener(runSync);
chrome.alarms.onAlarm.addListener(alarm => {
  if (alarm.name === alarmName) return runSync();
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.settings &&
      !sameCredentials(changes.settings.oldValue, changes.settings.newValue)) {
    const pending = refreshJob;
    return Promise.resolve(pending).catch(console.error).then(runSync);
  }
});
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (sender.url !== chrome.runtime.getURL("popup.html") || message?.action !== "refreshIssues") return;
  startSync().then(() => reply({ ok: true }), () => reply({ ok: false }));
  return true;
});
