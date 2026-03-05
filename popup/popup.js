// English Assistant - Popup main entry point
// Handles init, data loading, tab switching, settings, footer stats.

import { renderPhraseTab } from './popup-phrase-tab.js';
import { renderWordsTab } from './popup-words-tab.js';
import { renderReviewTab, handleReviewKeyboard } from './popup-review-tab.js';

// --- State ---
let currentTab = 'phrase';
let deck = [];
let dueCards = [];
let dailyPhrase = null;
let stats = {};
let settings = {};

// --- DOM refs ---
const tabPhrase = document.getElementById('tab-phrase');
const tabWords = document.getElementById('tab-words');
const tabReview = document.getElementById('tab-review');
const settingsOverlay = document.getElementById('settings-overlay');

// --- Init ---
document.addEventListener('DOMContentLoaded', init);

async function init() {
  await loadData();
  applyTheme(settings.theme || 'auto');
  renderCurrentTab();
  renderFooter();
  setupTabListeners();
  setupSettingsListeners();
  setupKeyboardShortcuts();
}

// --- Data loading ---
async function loadData() {
  try {
    const [deckResp, phraseResp, statsResp, settingsResp, dueResp] = await Promise.all([
      chrome.runtime.sendMessage({ action: 'getDeck' }),
      chrome.runtime.sendMessage({ action: 'getDailyPhrase' }),
      chrome.runtime.sendMessage({ action: 'getStats' }),
      chrome.runtime.sendMessage({ action: 'getSettings' }),
      chrome.runtime.sendMessage({ action: 'getDueCards' }),
    ]);
    deck = deckResp.deck || [];
    dailyPhrase = phraseResp.phrase || null;
    stats = statsResp || {};
    settings = settingsResp.settings || {};
    dueCards = dueResp.cards || [];
  } catch (err) {
    console.error('[EnglishAssistant] Failed to load data:', err);
  }
}

// --- Tab switching ---
function setupTabListeners() {
  const tabButtons = document.querySelectorAll('.tab-bar [role="tab"]');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

function switchTab(tabName) {
  currentTab = tabName;

  // Update tab bar
  document.querySelectorAll('.tab-bar [role="tab"]').forEach((btn) => {
    btn.setAttribute('aria-selected', btn.getAttribute('data-tab') === tabName ? 'true' : 'false');
  });

  // Update panels
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.remove('active');
  });
  const activePanel = document.getElementById(`tab-${tabName}`);
  if (activePanel) activePanel.classList.add('active');

  renderCurrentTab();
}

function renderCurrentTab() {
  switch (currentTab) {
    case 'phrase':
      renderPhraseTab(tabPhrase, dailyPhrase);
      break;
    case 'words':
      renderWordsTab(tabWords, deck, async () => {
        await loadData();
        renderCurrentTab();
        renderFooter();
      });
      break;
    case 'review':
      renderReviewTab(tabReview, dueCards, async () => {
        await loadData();
        renderFooter();
      });
      break;
  }
}

// --- Settings ---
function setupSettingsListeners() {
  document.getElementById('btn-settings').addEventListener('click', () => {
    loadSettingsUI();
    settingsOverlay.classList.remove('hidden');
  });

  document.getElementById('btn-settings-close').addEventListener('click', () => {
    settingsOverlay.classList.add('hidden');
  });

  // Toggles
  ['slack', 'gmail', 'jira'].forEach((site) => {
    const toggle = document.getElementById(`toggle-${site}`);
    toggle.addEventListener('change', () => {
      const key = `enable${site.charAt(0).toUpperCase() + site.slice(1)}`;
      updateSetting({ [key]: toggle.checked });
    });
  });

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      updateSetting({ theme });
      applyTheme(theme);
      document.querySelectorAll('.theme-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });
}

function loadSettingsUI() {
  document.getElementById('toggle-slack').checked = settings.enableSlack !== false;
  document.getElementById('toggle-gmail').checked = settings.enableGmail !== false;
  document.getElementById('toggle-jira').checked = settings.enableJira !== false;

  document.querySelectorAll('.theme-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-theme') === (settings.theme || 'auto'));
  });
}

async function updateSetting(partial) {
  settings = { ...settings, ...partial };
  try {
    await chrome.runtime.sendMessage({ action: 'updateSettings', settings: partial });
  } catch (err) {
    console.error('[EnglishAssistant] Failed to save settings:', err);
  }
}

function applyTheme(theme) {
  if (theme === 'auto') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

// --- Footer stats ---
function renderFooter() {
  document.getElementById('streak-count').textContent = stats.streak || 0;
  document.getElementById('words-count').textContent = deck.length;

  const dueCount = dueCards.length;
  document.getElementById('due-count').textContent = dueCount;

  const dueStat = document.getElementById('stat-due');
  if (dueCount > 0) {
    dueStat.classList.add('stat-warning');
  } else {
    dueStat.classList.remove('stat-warning');
  }
}

// --- Keyboard shortcuts ---
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    if (currentTab === 'review') {
      handleReviewKeyboard(e.key, tabReview);
    }
  });
}
