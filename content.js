// Create a tooltip element and return it
const createTooltip = () => {
  const tooltipEl = document.createElement('div');
  tooltipEl.className = 'eng-assistant-tooltip';
  document.body.appendChild(tooltipEl);
  return tooltipEl;
};

// Create a button with an icon for the tooltip
const createButton = (iconType, tooltip) => {
  const button = document.createElement('button');
  button.className = `eng-assistant-btn eng-assistant-btn-${iconType}`;
  
  // Create icon element
  const icon = document.createElement('span');
  icon.className = `eng-assistant-icon eng-assistant-icon-${iconType}`;
  
  // Add tooltip attribute
  if (tooltip) {
    button.setAttribute('title', tooltip);
  }
  
  button.appendChild(icon);
  return button;
};

// Position the tooltip near the selected text
const positionTooltip = (tooltipEl, selection) => {
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  
  tooltipEl.style.top = `${window.scrollY + rect.bottom - 80}px`;
  tooltipEl.style.left = `${window.scrollX + rect.left + 120}px`;
  tooltipEl.style.display = 'flex';
};

// Function to show suggestions
const showSuggestions = (tooltipEl, suggestions) => {
  // Save the position
  const position = {
    top: tooltipEl.style.top,
    left: tooltipEl.style.left
  };
  
  // Clear previous content
  tooltipEl.innerHTML = '';
  
  // Add a back button
  const backButton = document.createElement('button');
  backButton.className = 'eng-assistant-btn eng-assistant-btn-back';
  const backIcon = document.createElement('span');
  backIcon.className = 'eng-assistant-icon eng-assistant-icon-back';
  backButton.appendChild(backIcon);
  backButton.setAttribute('title', 'Back to options');
  
  // Add event listener to back button
  backButton.addEventListener('click', () => {
    // Restore tooltip to original state
    tooltipEl.innerHTML = '';
    
    // Recreate buttons
    const checkButton = createButton('grammar', 'Check Grammar');
    const translateButton = createButton('translate', 'Translate');
    
    // Re-add event listeners
    checkButton.addEventListener('click', () => {
      // We don't need to do the API call again since we already have the suggestions
      showSuggestions(tooltipEl, suggestions);
    });
    
    // Add buttons back to tooltip
    tooltipEl.appendChild(checkButton);
    tooltipEl.appendChild(translateButton);
    
    // Restore tooltip position
    tooltipEl.style.top = position.top;
    tooltipEl.style.left = position.left;
  });
  
  // Create suggestions container
  const suggestionsContainer = document.createElement('div');
  suggestionsContainer.className = 'eng-assistant-suggestions-container';
  
  // Add heading
  const heading = document.createElement('div');
  heading.innerText = 'Suggestions';
  heading.className = 'eng-assistant-heading';
  suggestionsContainer.appendChild(heading);
  
  // Create list
  const list = document.createElement('ul');
  list.className = 'eng-assistant-list';
  
  // Add suggestions
  suggestions.forEach(suggestion => {
    const item = document.createElement('li');
    item.innerText = suggestion;
    item.className = 'eng-assistant-list-item';
    item.addEventListener('click', () => {
      // Apply the suggestion (in a real app)
      console.log('Applied suggestion:', suggestion);
      tooltipEl.style.display = 'none';
    });
    list.appendChild(item);
  });
  
  suggestionsContainer.appendChild(list);
  
  // Add back button and suggestions container to tooltip
  tooltipEl.appendChild(backButton);
  tooltipEl.appendChild(suggestionsContainer);
};

// Inject CSS file
const injectCSS = () => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = chrome.runtime.getURL('content.css');
  document.head.appendChild(link);
};

const init = () => {
  // Inject CSS
  injectCSS();
  
  // Create a tooltip element
  const tooltipEl = createTooltip();

  // Add event to show the tooltip when text is selected
  document.addEventListener("mouseup", (event) => {
    const selectedText = window.getSelection().toString().trim();
    
    if (selectedText.length > 0) {
      // Clear previous content
      tooltipEl.innerHTML = '';
      
      // Add options
      const checkButton = createButton('grammar', 'Check Grammar');
      const translateButton = createButton('translate', 'Translate');
      
      // Add event listeners
      checkButton.addEventListener('click', () => {
        chrome.runtime.sendMessage({
          action: 'checkGrammar',
          text: selectedText
        }, (response) => {
          if (response && response.suggestions) {
            showSuggestions(tooltipEl, response.suggestions);
          }
        });
      });
      
      // Add buttons to tooltip
      tooltipEl.appendChild(checkButton);
      tooltipEl.appendChild(translateButton);
      
      // Position the tooltip near the selection
      positionTooltip(tooltipEl, window.getSelection());
    }
  });
  
  // Hide tooltip when clicking elsewhere
  document.addEventListener('mousedown', (event) => {
    if (!tooltipEl.contains(event.target)) {
      tooltipEl.style.display = 'none';
    }
  });
}

init();