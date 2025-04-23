document.addEventListener('DOMContentLoaded', () => {
  const toggleSwitch = document.getElementById('grammarCheckSwitch');
  const statusText = document.getElementById('statusText');
  
  // Load saved state
  chrome.storage.sync.get(['grammarCheckEnabled'], (result) => {
    // Default to enabled if not set
    const isEnabled = result.grammarCheckEnabled !== undefined ? result.grammarCheckEnabled : true;
    toggleSwitch.checked = isEnabled;
    updateStatusText(isEnabled);
  });
  
  // Handle toggle changes
  toggleSwitch.addEventListener('change', (e) => {
    const isEnabled = e.target.checked;
    
    // Save to storage
    chrome.storage.sync.set({ grammarCheckEnabled: isEnabled });
    
    // Update status text
    updateStatusText(isEnabled);
    
    // Notify content script about the change - with error handling
    sendMessageToActiveTab(isEnabled);
  });
  
  function updateStatusText(isEnabled) {
    statusText.textContent = isEnabled 
      ? 'Auto checking grammar and suggestions is enabled' 
      : 'Auto checking grammar and suggestions is disabled';
  }
  
  // Improved function to send messages to active tab with error handling
  function sendMessageToActiveTab(isEnabled) {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      if (!tabs || !tabs[0] || !tabs[0].id) {
        console.log('No active tab found');
        return;
      }
      
      try {
        chrome.tabs.sendMessage(
          tabs[0].id, 
          { action: 'toggleGrammarCheck', enabled: isEnabled },
          // Add a response callback
          (response) => {
            if (chrome.runtime.lastError) {
              // Silently handle the error - connection couldn't be established
              console.log('Could not connect to the content script:', chrome.runtime.lastError.message);
            } else if (response) {
              console.log('Setting updated successfully:', response);
            }
          }
        );
      } catch (error) {
        console.log('Error sending message:', error);
      }
    });
  }
}); 