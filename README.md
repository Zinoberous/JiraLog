# JiraLog

A lightweight browser extension for fast, day-based Jira worklog tracking.

The extension helps you document Jira worklogs for a selected day without repeatedly navigating through Jira issue pages.

## Features

- Jira Cloud login with host URL, email address, and API token
- Day-based worklog dashboard
- Total tracked time for the selected day
- Worklog list with issue key, title, status, Jira link, duration, comment, and delete action
- Collapsible worklog comments for a compact UI
- Create worklogs from a modal dialog
- Searchable issue dropdown
- Default issue suggestions for assigned, unresolved issues
- Pin frequently used issues for quick access
- Light and dark theme support
- System theme detection
- English and German UI
- System language detection
- About page with version, author, and license information

## Jira API Compatibility

The extension targets Jira Cloud REST API v3 and uses the current search endpoint:

```http
POST /rest/api/3/search/jql
```

Worklog comments are sent as Atlassian Document Format (ADF). The current editor is intentionally simple and can be replaced by a more advanced ADF editor later.

## Installation for Local Development

1. Download or clone the repository.
2. Open your browser extension page:

```text
chrome://extensions
```

or:

```text
edge://extensions
```

3. Enable Developer Mode.
4. Click **Load unpacked**.
5. Select the extension folder.

## Jira API Token

Create a Jira API token in your Atlassian account security settings.

Use the following credentials in the extension settings:

- Jira host URL, for example `https://your-company.atlassian.net`
- Jira account email address
- Jira API token

## Permissions

The extension uses browser storage to save settings and pinned issues locally.

No data is sent to third-party services. Requests are sent only to the configured Jira host.

## International Open-Source Notes

The project is intended for international open-source publication. User-facing metadata and documentation should remain in English by default.

Check these files before publishing:

- `manifest.json`
- `README.md`
- browser store descriptions
- screenshots
- issue templates
- pull request templates
- changelog

The UI may still support multiple languages through the built-in localization system.

## Roadmap

- Better Atlassian Document Format editor support
- Worklog templates
- Calendar overview
- Time statistics
- Multi-instance Jira support
- Export functionality
- Optional keyboard shortcuts

## Contributing

Issues and pull requests are welcome.

## License

MIT License

## Author

Alexander Karge
