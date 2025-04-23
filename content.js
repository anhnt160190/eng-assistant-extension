function debounce(func, wait) {
  let timeout;
  return function (...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}

function handleInput(e) {
  const el = e.target;
  if (!el.value || el.value.length < 5) {
    // console.log('Input too short, ignoring');
    return;
  }
  chrome.runtime.sendMessage(
    { action: 'checkGrammar', text: el.value },
    (response) => {
      console.log('temporary response', response);
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

  console.log('Loaded English Assistant');
}

// Wait for DOM to be fully loaded before initializing
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  // If already loaded, run immediately
  initializeContentScript();
}
