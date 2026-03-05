// English Assistant - Gmail Content Script
// Scans open email bodies for vocabulary. Read-only MVP (skips compose area).

(async () => {
  'use strict';

  const EA = window.EnglishAssistant;
  if (!EA) return;

  await EA.init({ site: 'gmail' });
  if (!EA.enabled) return;

  function debounce(fn, ms) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), ms);
    };
  }

  const scan = debounce(() => {
    // Scan open email bodies (role="article" or data-message-id containers)
    const emailBodies = document.querySelectorAll(
      '[role="article"], [data-message-id]'
    );
    emailBodies.forEach((body) => EA.scanNode(body));
  }, 300);

  const observer = new MutationObserver(scan);
  observer.observe(document.body, { childList: true, subtree: true });

  // Gmail loads slower than other SPAs
  setTimeout(scan, 2000);
})();
