import { calculateSM2, createDefaultSM2 } from './lib/sm2-algorithm.js';
import {
  initializeStorage,
  getDeck,
  addCardToDeck,
  updateCard,
  getDueCards,
  getStats,
  refreshStats,
  getSettings,
  updateSettings,
  getDailyPhraseState,
  setDailyPhraseState,
} from './lib/storage-manager.js';

// --- Vocabulary + phrases loaded on demand ---
let vocabularyDB = null;
let dailyPhrases = null;

async function loadVocabulary() {
  if (!vocabularyDB) {
    const res = await fetch(chrome.runtime.getURL('data/vocabulary-database.json'));
    vocabularyDB = await res.json();
  }
  return vocabularyDB;
}

async function loadDailyPhrases() {
  if (!dailyPhrases) {
    const res = await fetch(chrome.runtime.getURL('data/daily-phrases.json'));
    dailyPhrases = await res.json();
  }
  return dailyPhrases;
}

// --- Message handler ---

async function handleMessage(message) {
  switch (message.action) {
    case 'getDefinition': {
      const vocab = await loadVocabulary();
      const term = message.word.toLowerCase().trim();
      const entry = vocab.find(
        (v) => v.word.toLowerCase() === term
      );
      return { found: !!entry, entry: entry || null };
    }

    case 'getVocabulary': {
      const vocab = await loadVocabulary();
      return { vocabulary: vocab };
    }

    case 'saveWord': {
      const result = await addCardToDeck(message.entry);
      return result;
    }

    case 'getDeck': {
      const deck = await getDeck();
      return { deck };
    }

    case 'updateCard': {
      const deck = await getDeck();
      const card = deck.find((c) => c.word === message.word);
      if (!card) return { error: 'Card not found' };
      if (!card.sm2) return { error: 'Card has no SM2 data' };

      const sm2Result = calculateSM2(card.sm2, message.rating);
      const updated = await updateCard(message.word, sm2Result);
      await refreshStats();
      return { updatedCard: updated };
    }

    case 'getDueCards': {
      const cards = await getDueCards();
      return { cards };
    }

    case 'getDailyPhrase': {
      const phrases = await loadDailyPhrases();
      const state = await getDailyPhraseState();
      const today = new Date().toISOString().split('T')[0];

      let index = state.index;
      if (state.date !== today) {
        index = (index + 1) % phrases.length;
        await setDailyPhraseState(index, today);
      }

      return { phrase: phrases[index], index };
    }

    case 'getStats': {
      const stats = await getStats();
      const deck = await getDeck();
      const dueCards = await getDueCards();
      return {
        ...stats,
        totalWords: deck.length,
        dueCount: dueCards.length,
      };
    }

    case 'getSettings': {
      const settings = await getSettings();
      return { settings };
    }

    case 'updateSettings': {
      const settings = await updateSettings(message.settings);
      return { success: true, settings };
    }

    default:
      return { error: `Unknown action: ${message.action}` };
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message)
    .then(sendResponse)
    .catch((err) => sendResponse({ error: err.message }));
  return true; // keep channel open for async response
});

// --- Install handler ---

chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    await initializeStorage();
  }

  // Create context menu for text selection
  chrome.contextMenus.create({
    id: 'english-assistant-lookup',
    title: 'Look up "%s" in English Assistant',
    contexts: ['selection'],
  });

  // Set up daily phrase alarm (fires every 24 hours)
  chrome.alarms.create('daily-phrase-rotation', {
    delayInMinutes: 1,
    periodInMinutes: 24 * 60,
  });
});

// --- Context menu handler ---

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'english-assistant-lookup' && info.selectionText) {
    const vocab = await loadVocabulary();
    const term = info.selectionText.toLowerCase().trim();
    const entry = vocab.find((v) => v.word.toLowerCase() === term);

    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, {
        action: 'showTooltip',
        word: info.selectionText,
        entry: entry || null,
        found: !!entry,
      });
    }
  }
});

// --- Alarm handler ---

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'daily-phrase-rotation') {
    const phrases = await loadDailyPhrases();
    const state = await getDailyPhraseState();
    const today = new Date().toISOString().split('T')[0];

    if (state.date !== today) {
      const newIndex = (state.index + 1) % phrases.length;
      await setDailyPhraseState(newIndex, today);
    }
  }
});
