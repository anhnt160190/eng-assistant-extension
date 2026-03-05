// Review tab rendering — flashcard review with SM-2 rating

let reviewCards = [];
let reviewIndex = 0;
let isFlipped = false;
let onReviewComplete = null;

/**
 * Render the review tab content.
 * @param {HTMLElement} container - The #tab-review element
 * @param {Array} dueCards - Cards due for review
 * @param {Function} onComplete - Callback when review session finishes
 */
export function renderReviewTab(container, dueCards, onComplete) {
  container.innerHTML = '';
  reviewCards = dueCards || [];
  reviewIndex = 0;
  isFlipped = false;
  onReviewComplete = onComplete;

  if (reviewCards.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No cards due</div>
        <div class="empty-state-text">
          All caught up! Save more words from Slack, Gmail, or Jira to build your deck.
        </div>
      </div>`;
    return;
  }

  renderCurrentCard(container);
}

function renderCurrentCard(container) {
  container.innerHTML = '';

  if (reviewIndex >= reviewCards.length) {
    renderCompletion(container);
    return;
  }

  const card = reviewCards[reviewIndex];

  // Progress indicator
  const progress = document.createElement('div');
  progress.className = 'review-progress';
  progress.textContent = `Card ${reviewIndex + 1} of ${reviewCards.length}`;
  container.appendChild(progress);

  // Flashcard
  const flashcard = document.createElement('div');
  flashcard.className = 'flashcard';
  flashcard.setAttribute('role', 'button');
  flashcard.setAttribute('aria-label', 'Click or press Space to flip card');
  flashcard.tabIndex = 0;

  if (!isFlipped) {
    // Front: word only
    const wordEl = document.createElement('div');
    wordEl.className = 'flashcard-word';
    wordEl.textContent = card.word;
    flashcard.appendChild(wordEl);

    const hint = document.createElement('div');
    hint.className = 'flashcard-hint';
    hint.textContent = 'Click or press Space to reveal';
    flashcard.appendChild(hint);
  } else {
    // Back: definition, example, source
    const back = document.createElement('div');
    back.className = 'flashcard-back';

    const wordEl = document.createElement('div');
    wordEl.className = 'flashcard-word';
    wordEl.textContent = card.word;
    back.appendChild(wordEl);

    if (card.pronunciation) {
      const pron = document.createElement('div');
      pron.className = 'flashcard-pronunciation';
      pron.textContent = `${card.pronunciation}${card.partOfSpeech ? ' \u00b7 ' + card.partOfSpeech : ''}`;
      back.appendChild(pron);
    }

    const defEl = document.createElement('div');
    defEl.className = 'flashcard-definition';
    defEl.textContent = card.definition;
    back.appendChild(defEl);

    if (card.example) {
      const exEl = document.createElement('div');
      exEl.className = 'flashcard-example';
      exEl.textContent = `"${card.example}"`;
      back.appendChild(exEl);
    }

    if (card.source) {
      const srcEl = document.createElement('div');
      srcEl.className = 'flashcard-source';
      srcEl.textContent = `Saved from ${card.source}`;
      back.appendChild(srcEl);
    }

    flashcard.appendChild(back);
  }

  flashcard.addEventListener('click', () => {
    if (!isFlipped) {
      isFlipped = true;
      renderCurrentCard(container);
    }
  });

  container.appendChild(flashcard);

  // Rating buttons (only when flipped)
  if (isFlipped) {
    const actions = document.createElement('div');
    actions.className = 'review-actions';

    actions.appendChild(createRateButton('Hard', 'btn-rate-hard', 0, '1', container));
    actions.appendChild(createRateButton('Good', 'btn-rate-good', 1, '2', container));
    actions.appendChild(createRateButton('Easy', 'btn-rate-easy', 2, '3', container));

    container.appendChild(actions);
  }
}

function createRateButton(label, className, rating, keyHint, container) {
  const btn = document.createElement('button');
  btn.className = `btn-rate ${className}`;
  btn.innerHTML = `${label}<span class="key-hint">${keyHint}</span>`;
  btn.addEventListener('click', () => rateAndAdvance(rating, container));
  return btn;
}

async function rateAndAdvance(rating, container) {
  const card = reviewCards[reviewIndex];

  try {
    await chrome.runtime.sendMessage({
      action: 'updateCard',
      word: card.word,
      rating,
    });
  } catch (err) {
    console.error('[EnglishAssistant] Failed to update card:', err);
  }

  reviewIndex++;
  isFlipped = false;
  renderCurrentCard(container);
}

function renderCompletion(container) {
  container.innerHTML = `
    <div class="review-complete">
      <div class="review-complete-title">All done!</div>
      <div class="review-complete-text">
        You reviewed ${reviewCards.length} card${reviewCards.length !== 1 ? 's' : ''} today. Keep it up!
      </div>
    </div>`;

  if (onReviewComplete) onReviewComplete();
}

/**
 * Handle keyboard shortcuts for review tab.
 * Call this from the main popup keyboard listener.
 * @param {string} key - The pressed key
 * @param {HTMLElement} container - The #tab-review element
 */
export function handleReviewKeyboard(key, container) {
  if (reviewIndex >= reviewCards.length) return;

  if (key === ' ' && !isFlipped) {
    isFlipped = true;
    renderCurrentCard(container);
  } else if (isFlipped) {
    if (key === '1') rateAndAdvance(0, container);
    else if (key === '2') rateAndAdvance(1, container);
    else if (key === '3') rateAndAdvance(2, container);
  }
}
