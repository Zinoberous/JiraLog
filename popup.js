const storage = chrome.storage.local;

const defaults = {
  settings: {
    jiraHost: "",
    jiraEmail: "",
    jiraToken: "",
    themeMode: "system",
    languageMode: "system"
  },
  pinnedIssues: [],
  selectedDate: new Date().toISOString().slice(0, 10)
};

const state = {
  settings: { ...defaults.settings },
  pinnedIssues: [],
  me: null,
  isConnected: false,
  selectedDate: defaults.selectedDate,
  worklogs: [],
  selectedIssue: null,
  cachedIssues: []
};

const i18n = {
  de: {
    create: "Erstellen",
    total: "Gesamt",
    settings: "Einstellungen",
    theme: "Theme",
    language: "Sprache",
    save: "Speichern",
    createWorklog: "Worklog erstellen",
    ticket: "Ticket",
    duration: "Dauer",
    date: "Datum",
    comment: "Kommentar",
    cancel: "Abbrechen",
    infoText: "Schnelle tagesbezogene Worklog-Erfassung für Jira.",
    connected: "Verbunden",
    disconnected: "Nicht verbunden",
    configure: "Bitte zuerst Jira-Zugangsdaten speichern.",
    noWorklogs: "Keine Worklogs für diesen Tag gefunden.",
    loading: "Lade ...",
    saved: "Gespeichert.",
    loginOk: "Login erfolgreich.",
    loginFailed: "Login fehlgeschlagen.",
    deleteConfirm: "Worklog wirklich löschen?",
    invalidDuration: "Ungültige Dauer. Beispiele: 30m, 1h, 01:30",
    openJira: "Jira öffnen",
    delete: "Löschen",
    noComment: "Kein Kommentar",
    noTickets: "Keine Tickets gefunden.",
    pin: "Anpinnen",
    selectTicket: "Bitte ein Ticket auswählen."
  },
  en: {
    create: "Create",
    total: "Total",
    settings: "Settings",
    theme: "Theme",
    language: "Language",
    save: "Save",
    createWorklog: "Create worklog",
    ticket: "Issue",
    duration: "Duration",
    date: "Date",
    comment: "Comment",
    cancel: "Cancel",
    infoText: "Fast day-based Jira work logging from the browser popup.",
    connected: "Connected",
    disconnected: "Disconnected",
    configure: "Save Jira credentials first.",
    noWorklogs: "No worklogs found for this day.",
    loading: "Loading ...",
    saved: "Saved.",
    loginOk: "Login successful.",
    loginFailed: "Login failed.",
    deleteConfirm: "Delete worklog?",
    invalidDuration: "Invalid duration. Examples: 30m, 1h, 01:30",
    openJira: "Open Jira",
    delete: "Delete",
    noComment: "No comment",
    noTickets: "No issues found.",
    pin: "Pin",
    selectTicket: "Please select an issue."
  }
};

const $ = (id) => document.getElementById(id);

function getLanguage() {
  if (state.settings.languageMode === "de" || state.settings.languageMode === "en") {
    return state.settings.languageMode;
  }
  return navigator.language?.toLowerCase().startsWith("de") ? "de" : "en";
}

function t(key) {
  return i18n[getLanguage()][key] ?? key;
}

function applyLanguage() {
  document.documentElement.lang = getLanguage();
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  updateConnectionState();
}

function updateConnectionState() {
  const connectionState = $("connectionState");

  if (state.isConnected && state.me) {
    connectionState.removeAttribute("data-i18n");
    connectionState.textContent = `${t("connected")}: ${state.me.displayName ?? state.me.emailAddress}`;
    return;
  }

  connectionState.dataset.i18n = "disconnected";
  connectionState.textContent = t("disconnected");
}

function applyTheme() {
  const mode = state.settings.themeMode;
  const resolved = mode === "system"
    ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
    : mode;
  document.documentElement.dataset.theme = resolved;
}

function normalizeHost(host) {
  return host.trim().replace(/\/+$/, "");
}

function hasCredentials() {
  return Boolean(state.settings.jiraHost && state.settings.jiraEmail && state.settings.jiraToken);
}

function authHeader() {
  return "Basic " + btoa(`${state.settings.jiraEmail}:${state.settings.jiraToken}`);
}

