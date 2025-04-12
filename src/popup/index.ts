import { ZenModeState, ZenTimer, AmbientSound } from '../types';

// DOM Elements
const zenModeToggle = document.getElementById('zenModeToggle') as HTMLInputElement;
const statusText = document.getElementById('status-text') as HTMLSpanElement;
const timerValue = document.getElementById('timer-value') as HTMLSpanElement;
const timerDuration = document.getElementById('timer-duration') as HTMLInputElement;
const startTimerBtn = document.getElementById('start-timer') as HTMLButtonElement;
const resetTimerBtn = document.getElementById('reset-timer') as HTMLButtonElement;
const soundSelect = document.getElementById('sound-select') as HTMLSelectElement;
const customSoundUrl = document.getElementById('custom-sound-url') as HTMLInputElement;
const volumeControl = document.getElementById('volume-control') as HTMLInputElement;
const toggleSoundBtn = document.getElementById('toggle-sound') as HTMLButtonElement;
const sessionCount = document.getElementById('session-count') as HTMLSpanElement;
const totalTime = document.getElementById('total-time') as HTMLSpanElement;
const showSettingsBtn = document.getElementById('show-settings') as HTMLButtonElement;
const viewHistoryBtn = document.getElementById('view-history') as HTMLButtonElement;

// Timer variables
let timer: number | null = null;
let remainingTime = 0;
let appState: ZenModeState | null = null;

// Initialize popup
async function initialize() {
  // Get current state from background
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response && response.success) {
      appState = response.state;
      updateUI();
    }
  });
  
  // Setup event listeners
  setupEventListeners();
  
  // Example: Programmatically access Logo.png
  const logoImage = document.querySelector('.logo img') as HTMLImageElement;
  if (logoImage) {
    // Dynamic way to access Logo.png using chrome.runtime.getURL
    const logoUrl = chrome.runtime.getURL('images/Logo.png');
    logoImage.src = logoUrl;
    console.log('Logo image set dynamically:', logoUrl);
  }
}

// Update UI based on current state
function updateUI() {
  if (!appState) return;
  
  // Update ZenMode toggle
  zenModeToggle.checked = appState.isActive;
  statusText.textContent = appState.isActive ? 'ZenMode is on' : 'ZenMode is off';
  
  // Update timer settings
  const timerSettings = appState.settings.timer;
  timerDuration.value = timerSettings.duration.toString();
  updateTimerDisplay(timerSettings);
  
  // Update sound settings
  const soundSettings = appState.settings.sound;
  soundSelect.value = soundSettings.type;
  volumeControl.value = soundSettings.volume.toString();
  toggleSoundBtn.textContent = soundSettings.isPlaying ? 'Stop' : 'Play';
  
  if (soundSettings.type === 'custom' && soundSettings.customUrl) {
    customSoundUrl.value = soundSettings.customUrl;
    customSoundUrl.classList.remove('hidden');
  } else {
    customSoundUrl.classList.add('hidden');
  }
  
  // Update stats
  updateStats();
}

// Update timer display
function updateTimerDisplay(timerSettings: ZenTimer) {
  if (timerSettings.isActive && timerSettings.startTime && timerSettings.endTime) {
    // Calculate remaining time for active timer
    const now = Date.now();
    const endTime = timerSettings.endTime;
    
    if (now < endTime) {
      remainingTime = Math.floor((endTime - now) / 1000);
      displayTime(remainingTime);
      startTimer();
      startTimerBtn.textContent = 'Stop';
    } else {
      // Timer has ended
      displayTime(0);
      startTimerBtn.textContent = 'Start';
    }
  } else {
    // Display timer duration when not active
    displayTime(timerSettings.duration * 60);
    startTimerBtn.textContent = 'Start';
  }
}

// Display time in mm:ss format
function displayTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  timerValue.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Start timer countdown
function startTimer() {
  if (timer) {
    clearInterval(timer);
  }
  
  timer = setInterval(() => {
    remainingTime--;
    
    if (remainingTime <= 0) {
      clearInterval(timer as number);
      timer = null;
      displayTime(0);
      
      // Notify timer completion
      chrome.runtime.sendMessage({ 
        type: 'TIMER_COMPLETED' 
      });
      
      startTimerBtn.textContent = 'Start';
    } else {
      displayTime(remainingTime);
    }
  }, 1000) as unknown as number;
}

// Update stats display
function updateStats() {
  if (!appState) return;
  
  // Count sessions completed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaySessions = appState.history.filter(session => {
    const sessionDate = new Date(session.startTime);
    return sessionDate >= today && session.completed;
  });
  
  // Update session count
  sessionCount.textContent = todaySessions.length.toString();
  
  // Calculate total time
  const totalSeconds = todaySessions.reduce((total, session) => {
    return total + (session.duration || 0);
  }, 0);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    totalTime.textContent = `${hours}h ${minutes}m`;
  } else {
    totalTime.textContent = `${minutes}m`;
  }
}

