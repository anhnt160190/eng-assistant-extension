// English Assistant - Jira Content Script
// Scans issue descriptions and comments for vocabulary.

(async () => {
  'use strict';

  const EA = window.EnglishAssistant;
  if (!EA) return;

  await EA.init({ site: 'jira' });
  if (!EA.enabled) return;

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  const scan = debounce(() => {
    // Jira uses stable data-test-id attributes
    const description = document.querySelector(
      '[data-test-id*="description"], [data-testid*="description"]'
    );
    const comments = document.querySelectorAll(
      '[data-test-id*="comment"], [data-testid*="comment"]'
    );

    if (description) EA.scanNode(description);
    comments.forEach((c) => EA.scanNode(c));

    // Fallback: scan main content area
    if (!description && !comments.length) {
      const main = document.querySelector('[role="main"]') || document.querySelector('#jira-frontend');
      if (main) EA.scanNode(main);
    }
  }, 300);

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });

  setTimeout(scan, 1500);
})();