async function jiraFetch(path, options = {}) {
  if (!hasCredentials()) {
    throw new Error(t("configure"));
  }

  const url = `${normalizeHost(state.settings.jiraHost)}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": authHeader(),
      "Accept": "application/json",
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text.slice(0, 300)}`);
  }

  if (response.status === 204) {
    return null;
  }

  return await response.json();
}

async function jiraSearch(jql, fields, maxResults = 50) {
  return await jiraFetch("/rest/api/3/search/jql", {
    method: "POST",
    body: JSON.stringify({
      jql,
      fields,
      maxResults
    })
  });
}

function showNotice(message, isError = false) {
  const notice = $("notice");
  notice.textContent = message;
  notice.classList.remove("hidden");
  notice.style.borderColor = isError ? "var(--danger)" : "var(--border)";
}

function hideNotice() {
  $("notice").classList.add("hidden");
}

function secondsToTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseDurationToSeconds(value) {
  const text = value.trim().toLowerCase().replace(",", ".");
  if (/^\d{1,2}:\d{2}$/.test(text)) {
    const [hours, minutes] = text.split(":").map(Number);
    return (hours * 3600) + (minutes * 60);
  }

  let seconds = 0;
  const regex = /(\d+(?:\.\d+)?)\s*(d|h|m)/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const amount = Number(match[1]);
    const unit = match[2];
    if (unit === "d") seconds += amount * 8 * 3600;
    if (unit === "h") seconds += amount * 3600;
    if (unit === "m") seconds += amount * 60;
  }

  if (seconds > 0) {
    return Math.round(seconds);
  }

  const minutes = Number(text);
  if (!Number.isNaN(minutes) && minutes > 0) {
    return Math.round(minutes * 60);
  }

  throw new Error(t("invalidDuration"));
}

