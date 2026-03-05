// Storage abstraction for chrome.storage.local and chrome.storage.sync

const DEFAULT_STATS = {
  wordsLearned: 0,
  streak: 0,
  lastReviewDate: null,
};

const DEFAULT_SETTINGS = {
  enableSlack: true,
  enableGmail: true,
  enableJira: true,
  theme: 'auto',
};

// --- Local storage helpers ---

function getLocal(keys) {
  return chrome.storage.local.get(keys);
}

function setLocal(data) {
  return chrome.storage.local.set(data);
}

// --- Deck operations ---

export async function getDeck() {
  const { deck } = await getLocal({ deck: [] });
  return deck;
}

export async function saveDeck(deck) {
  await setLocal({ deck });
}

export async function addCardToDeck(entry) {
  const deck = await getDeck();
  const exists = deck.some((c) => c.word === entry.word);
  if (exists) return { success: false, reason: 'duplicate' };

  deck.push(entry);
  await saveDeck(deck);
  return { success: true };
}

export async function updateCard(word, sm2Data) {
  const deck = await getDeck();
  const card = deck.find((c) => c.word === word);
  if (!card) return null;

  card.sm2 = { ...card.sm2, ...sm2Data };
  await saveDeck(deck);
  return card;
}

export async function removeCard(word) {
  const deck = await getDeck();
  const filtered = deck.filter((c) => c.word !== word);
  await saveDeck(filtered);
}

export async function getDueCards() {
  const deck = await getDeck();
  const today = new Date().toISOString().split('T')[0];
  return deck.filter((c) => c.sm2 && c.sm2.nextReview <= today);
}

// --- Stats ---

export async function getStats() {
  const { stats } = await getLocal({ stats: DEFAULT_STATS });
  return stats;
}

export async function updateStats(partial) {
  const current = await getStats();
  const updated = { ...current, ...partial };
  await setLocal({ stats: updated });
  return updated;
}

/**
 * Recalculate wordsLearned from deck (cards with repetitions >= 3).
 * Update streak based on review date.
 */
export async function refreshStats() {
  const deck = await getDeck();
  const stats = await getStats();
  const today = new Date().toISOString().split('T')[0];

  const wordsLearned = deck.filter(
    (c) => c.sm2 && c.sm2.repetitions >= 3
  ).length;

  // Update streak
  if (stats.lastReviewDate === today) {
    // Already reviewed today, keep streak
  } else {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (stats.lastReviewDate === yesterdayStr) {
      stats.streak += 1;
    } else if (stats.lastReviewDate !== today) {
      stats.streak = 1;
    }
    stats.lastReviewDate = today;
  }

  stats.wordsLearned = wordsLearned;
  await setLocal({ stats });
  return stats;
}

// --- Settings (sync storage) ---

export async function getSettings() {
  const { settings } = await chrome.storage.sync.get({
    settings: DEFAULT_SETTINGS,
  });
  return settings;
}

export async function updateSettings(partial) {
  const current = await getSettings();
  const updated = { ...current, ...partial };
  await chrome.storage.sync.set({ settings: updated });
  return updated;
}

// --- Daily phrase state ---

export async function getDailyPhraseState() {
  const { dailyPhraseIndex, dailyPhraseDate } = await getLocal({
    dailyPhraseIndex: 0,
    dailyPhraseDate: null,
  });
  return { index: dailyPhraseIndex, date: dailyPhraseDate };
}

export async function setDailyPhraseState(index, date) {
  await setLocal({ dailyPhraseIndex: index, dailyPhraseDate: date });
}

// --- Initialize default data on install ---

export async function initializeStorage() {
  await setLocal({
    deck: [],
    stats: DEFAULT_STATS,
    dailyPhraseIndex: 0,
    dailyPhraseDate: new Date().toISOString().split('T')[0],
  });
  await chrome.storage.sync.set({ settings: DEFAULT_SETTINGS });
}
