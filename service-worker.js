chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {  
  if (message.action === 'checkGrammar') {
    // temporary response
    sendResponse({ 
      success: true, 
      message: 'Grammar check completed',
      text: message.text
    });
  }
  return true;
});
