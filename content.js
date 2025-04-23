function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

// Track the current input element that has focus
let currentInputElement = null;

// Create and manage suggestions dropdown
function createSuggestionsDropdown() {
  let dropdown = document.getElementById('eng-assistant-suggestions');
  if (!dropdown) {
    dropdown = document.createElement('div');
    dropdown.id = 'eng-assistant-suggestions';
    dropdown.style.position = 'absolute';
    dropdown.style.zIndex = '9999';
    dropdown.style.background = '#fff';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    dropdown.style.display = 'none';
    dropdown.style.maxWidth = '400px';
    dropdown.style.maxHeight = '200px';
    dropdown.style.overflowY = 'auto';
    document.body.appendChild(dropdown);
  }
  return dropdown;
}

// Show suggestions dropdown near the input element
function showSuggestions(inputEl, suggestions) {
  if (!suggestions || !suggestions.length) return;
  
  // Store the current input element
  currentInputElement = inputEl;
  
  const dropdown = createSuggestionsDropdown();
  
  // Position dropdown below the input
  const rect = inputEl.getBoundingClientRect();
  dropdown.style.top = `${window.scrollY + rect.bottom}px`;
  dropdown.style.left = `${window.scrollX + rect.left}px`;
  dropdown.style.width = `${rect.width}px`;
  
  // Clear previous suggestions
  dropdown.innerHTML = '';
  
  // Add suggestion items
  suggestions.forEach(suggestion => {
    const item = document.createElement('div');
    item.className = 'eng-assistant-suggestion';
    item.textContent = suggestion;
    item.style.padding = '8px 12px';
    item.style.cursor = 'pointer';
    item.style.borderBottom = '1px solid #eee';
    
    // Highlight on hover
    item.addEventListener('mouseover', () => {
      item.style.backgroundColor = '#f0f0f0';
    });
    item.addEventListener('mouseout', () => {
      item.style.backgroundColor = 'transparent';
    });
    
    // Apply suggestion when clicked
    item.addEventListener('click', () => {
      applySuggestion(inputEl, suggestion);
      hideSuggestions();
    });
    
    dropdown.appendChild(item);
  });
  
  dropdown.style.display = 'block';
}

// Hide suggestions dropdown
function hideSuggestions() {
  const dropdown = document.getElementById('eng-assistant-suggestions');
  if (dropdown) {
    dropdown.style.display = 'none';
  }
  currentInputElement = null;
}

// Apply the selected suggestion to the input
function applySuggestion(inputEl, suggestion) {
  inputEl.value = suggestion;
  // Trigger input event to ensure any listeners are notified
  inputEl.dispatchEvent(new Event('input', { bubbles: true }));
}

function handleInput(e) {
  const el = e.target;
  if (!el.value || el.value.length < 5) {
    // too short to check
    hideSuggestions();
    return;
  }
  chrome.runtime.sendMessage(
    { action: 'checkGrammar', text: el.value },
    (response) => {
      console.log('temporary response', response);
      const {success, suggestions} = response || {};
      if (success) return;
      if (!suggestions || suggestions.length === 0) return;
      showSuggestions(el, response.suggestions);
    }
  );
}

// Create debounced version of handleInput
const debouncedHandleInput = debounce(handleInput, 1000);

function listenToNewInputs(node) {
  // Match input elements that accept text (excluding buttons, checkboxes, radio, etc.)
  if (node.nodeName === 'INPUT' &&
    !['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'image', 'range', 'color', 'date', 'datetime-local', 'month', 'week', 'time'].includes(node.type) ||
    node.nodeName === 'TEXTAREA') {
    node.addEventListener('input', debouncedHandleInput);
  }
}

function initializeContentScript() {
  // Set up mutation observer for dynamically added elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) listenToNewInputs(node);
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Handle initial static inputs - updated selector to match more input types
  const textInputSelector = 'input:not([type="button"]):not([type="checkbox"]):not([type="radio"]):not([type="submit"]):not([type="reset"]):not([type="file"]):not([type="image"]):not([type="range"]):not([type="color"]):not([type="date"]):not([type="datetime-local"]):not([type="month"]):not([type="week"]):not([type="time"]), textarea';

  const initialInputs = document.querySelectorAll(textInputSelector);
  initialInputs.forEach((el) => {
    el.addEventListener('input', debouncedHandleInput);
  });

  // Specific check for the searchboxinput we found
  const searchBox = document.querySelector('#searchboxinput');
  if (searchBox) {
    searchBox.addEventListener('input', debouncedHandleInput);
  }
  
  // Create the suggestions dropdown initially
  createSuggestionsDropdown();
  
  // Add global click event listener to handle clicks outside the dropdown
  document.addEventListener('click', handleDocumentClick);

  console.log('Loaded English Assistant');
}

// Handle clicks on the document
function handleDocumentClick(e) {
  const dropdown = document.getElementById('eng-assistant-suggestions');
  if (!dropdown || dropdown.style.display === 'none') return;
  
  // If the click is outside both the dropdown and the input element, hide the dropdown
  if (!e.target.closest('#eng-assistant-suggestions') && e.target !== currentInputElement) {
    hideSuggestions();
  }
}

// Add keyboard navigation for suggestions
document.addEventListener('keydown', (e) => {
  const dropdown = document.getElementById('eng-assistant-suggestions');
  if (dropdown && dropdown.style.display === 'block') {
    const suggestions = dropdown.querySelectorAll('.eng-assistant-suggestion');
    const activeIndex = Array.from(suggestions).findIndex(el => el.classList.contains('active'));
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (activeIndex < suggestions.length - 1) {
          if (activeIndex >= 0) suggestions[activeIndex].classList.remove('active');
          suggestions[activeIndex + 1].classList.add('active');
          suggestions[activeIndex + 1].scrollIntoView({ block: 'nearest' });
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (activeIndex > 0) {
          suggestions[activeIndex].classList.remove('active');
          suggestions[activeIndex - 1].classList.add('active');
          suggestions[activeIndex - 1].scrollIntoView({ block: 'nearest' });
        }
        break;
      case 'Enter':
        if (activeIndex >= 0) {
          e.preventDefault();
          const activeEl = suggestions[activeIndex];
          const inputEl = document.activeElement;
          applySuggestion(inputEl, activeEl.textContent);
          hideSuggestions();
        }
        break;
      case 'Escape':
        hideSuggestions();
        break;
    }
  }
});

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  // If already loaded, run immediately
  initializeContentScript();
}
