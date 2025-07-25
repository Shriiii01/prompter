// Background script for AI Magic - Prompt Enhancer
console.log('AI Magic - Prompt Enhancer background script loaded');

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
    console.log('Extension installed:', details.reason);
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background received message:', message);
    sendResponse({ status: 'received' });
}); 