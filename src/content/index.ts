import { Message, MotivationalQuote } from '../types';

let audioElement: HTMLAudioElement | null = null;
let zenOverlay: HTMLDivElement | null = null;

// Initialize content script
function initialize() {
  console.log('ZenMode content script initialized');
  
  // Listen for messages from background script
  chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
    switch (message.type) {
      case 'PLAY_SOUND':
        playSound(message.payload?.soundType, message.payload?.volume, message.payload?.customUrl);
        sendResponse({ success: true });
        break;
        
      case 'STOP_SOUND':
        stopSound();
        sendResponse({ success: true });
        break;
        
      case 'BLOCK_SITE':
        showBlockedOverlay(message.payload?.quotes);
        sendResponse({ success: true });
        break;
        
      case 'ALLOW_SITE':
        removeBlockedOverlay();
        sendResponse({ success: true });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  });
}

// Play ambient sound
function playSound(soundType: string = 'rain', volume: number = 50, customUrl?: string) {
  // Stop any existing sound first
  stopSound();
  
  // Create new audio element
  audioElement = document.createElement('audio');
  audioElement.loop = true;
  audioElement.style.display = 'none';
  
  // Set source based on type or custom URL
  if (customUrl) {
    audioElement.src = customUrl;
  } else {
    // Use local sounds from extension
    audioElement.src = chrome.runtime.getURL(`sounds/${soundType}.mp3`);
  }
  
  // Set volume (0-1 scale)
  audioElement.volume = volume / 100;
  
  // Add to page and play
  document.body.appendChild(audioElement);
  audioElement.play().catch(err => {
    console.error('Failed to play sound:', err);
  });
}

// Stop currently playing sound
function stopSound() {
  if (audioElement) {
    audioElement.pause();
    audioElement.remove();
    audioElement = null;
  }
}

// Show overlay when site is blocked
function showBlockedOverlay(quotes: MotivationalQuote[] = []) {
  // Create overlay if it doesn't exist
  if (!zenOverlay) {
    zenOverlay = document.createElement('div');
    zenOverlay.id = 'zen-mode-overlay';
    document.body.appendChild(zenOverlay);
    
    // Apply styles
    Object.assign(zenOverlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(25, 25, 25, 0.95)',
      zIndex: '9999999',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif',
      color: 'white',
      textAlign: 'center',
      padding: '2rem'
    });
  }
  
  // Select a random quote
  const quote = quotes.length > 0 
    ? quotes[Math.floor(Math.random() * quotes.length)] 
    : { text: 'Stay focused on what matters.', author: 'ZenMode' };
  
  // Create content
  zenOverlay.innerHTML = `
    <div style="max-width: 600px;">
      <h1 style="font-size: 2.5rem; margin-bottom: 2rem;">Take a breath...</h1>
      <div style="font-size: 1.5rem; line-height: 1.6; margin-bottom: 1.5rem;">
        "${quote.text}"
      </div>
      <div style="font-size: 1.1rem; opacity: 0.8; margin-bottom: 3rem;">
        — ${quote.author || 'Unknown'}
      </div>
      <button id="zen-back-to-work" style="
        background-color: #4a6fa5;
        border: none;
        color: white;
        padding: 12px 24px;
        font-size: 1rem;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.3s;
      ">Back to Work</button>
    </div>
  `;
  
  // Add event listener to the button
  const backButton = zenOverlay.querySelector('#zen-back-to-work');
  if (backButton) {
    backButton.addEventListener('click', () => {
      // Go back to the previous page or to a safe default
      window.history.back();
    });
  }
}

// Remove blocked overlay
function removeBlockedOverlay() {
  if (zenOverlay) {
    zenOverlay.remove();
    zenOverlay = null;
  }
}

// Initialize the content script
initialize(); 