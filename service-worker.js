chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {  
  if (message.action === 'checkGrammar') {
    // temporary response
    sendResponse({ 
      success: true, 
      suggestions: ['suggestion 1', 'suggestion 2', 'suggestion 3']
    });
  }
  return true;
});
