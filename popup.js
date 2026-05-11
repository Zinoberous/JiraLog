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
    selectTicket: "Bitte ein Ticket auswählen.",
    searchTickets: "Tickets suchen ..."
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
    selectTicket: "Please select an issue.",
    searchTickets: "Search issues ..."
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
  updateTicketSearchPlaceholder();
  updateConnectionState();
  rerenderLocalizedDynamicContent();
}

function updateTicketSearchPlaceholder() {
  const searchInput = $("ticketSearch");
  if (searchInput) {
    searchInput.placeholder = t("searchTickets");
  }
}

function setTicketDropdownLabel(issue = null) {
  const label = $("ticketDropdownLabel");
  const typeIcon = $("ticketDropdownTypeIcon");
  if (!label) {
    return;
  }

  if (!issue) {
    label.textContent = t("ticket");
    if (typeIcon) {
      typeIcon.hidden = true;
      typeIcon.src = "";
      typeIcon.alt = "";
      typeIcon.title = "";
    }
    return;
  }

  const summary = issue.fields?.summary ?? issue.summary ?? "";
  label.textContent = `${issue.key} - ${summary}`;

  if (typeIcon) {
    const issueType = getIssueTypeInfo(issue);
    if (issueType.iconUrl) {
      typeIcon.hidden = false;
      typeIcon.src = issueType.iconUrl;
      typeIcon.alt = issueType.name;
      typeIcon.title = issueType.name;
    } else {
      typeIcon.hidden = true;
      typeIcon.src = "";
      typeIcon.alt = "";
      typeIcon.title = "";
    }
  }
}

function getIssueTypeInfo(issue) {
  const issueType = issue?.fields?.issuetype ?? issue?.issuetype ?? null;
  return {
    name: issueType?.name ?? "",
    iconUrl: issueType?.iconUrl ?? ""
  };
}

function materialIcon(iconId, className = "mi") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true"><use href="#${iconId}" /></svg>`;
}

function getJiraStatusPalette(status) {
  const colorName = String(status?.statusCategory?.colorName ?? "").toLowerCase();
  const categoryKey = String(status?.statusCategory?.key ?? "").toLowerCase();

  const palettes = {
    "medium-gray": { bg: "#DFE1E6", fg: "#172B4D", border: "#C1C7D0" },
    "green": { bg: "#E3FCEF", fg: "#006644", border: "#ABF5D1" },
    "yellow": { bg: "#FFFAE6", fg: "#7A5D00", border: "#FFE380" },
    "brown": { bg: "#FFEBE6", fg: "#BF2600", border: "#FFBDAD" },
    "warm-red": { bg: "#FFEBE6", fg: "#BF2600", border: "#FF8F73" },
    "blue-gray": { bg: "#DFE1E6", fg: "#42526E", border: "#C1C7D0" },
    "blue": { bg: "#DEEBFF", fg: "#0747A6", border: "#B3D4FF" }
  };

  if (categoryKey === "indeterminate") {
    return palettes.blue;
  }

  if (palettes[colorName]) {
    return palettes[colorName];
  }

  if (categoryKey === "done") {
    return palettes.green;
  }
  if (categoryKey === "new") {
    return palettes["medium-gray"];
  }

  return palettes.blue;
}

function getJiraStatusStyle(status) {
  const palette = getJiraStatusPalette(status);
  return `background:${palette.bg};color:${palette.fg};border-color:${palette.border};`;
}

function openTicketDropdown() {
  const panel = $("ticketDropdownPanel");
  const toggle = $("ticketDropdownToggle");
  panel.classList.remove("hidden");
  toggle.setAttribute("aria-expanded", "true");
  loadTicketSuggestions($("ticketSearch").value);
  $("ticketSearch").focus();
}

function closeTicketDropdown() {
  const panel = $("ticketDropdownPanel");
  const toggle = $("ticketDropdownToggle");
  panel.classList.add("hidden");
  toggle.setAttribute("aria-expanded", "false");
}

