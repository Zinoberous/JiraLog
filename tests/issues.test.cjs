const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const vm = require("node:vm");

test("background alarm paginates assigned open issues and sets the total badge without a popup", async () => {
  const data = { settings: { jiraHost: "https://example.atlassian.net", jiraEmail: "me@example.com", jiraToken: "test" } };
  const requests = [];
  let alarmListener;
  let badge;
  const event = { addListener() {} };
  const context = vm.createContext({
    URL, TextEncoder, AbortSignal, btoa, console,
    chrome: {
      action: { async setBadgeText({ text }) { badge = text; } },
      alarms: {
        onAlarm: { addListener(listener) { alarmListener = listener; } },
        async get() {}, async create() {}
      },
      runtime: { onInstalled: event, onStartup: event, onMessage: event },
      storage: { onChanged: event, local: {
        async get() { return structuredClone(data); },
        async set(update) { Object.assign(data, structuredClone(update)); }
      } }
    },
    async fetch(url, options) {
      assert.equal(url.href, "https://example.atlassian.net/rest/api/3/search/jql");
      const body = JSON.parse(options.body);
      assert.match(body.jql, /assignee = currentUser\(\) AND statusCategory != Done/);
      requests.push(body);
      if (body.nextPageToken === "second") return Response.json({
        isLast: true, issues: [{ key: "TEST-2", fields: {
          summary: "Second", duedate: "2026-11-12", issuetype: { name: "Task" },
          parent: { key: "TEST-9", fields: { summary: "Parent" } }
        } }]
      });
      return Response.json({
        isLast: false, nextPageToken: "second", issues: [{ key: "TEST-1", fields: { summary: "First" } }]
      });
    }
  });
  vm.runInContext(readFileSync("background.js", "utf8"), context);
  await alarmListener({ name: "jira-issues-refresh" });
  assert.deepEqual(data.issuesCache.issues.map(issue => issue.key), ["TEST-1", "TEST-2"]);
  assert.equal(data.issuesCache.issues[1].dueDate, "2026-11-12");
  assert.equal(data.issuesCache.issues[1].type, "Task");
  assert.deepEqual(data.issuesCache.issues[1].parent, { key: "TEST-9", summary: "Parent" });
  assert.equal(badge, "2");
  await alarmListener({ name: "jira-issues-refresh" });
  assert.equal(requests.length, 2);
});