// Setup event listeners
function setupEventListeners() {
  // ZenMode toggle
  zenModeToggle.addEventListener('change', () => {
    chrome.runtime.sendMessage({ 
      type: 'TOGGLE_ZEN_MODE',
      payload: { isActive: zenModeToggle.checked }
    }, (response) => {
      if (response && response.success) {
        appState = response.state;
        updateUI();
      }
    });
  });
  
  // Timer duration slider
  timerDuration.addEventListener('input', () => {
    const duration = parseInt(timerDuration.value);
    displayTime(duration * 60);
    
    // Update settings in background
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS',
      payload: { 
        timer: { 
          duration
        }
      }
    }, (response) => {
      if (response && response.success) {
        appState = response.state;
      }
    });
  });
  
  // Start/Stop timer button
  startTimerBtn.addEventListener('click', () => {
    if (!appState) return;
    
    const isTimerActive = appState.settings.timer.isActive;
    
    if (isTimerActive) {
      // Stop timer
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS',
        payload: { 
          timer: { 
            isActive: false,
            startTime: undefined,
            endTime: undefined
          }
        }
      }, (response) => {
        if (response && response.success) {
          appState = response.state;
          
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          
          startTimerBtn.textContent = 'Start';
          updateUI();
        }
      });
    } else {
      // Start timer
      const duration = parseInt(timerDuration.value);
      const now = Date.now();
      const endTime = now + (duration * 60 * 1000);
      
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS',
        payload: { 
          timer: { 
            isActive: true,
            duration,
            startTime: now,
            endTime
          }
        }
      }, (response) => {
        if (response && response.success) {
          appState = response.state;
          remainingTime = duration * 60;
          startTimer();
          startTimerBtn.textContent = 'Stop';
        }
      });
    }
  });
  
  // Reset timer button
  resetTimerBtn.addEventListener('click', () => {
    if (!appState) return;
    
    // Stop and reset timer
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS',
      payload: { 
        timer: { 
          isActive: false,
          startTime: undefined,
          endTime: undefined
        }
      }
    }, (response) => {
      if (response && response.success) {
        appState = response.state;
        
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        
        const duration = parseInt(timerDuration.value);
        displayTime(duration * 60);
        startTimerBtn.textContent = 'Start';
      }
    });
  });
  
  // Sound select
  soundSelect.addEventListener('change', () => {
    const soundType = soundSelect.value as AmbientSound['type'];
    
    // Show/hide custom URL input
    if (soundType === 'custom') {
      customSoundUrl.classList.remove('hidden');
    } else {
      customSoundUrl.classList.add('hidden');
      
      // Update sound settings
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS',
        payload: { 
          sound: { 
            type: soundType
          }
        }
      }, (response) => {
        if (response && response.success) {
          appState = response.state;
        }
      });
    }
  });
  
  // Custom sound URL
  customSoundUrl.addEventListener('blur', () => {
    const customUrl = customSoundUrl.value;
    
    if (customUrl) {
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS',
        payload: { 
          sound: { 
            type: 'custom',
            customUrl
          }
        }
      }, (response) => {
        if (response && response.success) {
          appState = response.state;
        }
      });
    }
  });
  
  // Volume control
  volumeControl.addEventListener('input', () => {
    const volume = parseInt(volumeControl.value);
    
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS',
      payload: { 
        sound: { 
          volume
        }
      }
    }, (response) => {
      if (response && response.success) {
        appState = response.state;
      }
    });
  });
  
  // Toggle sound button
  toggleSoundBtn.addEventListener('click', () => {
    if (!appState) return;
    
    const isPlaying = appState.settings.sound.isPlaying;
    
    chrome.runtime.sendMessage({ 
      type: isPlaying ? 'STOP_SOUND' : 'PLAY_SOUND',
      payload: isPlaying ? undefined : {
        soundType: appState.settings.sound.type,
        volume: appState.settings.sound.volume,
        customUrl: appState.settings.sound.customUrl
      }
    }, () => {
      // Update sound playing state
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS',
        payload: { 
          sound: { 
            isPlaying: !isPlaying
          }
        }
      }, (response) => {
        if (response && response.success) {
          appState = response.state;
          toggleSoundBtn.textContent = !isPlaying ? 'Stop' : 'Play';
        }
      });
    });
  });
  
  // Settings button
  showSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // History button
  viewHistoryBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
  });
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', initialize); 