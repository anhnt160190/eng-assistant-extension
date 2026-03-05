// English Assistant - Slack Content Script
// Observes Slack DOM for new messages and triggers vocabulary scanning.

(async () => {
  'use strict';

  const EA = window.EnglishAssistant;
  if (!EA) return;

  await EA.init({ site: 'slack' });
  if (!EA.enabled) return;

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  const scan = debounce(() => {
    // Try specific Slack containers first, fallback to body
    const container =
      document.querySelector('.p-workspace__primary_view_body') ||
      document.querySelector('[role="list"]') ||
      document.querySelector('[data-qa="slack_kit_list"]') ||
      document.body;

    EA.scanNode(container);
  }, 300);

  // Observe DOM mutations for new messages
  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });

  // Initial scan after Slack finishes loading
  setTimeout(scan, 1500);
})();
