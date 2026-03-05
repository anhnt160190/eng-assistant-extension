// Phrase tab rendering — daily business English phrase

/**
 * Render the daily phrase tab content.
 * @param {HTMLElement} container - The #tab-phrase element
 * @param {object|null} phrase - Daily phrase data from service worker
 */
export function renderPhraseTab(container, phrase) {
  container.innerHTML = '';

  if (!phrase) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-title">No phrase today</div>
        <div class="empty-state-text">Check back soon for your daily phrase.</div>
      </div>`;
    return;
  }

  const card = document.createElement('div');
  card.className = 'phrase-card';

  // Category badge
  if (phrase.category) {
    const badge = document.createElement('div');
    badge.className = 'phrase-category';
    badge.textContent = phrase.category;
    card.appendChild(badge);
  }

  // Phrase text
  const text = document.createElement('div');
  text.className = 'phrase-text';
  text.textContent = phrase.phrase;
  card.appendChild(text);

  // Meaning
  const meaning = document.createElement('div');
  meaning.className = 'phrase-meaning';
  meaning.textContent = phrase.meaning;
  card.appendChild(meaning);

  // Example
  if (phrase.example) {
    const example = document.createElement('div');
    example.className = 'phrase-example';
    example.textContent = phrase.example;
    card.appendChild(example);
  }

  // Context
  if (phrase.context) {
    const context = document.createElement('div');
    context.className = 'phrase-context';
    context.textContent = phrase.context;
    card.appendChild(context);
  }

  container.appendChild(card);

  // Alternatives section
  if (phrase.alternatives && phrase.alternatives.length > 0) {
    const altSection = document.createElement('div');
    altSection.className = 'phrase-alternatives';

    const label = document.createElement('div');
    label.className = 'phrase-alternatives-label';
    label.textContent = 'Common Alternatives';
    altSection.appendChild(label);

    const chipList = document.createElement('div');
    chipList.className = 'phrase-alt-list';
    for (const alt of phrase.alternatives) {
      const chip = document.createElement('span');
      chip.className = 'phrase-alt-chip';
      chip.textContent = alt;
      chipList.appendChild(chip);
    }
    altSection.appendChild(chipList);
    container.appendChild(altSection);
  }
}
