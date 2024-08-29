chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'captureVisibleTab') {
    chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
      sendResponse({ dataUrl: dataUrl });
    });
    return true;
  } else if (message.action === 'downloadImage') {
    chrome.downloads.download({
      url: message.dataUrl,
      filename: 'd_webpage.png',
      saveAs: true
    });
  }
});
