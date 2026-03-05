// English Assistant - Generic Content Script
// Runs on all domains. Does NOT auto-scan/highlight.
// Only enables context menu lookup tooltip via service worker messages.

(function () {
  'use strict';

  const EA = window.EnglishAssistant;
  if (!EA) return;

  // Skip init on sites that have their own dedicated content scripts
  const host = window.location.hostname;
  const dedicatedSites = ['app.slack.com', 'slack.com', 'mail.google.com', 'atlassian.net'];
  if (dedicatedSites.some((s) => host === s || host.endsWith('.' + s))) return;

  // No auto-scanning — just ensure the namespace exists so tooltip-renderer works
  // Tooltip-renderer already registers chrome.runtime.onMessage listener at load time
})();
