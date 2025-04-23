// Background service worker for English Assistant

// Set up initial storage values if they don't exist
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['grammarCheckEnabled'], (result) => {
    if (result.grammarCheckEnabled === undefined) {
      chrome.storage.sync.set({ grammarCheckEnabled: true });
      console.log('Initial preferences set: auto checking grammar and suggestions enabled');
    }
  });
});

// Handle messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Service worker received message:', message);
  
  if (message.action === 'checkGrammar') {
    // Here you would typically make an API call to a grammar checking service
    // For now, we'll return mock suggestions
    
    // Example response with mock suggestions
    const mockSuggestions = [
      'This is a suggested correction',
      'Another possible improvement',
      'A third alternative wording'
    ];
    
    // Simulate API delay
    setTimeout(() => {
      sendResponse({ 
        success: false,
        suggestions: mockSuggestions,
        text: message.text
      });
    }, 300);
    
    // Return true to indicate we'll respond asynchronously
    return true;
  }
  
  // For other message types
  sendResponse({ received: true });
  return true;
});

// Listen for connection errors and log them
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  console.log('External message received:', message, 'from:', sender);
  sendResponse({ received: true });
  return true;
});

console.log('English Assistant service worker initialized');