function rerenderLocalizedDynamicContent() {
  if (state.isConnected) {
    renderWorklogs(state.worklogs);
  }

  setTicketDropdownLabel(state.selectedIssue);

  const ticketDropdownPanel = $("ticketDropdownPanel");
  if (ticketDropdownPanel && !ticketDropdownPanel.classList.contains("hidden")) {
    renderTicketResults(state.cachedIssues);
  }
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

function isDurationValid() {
  const durationInput = $("durationInput");
  if (!durationInput) {
    return false;
  }

  const value = durationInput.value.trim();
  if (!value) {
    return false;
  }

  try {
    return parseDurationToSeconds(value) > 0;
  } catch {
    return false;
  }
}

function updateWorklogFormValidity() {
  const durationInput = $("durationInput");
  const saveButton = $("saveWorklogButton");
  if (!durationInput || !saveButton) {
    return;
  }

  const hasIssue = Boolean(state.selectedIssue);
  const durationValue = durationInput.value.trim();
  const validDuration = isDurationValid();
  const canSave = hasIssue && validDuration;

  saveButton.disabled = !canSave;
  durationInput.classList.toggle("invalid", durationValue.length > 0 && !validDuration);
  durationInput.setAttribute("aria-invalid", durationValue.length > 0 && !validDuration ? "true" : "false");
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

function sanitizeLinkHref(rawHref) {
  if (typeof rawHref !== "string") {
    return null;
  }

  const href = rawHref.trim();
  if (!href) {
    return null;
  }

  try {
    const parsed = new URL(href, "https://example.invalid");
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === "http:" || protocol === "https:" || protocol === "mailto:") {
      return href;
    }
    return null;
  } catch {
    return null;
  }
}

function applyAdfMarks(text, marks = []) {
  return marks.reduce((html, mark) => {
    const type = mark?.type;
    if (type === "strong") {
      return `<strong>${html}</strong>`;
    }
    if (type === "em") {
      return `<em>${html}</em>`;
    }
    if (type === "underline") {
      return `<u>${html}</u>`;
    }
    if (type === "strike") {
      return `<s>${html}</s>`;
    }
    if (type === "code") {
      return `<code>${html}</code>`;
    }
    if (type === "link") {
      const safeHref = sanitizeLinkHref(mark?.attrs?.href);
      if (!safeHref) {
        return html;
      }
      return `<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${html}</a>`;
    }
    return html;
  }, text);
}

function renderAdfNode(node) {
  if (!node) {
    return "";
  }

  const children = Array.isArray(node.content) ? node.content.map(renderAdfNode).join("") : "";

  switch (node.type) {
    case "doc":
      return children;
    case "paragraph":
      return `<p>${children || "<br>"}</p>`;
    case "text": {
      const escaped = escapeHtml(node.text ?? "");
      return applyAdfMarks(escaped, node.marks);
    }
    case "hardBreak":
      return "<br>";
    case "bulletList":
      return `<ul>${children}</ul>`;
    case "orderedList":
      return `<ol>${children}</ol>`;
    case "listItem":
      return `<li>${children}</li>`;
    case "blockquote":
      return `<blockquote>${children}</blockquote>`;
    case "codeBlock":
      return `<pre><code>${children}</code></pre>`;
    case "heading": {
      const level = Number(node?.attrs?.level);
      const safeLevel = Number.isInteger(level) && level >= 1 && level <= 6 ? level : 3;
      return `<h${safeLevel}>${children}</h${safeLevel}>`;
    }
    default:
      return children;
  }
}

function adfToHtml(doc) {
  if (!doc) {
    return "";
  }

  if (typeof doc === "string") {
    return escapeHtml(doc).replace(/\n/g, "<br>");
  }

  return renderAdfNode(doc).trim();
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
    worklogTab.classList.add("hidden");
    worklogPage.classList.add("hidden");

    if (worklogPage.classList.contains("active")) {
      setPage("settings");
    }

    return;
  }

  worklogTab.classList.remove("hidden");
  worklogPage.classList.remove("hidden");
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
    const data = await jiraSearch(jql, ["summary", "status", "worklog", "issuetype"], 50);
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
    const statusData = issue.fields.status ?? null;
    const status = statusData?.name ?? "";
    const statusStyle = getJiraStatusStyle(statusData);
    const url = `${normalizeHost(state.settings.jiraHost)}/browse/${issue.key}`;
    const commentText = adfToText(worklog.comment);
    const hasComment = commentText.trim().length > 0;
    const commentIcon = hasComment ? materialIcon("mi-comment") : materialIcon("mi-mode-comment");
    const commentClass = hasComment ? "has-comment" : "no-comment";
    const commentHtml = adfToHtml(worklog.comment);
    const issueType = getIssueTypeInfo(issue);
    const issueTypeIcon = issueType.iconUrl
      ? `<img class="ticket-item-type-icon" src="${escapeHtml(issueType.iconUrl)}" alt="${escapeHtml(issueType.name)}" title="${escapeHtml(issueType.name)}" loading="lazy" referrerpolicy="no-referrer" />`
      : "";
    return `
      <article class="worklog-card" data-index="${index}">
        <div class="worklog-row">
          <div class="issue-title" title="${escapeHtml(issue.key)} - ${escapeHtml(issue.fields.summary ?? "")}">${issueTypeIcon}<span class="issue-key">${escapeHtml(issue.key)}</span> - ${escapeHtml(issue.fields.summary ?? "")}</div>
          <div class="status" style="${statusStyle}">${escapeHtml(status)}</div>
          <a class="icon-button" href="${url}" target="_blank" title="${t('openJira')}" aria-label="${t('openJira')}">${materialIcon("mi-open-in-new")}</a>
          <div class="duration">${secondsToTime(worklog.timeSpentSeconds ?? 0)}</div>
          <div class="actions">
            <button class="icon-button toggle-comment ${commentClass}" type="button" title="${t('comment')}" aria-label="${t('comment')}">${commentIcon}</button>
            <button class="icon-button delete-worklog" type="button" title="${t('delete')}" aria-label="${t('delete')}">${materialIcon("mi-delete")}</button>
          </div>
        </div>
        <div class="comment-panel hidden">
          <div class="comment-text">${commentHtml || `<em>${t("noComment")}</em>`}</div>
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
  setTicketDropdownLabel();
  $("ticketSearch").value = "";
  $("durationInput").value = "30m";
  $("commentEditor").value = "";
  closeTicketDropdown();
  $("worklogDialog").showModal();
  updateWorklogFormValidity();
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

  const data = await jiraSearch(jql, ["summary", "status", "issuetype"], 25);
  const issues = data.issues ?? [];
  const pinnedKeys = new Set(state.pinnedIssues.map(issue => issue.key));
  const combined = [
    ...state.pinnedIssues.filter(p => !issues.some(i => i.key === p.key)),
    ...issues
  ];
  const mapped = combined.map(issue => ({ ...issue, pinned: pinnedKeys.has(issue.key) }));
  const pinned = mapped.filter(issue => issue.pinned);
  const unpinned = mapped.filter(issue => !issue.pinned);
  return [...pinned, ...unpinned];
}

function renderTicketResults(issues) {
  if (issues.length === 0) {
    $("ticketResults").innerHTML = `<div class="ticket-empty">${t("noTickets")}</div>`;
    return;
  }

  $("ticketResults").innerHTML = issues.map((issue, index) => {
    const issueType = getIssueTypeInfo(issue);
    const iconUrl = escapeHtml(issueType.iconUrl);
    const iconName = escapeHtml(issueType.name);
    const iconHidden = issueType.iconUrl ? "" : "hidden";
    const pinIcon = issue.pinned ? materialIcon("mi-star") : materialIcon("mi-star-outline");
    const statusData = issue.fields?.status ?? null;
    const statusStyle = getJiraStatusStyle(statusData);
    return `
    <button class="ticket-item" type="button" data-index="${index}">
      <span class="ticket-item-main">
        <img class="ticket-item-type-icon" src="${iconUrl}" alt="${iconName}" title="${iconName}" loading="lazy" referrerpolicy="no-referrer" ${iconHidden} />
        <span class="issue-key">${escapeHtml(issue.key)}</span>
        <span class="ticket-item-summary">${escapeHtml(issue.fields?.summary ?? issue.summary ?? "")}</span>
      </span>
      <span class="ticket-item-status" style="${statusStyle}">${escapeHtml(issue.fields?.status?.name ?? issue.status ?? "")}</span>
      <span class="pin-button ${issue.pinned ? "pinned" : ""}" data-pin-index="${index}" title="${t('pin')}">${pinIcon}</span>
    </button>`;
  }).join("");
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
        status: issue.fields?.status ?? { name: issue.status ?? "" },
        issuetype: issue.fields?.issuetype ?? issue.issuetype ?? null
      }
    });
  }
  await storage.set({ pinnedIssues: state.pinnedIssues });
  await loadTicketSuggestions($("ticketSearch")?.value ?? "");
}

function selectIssue(issue) {
  state.selectedIssue = issue;
  setTicketDropdownLabel(issue);
  closeTicketDropdown();
  updateWorklogFormValidity();
}

async function createWorklog(event) {
  event.preventDefault();
  const hasIssue = Boolean(state.selectedIssue);
  const validDuration = isDurationValid();
  if (!hasIssue) {
    showNotice(t("selectTicket"), true);
    updateWorklogFormValidity();
    return;
  }

  if (!validDuration) {
    showNotice(t("invalidDuration"), true);
    updateWorklogFormValidity();
    return;
  }

  const seconds = parseDurationToSeconds($("durationInput").value);
  const text = $("commentEditor").value.trim();
  await jiraFetch(`/rest/api/3/issue/${state.selectedIssue.key}/worklog`, {
    method: "POST",
    body: JSON.stringify({
      started: jiraStartedAt(state.selectedDate),
      timeSpentSeconds: seconds,
      comment: textToAdf(text)
    })
  });

  $('worklogDialog').close();
  showNotice(t("saved"));
  await loadWorklogs();
  updateWorklogFormValidity();
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
  $("durationInput").addEventListener("input", updateWorklogFormValidity);

  let searchTimeout;
  $("ticketDropdownToggle").addEventListener("click", (e) => {
    e.preventDefault();
    const panel = $("ticketDropdownPanel");
    if (panel.classList.contains("hidden")) {
      openTicketDropdown();
    } else {
      closeTicketDropdown();
    }
  });

  $("ticketSearch").addEventListener("input", () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadTicketSuggestions($("ticketSearch").value), 180);
  });

  document.addEventListener("click", (e) => {
    const ticketSelect = $("ticketSelect");
    if (ticketSelect && !ticketSelect.contains(e.target)) {
      closeTicketDropdown();
    }
  });

  $("ticketSearch").addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeTicketDropdown();
      $("ticketDropdownToggle").focus();
    }
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

  matchMedia("(prefers-color-scheme: light)").addEventListener("change", applyTheme);
}

async function init() {
  await loadState();
  applyTheme();
  applyLanguage();
  setupEvents();
  updateNavigation();

  if (hasCredentials()) {
    const connected = await testLogin(false);
    if (connected) {
      setPage("worklogs");
      await loadWorklogs();
    } else {
      setPage("settings");
    }
  } else {
    setPage("settings");
  }
}

init();
