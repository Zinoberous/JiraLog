/**
 * Service worker (MV3). Extend for OAuth refresh, alarms, or message passing.
 */

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage().catch(() => {
      /* options may be unavailable in edge cases */
    });
  }
});
