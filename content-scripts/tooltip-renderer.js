// English Assistant - Tooltip Renderer
// Adds tooltip methods to window.EnglishAssistant namespace.
// Must be loaded AFTER shared-content-utils.js.

(function () {
  'use strict';

  const EA = window.EnglishAssistant;
  if (!EA) return;

  const HIGHLIGHT_CLASS = 'ea-highlight';

  /**
   * Show tooltip near the highlighted word.
   */
  EA.showTooltip = async function (word, anchorElement) {
    EA.hideTooltip();

    const entry = EA.vocabMap.get(word.toLowerCase());
    if (!entry) return;

    const tooltip = document.createElement('div');
    tooltip.className = 'ea-tooltip';
    tooltip.setAttribute('role', 'dialog');
    tooltip.setAttribute('aria-label', 'Word definition');

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ea-tooltip-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => EA.hideTooltip());
    tooltip.appendChild(closeBtn);

    // Word
    const wordEl = document.createElement('div');
    wordEl.className = 'ea-tooltip-word';
    wordEl.textContent = entry.word;
    tooltip.appendChild(wordEl);

    // Pronunciation + part of speech
    const pronEl = document.createElement('div');
    pronEl.className = 'ea-tooltip-pronunciation';
    const parts = [];
    if (entry.pronunciation) parts.push(entry.pronunciation);
    if (entry.partOfSpeech) parts.push(entry.partOfSpeech);
    pronEl.textContent = parts.join(' \u00b7 ');
    tooltip.appendChild(pronEl);

    // Definition
    const defEl = document.createElement('div');
    defEl.className = 'ea-tooltip-definition';
    defEl.textContent = entry.definition;
    tooltip.appendChild(defEl);

    // Example
    if (entry.example) {
      const exEl = document.createElement('div');
      exEl.className = 'ea-tooltip-example';
      exEl.textContent = `"${entry.example}"`;
      tooltip.appendChild(exEl);
    }

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'ea-tooltip-actions';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'ea-tooltip-save';
    saveBtn.textContent = 'Save to Deck';
    saveBtn.addEventListener('click', () => handleSave(entry, saveBtn));
    actions.appendChild(saveBtn);

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'ea-tooltip-dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => EA.hideTooltip());
    actions.appendChild(dismissBtn);

    tooltip.appendChild(actions);
    document.body.appendChild(tooltip);
    EA.activeTooltip = tooltip;

    // Position tooltip near anchor
    positionTooltip(tooltip, anchorElement);

    // Check if already saved
    try {
      const deckResp = await chrome.runtime.sendMessage({ action: 'getDeck' });
      if (deckResp.deck?.some((c) => c.word.toLowerCase() === word.toLowerCase())) {
        saveBtn.textContent = 'Saved';
        saveBtn.classList.add('ea-saved');
        saveBtn.disabled = true;
      }
    } catch (err) {
      // Non-critical — tooltip still works without saved state check
    }
  };

  /**
   * Remove the active tooltip from DOM.
   */
  EA.hideTooltip = function () {
    if (EA.activeTooltip) {
      EA.activeTooltip.remove();
      EA.activeTooltip = null;
    }
  };

  /**
   * Show a minimal tooltip for words not in the vocabulary database.
   */
  EA._showNotFoundTooltip = function (word, anchorElement) {
    EA.hideTooltip();

    const tooltip = document.createElement('div');
    tooltip.className = 'ea-tooltip';
    tooltip.setAttribute('role', 'dialog');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'ea-tooltip-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\u00d7';
    closeBtn.addEventListener('click', () => EA.hideTooltip());
    tooltip.appendChild(closeBtn);

    const wordEl = document.createElement('div');
    wordEl.className = 'ea-tooltip-word';
    wordEl.textContent = word;
    tooltip.appendChild(wordEl);

    const msgEl = document.createElement('div');
    msgEl.className = 'ea-tooltip-definition';
    msgEl.textContent = 'This word is not in the vocabulary database. You can add it manually from the popup.';
    tooltip.appendChild(msgEl);

    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'ea-tooltip-dismiss';
    dismissBtn.textContent = 'Dismiss';
    dismissBtn.addEventListener('click', () => EA.hideTooltip());
    tooltip.appendChild(dismissBtn);

    document.body.appendChild(tooltip);
    EA.activeTooltip = tooltip;
    positionTooltip(tooltip, anchorElement);
  };

  // _setupGlobalListeners is now a no-op — listeners are registered at load time below
  EA._setupGlobalListeners = function () {};

  // --- Context menu listener (registered immediately, works even if site is disabled) ---
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'showTooltip') {
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        const anchor = { getBoundingClientRect: () => rect };

        if (message.entry) {
          if (!EA.vocabMap) EA.vocabMap = new Map();
          EA.vocabMap.set(message.word.toLowerCase(), message.entry);
          EA.showTooltip(message.word, anchor);
        } else {
          EA._showNotFoundTooltip(message.word, anchor);
        }
      }
    }
  });

  // Escape/click-outside always available for context menu tooltips
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') EA.hideTooltip();
  });

  document.addEventListener('click', (e) => {
    if (
      EA.activeTooltip &&
      !EA.activeTooltip.contains(e.target) &&
      !e.target.classList?.contains(HIGHLIGHT_CLASS)
    ) {
      EA.hideTooltip();
    }
  });

  // --- Private helpers ---

  function positionTooltip(tooltip, anchor) {
    const rect = anchor.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();

    let top = rect.bottom + 8;
    let left = rect.left;

    if (left + tooltipRect.width > window.innerWidth - 16) {
      left = window.innerWidth - tooltipRect.width - 16;
    }
    if (top + tooltipRect.height > window.innerHeight - 16) {
      top = rect.top - tooltipRect.height - 8;
    }
    if (left < 16) left = 16;

    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
  }

  async function handleSave(entry, button) {
    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const cardEntry = {
      word: entry.word,
      definition: entry.definition,
      example: entry.example || '',
      partOfSpeech: entry.partOfSpeech || '',
      pronunciation: entry.pronunciation || '',
      source: window.location.hostname,
      dateAdded: today,
      sm2: {
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        nextReview: tomorrow.toISOString().split('T')[0],
      },
    };

    try {
      const result = await chrome.runtime.sendMessage({
        action: 'saveWord',
        entry: cardEntry,
      });

      if (result.success) {
        button.textContent = 'Saved';
        button.classList.add('ea-saved');
        button.disabled = true;
      } else if (result.reason === 'duplicate') {
        button.textContent = 'Already saved';
        button.disabled = true;
      }
    } catch (err) {
      console.error('[EnglishAssistant] Save failed:', err);
    }
  }
})();
