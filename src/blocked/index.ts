import { ZenModeState } from '../types';

// DOM Elements
const quoteText = document.getElementById('quote-text') as HTMLParagraphElement;
const quoteAuthor = document.getElementById('quote-author') as HTMLParagraphElement;
const backButton = document.getElementById('back-button') as HTMLButtonElement;
const remainingTime = document.getElementById('remaining-time') as HTMLDivElement;

// App state
let appState: ZenModeState | null = null;
let timerInterval: number | null = null;

// Initialize blocked page
function initialize() {
  // Get current state from background
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response && response.success) {
      appState = response.state;
      
      // Display random motivational quote
      displayRandomQuote();
      
      // Show remaining time if timer is active
      if (appState?.settings?.timer?.isActive && appState?.settings?.timer?.endTime) {
        startRemainingTimeCounter();
      } else {
        remainingTime.textContent = '';
      }
    }
  });
  
  // Setup event listeners
  setupEventListeners();
}

// Display a random motivational quote
function displayRandomQuote() {
  if (!appState) return;
  
  const quotes = appState.settings.motivationalQuotes;
  
  if (quotes.length > 0) {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    const quote = quotes[randomIndex];
    
    quoteText.textContent = quote.text;
    quoteAuthor.textContent = `— ${quote.author || 'Unknown'}`;
  }
}

// Start counting down remaining time in ZenMode
function startRemainingTimeCounter() {
  if (!appState || !appState.settings.timer.endTime) return;
  
  // Update immediately
  updateRemainingTime();
  
  // Then update every second
  timerInterval = setInterval(updateRemainingTime, 1000) as unknown as number;
}

// Update the remaining time display
function updateRemainingTime() {
  if (!appState || !appState.settings.timer.endTime) return;
  
  const now = Date.now();
  const endTime = appState.settings.timer.endTime;
  
  if (now >= endTime) {
    // Timer has ended
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    
    remainingTime.textContent = 'Your focus session has ended.';
    return;
  }
  
  // Calculate remaining time
  const remainingMs = endTime - now;
  const remainingMinutes = Math.floor(remainingMs / (1000 * 60));
  const remainingSeconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
  
  remainingTime.textContent = `${remainingMinutes}:${remainingSeconds.toString().padStart(2, '0')} remaining in your focus session`;
}

// Setup event listeners
function setupEventListeners() {
  // Back button
  backButton.addEventListener('click', () => {
    // Go back to previous page
    window.history.back();
  });
}

// Check if we can exit early
function checkEarlyExit() {
  if (!appState) return;
  
  // Check if passcode is required
  if (appState.settings.timer.lockUntilComplete) {
    // Show passcode dialog
    const passcode = prompt('Enter passcode to exit ZenMode early:');
    
    if (passcode === appState.settings.passcode) {
      // Correct passcode, allow exit
      chrome.runtime.sendMessage({ 
        type: 'TOGGLE_ZEN_MODE',
        payload: { isActive: false }
      });
      
      window.history.back();
    } else {
      // Incorrect passcode
      alert('Incorrect passcode. Stay focused!');
    }
  } else {
    // No passcode required, just go back
    window.history.back();
  }
}

// Initialize the blocked page
document.addEventListener('DOMContentLoaded', initialize); 