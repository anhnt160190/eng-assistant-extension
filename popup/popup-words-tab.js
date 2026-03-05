// Words tab rendering — saved vocabulary list with search, expand, and manual add

/**
 * Render the words tab content.
 * @param {HTMLElement} container - The #tab-words element
 * @param {Array} deck - Array of saved word cards
 * @param {Function} onSave - Callback after saving a new word (refreshes data)
 */
export function renderWordsTab(container, deck, onSave) {
  container.innerHTML = '';

  // Add Word button + collapsible form (always shown)
  container.appendChild(createAddWordSection(onSave));

  if (!deck || deck.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.innerHTML = `
      <div class="empty-state-title">No saved words yet</div>
      <div class="empty-state-text">
        Add words manually above, or browse Slack, Gmail, and Jira to save highlighted words.
      </div>`;
    container.appendChild(empty);
    return;
  }

  // Search bar
  const searchWrap = document.createElement('div');
  searchWrap.className = 'words-search';
  searchWrap.innerHTML = `
    <svg class="words-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
    </svg>
    <input type="text" placeholder="Search words..." id="words-search-input">`;
  container.appendChild(searchWrap);

  // Word list
  const list = document.createElement('div');
  list.className = 'word-list';
  list.id = 'word-list';

  for (const card of deck) {
    list.appendChild(createWordItem(card));
  }
  container.appendChild(list);

  // Search filtering
  const input = container.querySelector('#words-search-input');
  input.addEventListener('input', () => {
    const query = input.value.toLowerCase();
    const items = list.querySelectorAll('.word-item');
    items.forEach((item) => {
      const word = item.getAttribute('data-word');
      item.style.display = word.includes(query) ? '' : 'none';
    });
  });
}

function createAddWordSection(onSave) {
  const section = document.createElement('div');
  section.className = 'add-word-section';

  const toggleBtn = document.createElement('button');
  toggleBtn.className = 'add-word-toggle';
  toggleBtn.innerHTML = `
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
      <line x1="12" y1="5" x2="12" y2="19"></line>
      <line x1="5" y1="12" x2="19" y2="12"></line>
    </svg>
    Add Word`;
  section.appendChild(toggleBtn);

  const form = document.createElement('form');
  form.className = 'add-word-form hidden';
  form.innerHTML = `
    <input type="text" class="add-word-input" name="word" placeholder="Word or phrase *" required>
    <input type="text" class="add-word-input" name="definition" placeholder="Definition *" required>
    <input type="text" class="add-word-input" name="example" placeholder="Example sentence (optional)">
    <div class="add-word-actions">
      <button type="button" class="add-word-cancel">Cancel</button>
      <button type="submit" class="add-word-submit">Save</button>
    </div>
    <div class="add-word-message hidden"></div>`;
  section.appendChild(form);

  toggleBtn.addEventListener('click', () => {
    const isVisible = !form.classList.contains('hidden');
    if (isVisible) {
      form.classList.add('hidden');
    } else {
      form.classList.remove('hidden');
      form.querySelector('[name="word"]').focus();
    }
  });

  form.querySelector('.add-word-cancel').addEventListener('click', () => {
    form.classList.add('hidden');
    form.reset();
    hideMessage(form);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const word = form.querySelector('[name="word"]').value.trim();
    const definition = form.querySelector('[name="definition"]').value.trim();
    const example = form.querySelector('[name="example"]').value.trim();

    if (!word || !definition) return;

    const submitBtn = form.querySelector('.add-word-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Saving...';

    const today = new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const cardEntry = {
      word,
      definition,
      example,
      partOfSpeech: '',
      pronunciation: '',
      source: 'manual',
      dateAdded: today,
      sm2: {
        interval: 1,
        repetitions: 0,
        easeFactor: 2.5,
        nextReview: tomorrow.toISOString().split('T')[0],
      },
    };

    try {
      const result = await chrome.runtime.sendMessage({ action: 'saveWord', entry: cardEntry });
      if (result.success) {
        form.reset();
        form.classList.add('hidden');
        if (onSave) await onSave();
      } else if (result.reason === 'duplicate') {
        showMessage(form, 'This word is already in your deck.', 'warning');
      }
    } catch (err) {
      console.error('[EnglishAssistant] Manual save failed:', err);
      showMessage(form, 'Failed to save. Please try again.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save';
    }
  });

  return section;
}

function showMessage(form, text, type) {
  const msg = form.querySelector('.add-word-message');
  msg.textContent = text;
  msg.className = `add-word-message add-word-message-${type}`;
}

function hideMessage(form) {
  const msg = form.querySelector('.add-word-message');
  msg.className = 'add-word-message hidden';
}

function createWordItem(card) {
  const item = document.createElement('div');
  item.className = 'word-item';
  item.setAttribute('data-word', card.word.toLowerCase());

  // Status badge
  const reps = card.sm2?.repetitions || 0;
  let badgeClass, badgeText;
  if (reps >= 3) {
    badgeClass = 'badge-learned';
    badgeText = 'Learned';
  } else if (reps >= 1) {
    badgeClass = 'badge-learning';
    badgeText = 'Learning';
  } else {
    badgeClass = 'badge-new';
    badgeText = 'New';
  }

  // Header row
  const header = document.createElement('div');
  header.className = 'word-item-header';
  header.innerHTML = `
    <span class="word-item-word">${escapeHtml(card.word)}</span>
    <span class="word-item-pos">${escapeHtml(card.partOfSpeech || '')}</span>
    <span class="word-item-badge ${badgeClass}">${badgeText}</span>`;

  // Detail section (hidden by default)
  const detail = document.createElement('div');
  detail.className = 'word-item-detail';

  const defEl = document.createElement('div');
  defEl.className = 'word-detail-def';
  defEl.textContent = card.definition;
  detail.appendChild(defEl);

  if (card.example) {
    const exEl = document.createElement('div');
    exEl.className = 'word-detail-example';
    exEl.textContent = `"${card.example}"`;
    detail.appendChild(exEl);
  }

  if (card.source) {
    const srcEl = document.createElement('div');
    srcEl.className = 'word-detail-source';
    srcEl.textContent = `Saved from ${card.source}`;
    detail.appendChild(srcEl);
  }

  item.appendChild(header);
  item.appendChild(detail);

  // Toggle expand on click
  item.addEventListener('click', () => {
    item.classList.toggle('expanded');
  });

  return item;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
