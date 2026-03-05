// English Assistant - Shared Content Script Utilities
// Loaded first via manifest. Defines window.EnglishAssistant namespace.
// Tooltip methods added by tooltip-renderer.js (loaded after this file).

(function () {
  'use strict';

  const HIGHLIGHT_CLASS = 'ea-highlight';
  const PROCESSED_ATTR = 'data-ea-processed';

  // Skip these elements when scanning
  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE',
    'NOSCRIPT', 'IFRAME', 'SVG', 'CANVAS', 'VIDEO', 'AUDIO',
  ]);

  window.EnglishAssistant = {
    vocabMap: null,       // Map<lowercase word, vocab entry>
    _vocabRegex: null,    // Cached regex for all vocab words
    activeTooltip: null,  // current tooltip DOM element
    enabled: false,
    _initialized: false,  // guard against duplicate init

    // Placeholder methods — overridden by tooltip-renderer.js
    showTooltip() {},
    hideTooltip() {},
    _setupGlobalListeners() {},

    /**
     * Initialize: check settings, load vocabulary.
     * @param {{ site: 'slack'|'gmail'|'jira' }} config
     */
    async init(config) {
      if (this._initialized) return;
      this._initialized = true;

      try {
        const settingsResp = await chrome.runtime.sendMessage({ action: 'getSettings' });
        const settings = settingsResp.settings;

        const siteKey = {
          slack: 'enableSlack',
          gmail: 'enableGmail',
          jira: 'enableJira',
        }[config.site];

        if (!settings[siteKey]) {
          this.enabled = false;
          return;
        }

        const vocabResp = await chrome.runtime.sendMessage({ action: 'getVocabulary' });
        if (!vocabResp.vocabulary) return;

        this.vocabMap = new Map();
        for (const entry of vocabResp.vocabulary) {
          this.vocabMap.set(entry.word.toLowerCase(), entry);
        }

        // Build and cache regex once
        this._buildVocabRegex();

        this.enabled = true;
        this._setupGlobalListeners();
      } catch (err) {
        console.error('[EnglishAssistant] Init failed:', err);
      }
    },

    /**
     * Build a cached regex from all vocabulary words.
     */
    _buildVocabRegex() {
      const words = Array.from(this.vocabMap.keys());
      if (!words.length) return;
      const escaped = words
        .sort((a, b) => b.length - a.length)
        .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
      this._vocabRegex = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi');
    },

    /**
     * Scan a DOM subtree for vocabulary matches and highlight them.
     */
    scanNode(rootNode) {
      if (!this.enabled || !this.vocabMap || !rootNode) return;

      const walker = document.createTreeWalker(
        rootNode,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (node.parentElement?.classList?.contains(HIGHLIGHT_CLASS)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (node.parentElement?.closest(`[${PROCESSED_ATTR}]`)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (SKIP_TAGS.has(node.parentElement?.tagName)) {
              return NodeFilter.FILTER_REJECT;
            }
            if (node.parentElement?.closest('[contenteditable="true"]')) {
              return NodeFilter.FILTER_REJECT;
            }
            if (!node.textContent.trim()) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      const textNodes = [];
      let current;
      while ((current = walker.nextNode())) {
        textNodes.push(current);
      }

      for (const textNode of textNodes) {
        this._highlightMatches(textNode);
      }
    },

    /**
     * Find vocab words in a text node and wrap them in <mark> elements.
     */
    _highlightMatches(textNode) {
      const text = textNode.textContent;
      if (!text || text.length < 2) return;
      if (!this._vocabRegex) return;

      // Reset regex lastIndex before each use (stateful with /g flag)
      this._vocabRegex.lastIndex = 0;

      const matches = [];
      let match;
      while ((match = this._vocabRegex.exec(text)) !== null) {
        matches.push({ index: match.index, length: match[0].length, word: match[0] });
      }

      if (!matches.length) return;

      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      for (const m of matches) {
        if (m.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, m.index)));
        }

        const mark = document.createElement('mark');
        mark.className = HIGHLIGHT_CLASS;
        mark.setAttribute('data-word', m.word.toLowerCase());
        mark.textContent = text.slice(m.index, m.index + m.length);
        mark.addEventListener('click', (e) => {
          e.stopPropagation();
          window.EnglishAssistant.showTooltip(m.word.toLowerCase(), mark);
        });
        fragment.appendChild(mark);

        lastIndex = m.index + m.length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
      }

      const parent = textNode.parentNode;
      parent.replaceChild(fragment, textNode);
      if (parent.setAttribute) {
        parent.setAttribute(PROCESSED_ATTR, '1');
      }
    },
  };
})();