function selectedDayRange() {
  const start = new Date(`${state.selectedDate}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function jiraStartedAt(date) {
  const local = new Date(`${date}T09:00:00`);
  const offset = -local.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  const hh = String(Math.floor(abs / 60)).padStart(2, "0");
  const mm = String(abs % 60).padStart(2, "0");
  return `${date}T09:00:00.000${sign}${hh}${mm}`;
}

function htmlToText(html) {
  const div = document.createElement("div");
  div.innerHTML = html;
  return div.innerText.trim();
}

function textToAdf(text) {
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => ({
    type: "paragraph",
    content: paragraph.split(/\n/).flatMap((line, index) => {
      const nodes = [];
      if (index > 0) {
        nodes.push({ type: "hardBreak" });
      }
      if (line.length > 0) {
        nodes.push({ type: "text", text: line });
      }
      return nodes;
    })
  }));

  return {
    type: "doc",
    version: 1,
    content: paragraphs.length > 0 ? paragraphs : [{ type: "paragraph" }]
  };
}

function adfToText(doc) {
  if (!doc) return "";
  if (typeof doc === "string") return doc;
  const lines = [];
  const walk = (node) => {
    if (!node) return;
    if (node.type === "text") lines.push(node.text);
    if (node.type === "hardBreak") lines.push("\n");
    if (Array.isArray(node.content)) node.content.forEach(walk);
    if (node.type === "paragraph") lines.push("\n");
  };
  walk(doc);
  return lines.join("").replace(/\n{3,}/g, "\n\n").trim();
}

async function loadState() {
  const data = await storage.get(defaults);
  state.settings = { ...defaults.settings, ...(data.settings ?? {}) };
  state.pinnedIssues = data.pinnedIssues ?? [];
  state.selectedDate = data.selectedDate ?? defaults.selectedDate;

  $("jiraHost").value = state.settings.jiraHost;
  $("jiraEmail").value = state.settings.jiraEmail;
  $("jiraToken").value = state.settings.jiraToken;
  $("themeMode").value = state.settings.themeMode;
  $("languageMode").value = state.settings.languageMode;
  $("selectedDate").value = state.selectedDate;
  $("worklogDate").value = state.selectedDate;
}

async function saveSettings() {
  state.settings = {
    jiraHost: normalizeHost($("jiraHost").value),
    jiraEmail: $("jiraEmail").value.trim(),
    jiraToken: $("jiraToken").value.trim(),
    themeMode: $("themeMode").value,
    languageMode: $("languageMode").value
  };
  await storage.set({ settings: state.settings });
  applyTheme();
  applyLanguage();

  const connected = await testLogin(false);
  if (connected) {
    setPage("worklogs");
    await loadWorklogs();
  }
}

function setPage(pageName) {
  if (pageName === "worklogs" && !state.isConnected) {
    pageName = "settings";
  }

  document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
  document.querySelectorAll(".tab").forEach(tab => tab.classList.remove("active"));
  $(`page${pageName[0].toUpperCase()}${pageName.slice(1)}`).classList.add("active");
  document.querySelector(`[data-page="${pageName}"]`).classList.add("active");
}

function updateNavigation() {
  const worklogTab = document.querySelector('[data-page="worklogs"]');
  const worklogPage = $("pageWorklogs");

  if (!state.isConnected) {
    worklogTab.hidden = true;
    worklogPage.hidden = true;

    if (worklogPage.classList.contains("active")) {
      setPage("settings");
    }

    return;
  }

  worklogTab.hidden = false;
  worklogPage.hidden = false;
}

async function testLogin(showResult = true) {
  try {
    state.me = await jiraFetch("/rest/api/3/myself");
    state.isConnected = true;
    updateConnectionState();
    updateNavigation();
    if (showResult) showNotice(t("loginOk"));
    return true;
  } catch (error) {
    state.me = null;
    state.isConnected = false;
    updateConnectionState();
    updateNavigation();
    setPage("settings");
    if (showResult) showNotice(`${t("loginFailed")} ${error.message}`, true);
    return false;
  }
}

async function loadWorklogs() {
  hideNotice();
  if (!state.isConnected) {
    return;
  }

  try {
    $("worklogList").innerHTML = `<div class="notice">${t("loading")}</div>`;
    if (!state.me) {
      await testLogin(false);
    }

    const jql = `worklogAuthor = currentUser() AND worklogDate = "${state.selectedDate}" ORDER BY updated DESC`;
    const data = await jiraSearch(jql, ["summary", "status", "worklog"], 50);
    const { start, end } = selectedDayRange();
    const worklogs = [];

    for (const issue of data.issues ?? []) {
      let worklogData = issue.fields.worklog;
      if ((worklogData?.total ?? 0) > (worklogData?.maxResults ?? 20)) {
        worklogData = await jiraFetch(`/rest/api/3/issue/${issue.key}/worklog`);
      }

      for (const worklog of worklogData?.worklogs ?? []) {
        const started = new Date(worklog.started);
        const authorAccountId = worklog.author?.accountId;
        if (started >= start && started < end && authorAccountId === state.me.accountId) {
          worklogs.push({ issue, worklog });
        }
      }
    }

    state.worklogs = worklogs.sort((a, b) => new Date(b.worklog.started) - new Date(a.worklog.started));
    renderWorklogs(state.worklogs);
  } catch (error) {
    renderWorklogs([]);
    showNotice(error.message, true);
  }
}

function renderWorklogs(worklogs) {
  const total = worklogs.reduce((sum, item) => sum + (item.worklog.timeSpentSeconds ?? 0), 0);
  $("totalTime").textContent = secondsToTime(total);

  if (worklogs.length === 0) {
    $("worklogList").innerHTML = `<div class="notice">${t("noWorklogs")}</div>`;
    return;
  }

  $("worklogList").innerHTML = worklogs.map((item, index) => {
    const issue = item.issue;
    const worklog = item.worklog;
    const status = issue.fields.status?.name ?? "";
    const statusClass = status.toLowerCase().includes("done") || status.toLowerCase().includes("erledigt") ? "done" : status.toLowerCase().includes("progress") || status.toLowerCase().includes("running") ? "progress" : "";
    const url = `${normalizeHost(state.settings.jiraHost)}/browse/${issue.key}`;
    const comment = adfToText(worklog.comment);
    return `
      <article class="worklog-card" data-index="${index}">
        <div class="worklog-row">
          <div class="issue-title" title="${escapeHtml(issue.key)} - ${escapeHtml(issue.fields.summary ?? "")}"><span class="issue-key">${escapeHtml(issue.key)}</span> - ${escapeHtml(issue.fields.summary ?? "")}</div>
          <div class="status ${statusClass}">${escapeHtml(status)}</div>
          <a class="icon-button" href="${url}" target="_blank" title="${t('openJira')}">↗</a>
          <div class="duration">${secondsToTime(worklog.timeSpentSeconds ?? 0)}</div>
          <div class="actions">
            <button class="icon-button toggle-comment" type="button" title="${t('comment')}">💬</button>
            <button class="icon-button delete-worklog" type="button" title="${t('delete')}">🗑</button>
          </div>
        </div>
        <div class="comment-panel hidden">
          <div class="comment-text">${escapeHtml(comment).replace(/\n/g, "<br>") || "<em>${t('noComment')}</em>"}</div>
        </div>
      </article>`;
  }).join("");
}

function escapeHtml(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

async function deleteWorklog(index) {
  const item = state.worklogs[index];
  if (!item || !confirm(t("deleteConfirm"))) return;
  await jiraFetch(`/rest/api/3/issue/${item.issue.key}/worklog/${item.worklog.id}`, { method: "DELETE" });
  await loadWorklogs();
}

function openCreateDialog() {
  state.selectedIssue = null;
  $("worklogDate").value = state.selectedDate;
  $("durationInput").value = "30m";
  $("commentEditor").innerHTML = "";
  $("ticketSearch").value = "";
  $("selectedTicket").classList.add("hidden");
  $("worklogDialog").showModal();
  loadTicketSuggestions("");
}

async function loadTicketSuggestions(query) {
  const resultContainer = $("ticketResults");
  resultContainer.innerHTML = `<div class="ticket-item">${t("loading")}</div>`;
  try {
    const issues = await searchIssues(query);
    state.cachedIssues = issues;
    renderTicketResults(issues);
  } catch (error) {
    resultContainer.innerHTML = `<div class="ticket-item">${escapeHtml(error.message)}</div>`;
  }
}

async function searchIssues(query) {
  const trimmed = query.trim();
  let jql;
  if (trimmed.length === 0) {
    const pinnedKeys = state.pinnedIssues.map(issue => issue.key);
    const pinnedPart = pinnedKeys.length > 0 ? `key in (${pinnedKeys.join(",")}) OR ` : "";
    jql = `(${pinnedPart}(assignee = currentUser() AND statusCategory != Done)) ORDER BY updated DESC`;
  } else {
    const safe = trimmed.replaceAll('"', '\\"');
    jql = `(issuekey = "${safe}" OR text ~ "${safe}*") AND statusCategory != Done ORDER BY updated DESC`;
  }

  const data = await jiraSearch(jql, ["summary", "status"], 25);
  const issues = data.issues ?? [];
  const pinnedKeys = new Set(state.pinnedIssues.map(issue => issue.key));
  const combined = [
    ...state.pinnedIssues.filter(p => !issues.some(i => i.key === p.key)),
    ...issues
  ];
  return combined.map(issue => ({ ...issue, pinned: pinnedKeys.has(issue.key) }));
}

function renderTicketResults(issues) {
  if (issues.length === 0) {
    $("ticketResults").innerHTML = `<div class="ticket-item">${t("noTickets")}</div>`;
    return;
  }

  $("ticketResults").innerHTML = issues.map((issue, index) => `
    <button class="ticket-item" type="button" data-index="${index}">
      <span class="issue-key">${escapeHtml(issue.key)}</span>
      <span>${escapeHtml(issue.fields?.summary ?? issue.summary ?? "")}</span>
      <span class="status">${escapeHtml(issue.fields?.status?.name ?? issue.status ?? "")}</span>
      <span class="pin-button ${issue.pinned ? "pinned" : ""}" data-pin-index="${index}" title="${t('pin')}">★</span>
    </button>`).join("");
}

async function togglePinned(issue) {
  const existing = state.pinnedIssues.findIndex(p => p.key === issue.key);
  if (existing >= 0) {
    state.pinnedIssues.splice(existing, 1);
  } else {
    state.pinnedIssues.unshift({
      key: issue.key,
      fields: {
        summary: issue.fields?.summary ?? issue.summary ?? "",
        status: issue.fields?.status ?? { name: issue.status ?? "" }
      }
    });
  }
  await storage.set({ pinnedIssues: state.pinnedIssues });
  await loadTicketSuggestions($("ticketSearch").value);
}

function selectIssue(issue) {
  state.selectedIssue = issue;
  const selected = $("selectedTicket");
  selected.innerHTML = `<strong>${escapeHtml(issue.key)}</strong> - ${escapeHtml(issue.fields?.summary ?? "")}`;
  selected.classList.remove("hidden");
}

async function createWorklog(event) {
  event.preventDefault();
  if (!state.selectedIssue) {
    showNotice(t("selectTicket"), true);
    return;
  }

  const seconds = parseDurationToSeconds($("durationInput").value);
  const text = htmlToText($("commentEditor").innerHTML);
  await jiraFetch(`/rest/api/3/issue/${state.selectedIssue.key}/worklog`, {
    method: "POST",
    body: JSON.stringify({
      started: jiraStartedAt($("worklogDate").value),
      timeSpentSeconds: seconds,
      comment: textToAdf(text)
    })
  });

  $("worklogDialog").close();
  state.selectedDate = $("worklogDate").value;
  $("selectedDate").value = state.selectedDate;
  await storage.set({ selectedDate: state.selectedDate });
  showNotice(t("saved"));
  await loadWorklogs();
}

function setupEvents() {
  document.querySelectorAll(".tab").forEach(tab => {
    tab.addEventListener("click", () => setPage(tab.dataset.page));
  });

  $("selectedDate").addEventListener("change", async () => {
    state.selectedDate = $("selectedDate").value;
    await storage.set({ selectedDate: state.selectedDate });
    await loadWorklogs();
  });

  $("settingsForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveSettings();
  });

  $("themeMode").addEventListener("change", async () => {
    state.settings.themeMode = $("themeMode").value;
    await storage.set({ settings: state.settings });
    applyTheme();
  });

  $("languageMode").addEventListener("change", async () => {
    state.settings.languageMode = $("languageMode").value;
    await storage.set({ settings: state.settings });
    applyLanguage();
  });

  $("createButton").addEventListener("click", openCreateDialog);
  $("closeDialogButton").addEventListener("click", () => $("worklogDialog").close());
  $("cancelDialogButton").addEventListener("click", () => $("worklogDialog").close());
  $("worklogForm").addEventListener("submit", createWorklog);

  let searchTimeout;
  $("ticketSearch").addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadTicketSuggestions($("ticketSearch").value), 300);
  });

  $("ticketResults").addEventListener("click", async (event) => {
    const pin = event.target.closest("[data-pin-index]");
    if (pin) {
      event.stopPropagation();
      await togglePinned(state.cachedIssues[Number(pin.dataset.pinIndex)]);
      return;
    }
    const item = event.target.closest(".ticket-item[data-index]");
    if (item) {
      selectIssue(state.cachedIssues[Number(item.dataset.index)]);
    }
  });

  $("worklogList").addEventListener("click", async (event) => {
    const card = event.target.closest(".worklog-card");
    if (!card) return;
    const index = Number(card.dataset.index);
    if (event.target.closest(".toggle-comment")) {
      card.querySelector(".comment-panel").classList.toggle("hidden");
    }
    if (event.target.closest(".delete-worklog")) {
      await deleteWorklog(index);
    }
  });

  document.querySelectorAll("[data-command]").forEach(button => {
    button.addEventListener("click", () => {
      document.execCommand(button.dataset.command, false, button.dataset.value ?? null);
      $("commentEditor").focus();
    });
  });

  $("linkButton").addEventListener("click", () => {
    const url = prompt("URL");
    if (url) {
      document.execCommand("createLink", false, url);
    }
  });

  matchMedia("(prefers-color-scheme: light)").addEventListener("change", applyTheme);
}

async function init() {
  await loadState();
  applyTheme();
  applyLanguage();
  setupEvents();
  updateNavigation();
  setPage("settings");

  if (hasCredentials()) {
    const connected = await testLogin(false);
    if (connected) {
      setPage("worklogs");
      await loadWorklogs();
    }
  }
}

init();
