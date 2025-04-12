import { ZenModeState, ZenTimer, AmbientSound } from '../types';

// DOM Elements
const zenModeToggle = document.getElementById('zenModeToggle') as HTMLInputElement;
const statusText = document.getElementById('status-text') as HTMLSpanElement;
const timerValue = document.getElementById('timer-value') as HTMLSpanElement;
const timerDuration = document.getElementById('timer-duration') as HTMLInputElement;
const startTimerBtn = document.getElementById('start-timer') as HTMLButtonElement;
const resumeTimerBtn = document.getElementById('resume-timer') as HTMLButtonElement;
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
let pausedTime = 0; // Store remaining time when paused
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
      startTimerBtn.classList.remove('hidden');
      resumeTimerBtn.classList.add('hidden');
    } else {
      // Timer has ended
      displayTime(0);
      startTimerBtn.textContent = 'Start';
      startTimerBtn.classList.remove('hidden');
      resumeTimerBtn.classList.add('hidden');
    }
  } else {
    // Display timer duration when not active
    displayTime(timerSettings.duration * 60);
    startTimerBtn.textContent = 'Start';
    
    // Show Resume button if we have a paused timer
    if (pausedTime > 0) {
      startTimerBtn.classList.add('hidden');
      resumeTimerBtn.classList.remove('hidden');
    } else {
      startTimerBtn.classList.remove('hidden');
      resumeTimerBtn.classList.add('hidden');
    }
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
  // ZenMode toggle - completely fresh approach
  const switchEl = document.querySelector('.switch') as HTMLLabelElement;
  
  if (switchEl) {
    // Clone and replace to remove any existing listeners
    const newSwitch = switchEl.cloneNode(true) as HTMLLabelElement;
    switchEl.parentNode?.replaceChild(newSwitch, switchEl);
    
    // Get the new checkbox reference but don't try to reassign zenModeToggle
    const newCheckbox = newSwitch.querySelector('input[type="checkbox"]') as HTMLInputElement;
    
    // Update our zenModeToggle reference for future use by using newCheckbox directly in functions
    // Create our custom click handler on the switch
    newSwitch.onclick = function(event) {
      // Prevent default toggle behavior
      event.preventDefault();
      event.stopPropagation();
      
      console.log("Switch clicked");
      
      if (!appState) {
        console.error("Cannot toggle: App state is null");
        return;
      }
      
      // Get current state from appState (the source of truth)
      const currentState = appState.isActive;
      
      // If currently on, need to verify before turning off
      if (currentState) {
        console.log("Currently ON, attempting to turn OFF");
        
        // Check if passcode verification is needed
        if (appState.settings.passcodeEnabled) {
          const passcode = prompt('Enter passcode to exit ZenMode:');
          if (passcode !== appState.settings.passcode) {
            alert('Incorrect passcode. Stay focused!');
            return; // Keep ZenMode on
          }
        } 
        // Check if puzzle verification is needed
        else if (appState.settings.usePuzzleInsteadOfPasscode) {
          const num1 = Math.floor(Math.random() * 20) + 1;
          const num2 = Math.floor(Math.random() * 20) + 1;
          const operation = Math.random() > 0.5 ? '+' : '*';
          const correctAnswer = operation === '+' ? num1 + num2 : num1 * num2;
          
          const userAnswer = prompt(`Solve this puzzle to exit ZenMode:\n${num1} ${operation} ${num2} = ?`);
          if (!userAnswer || parseInt(userAnswer) !== correctAnswer) {
            alert('Incorrect answer. Stay focused!');
            return; // Keep ZenMode on
          }
        }
        
        // Passed verification, turn off
        setZenModeState(false, newCheckbox);
      } else {
        // Turn on (no verification needed)
        console.log("Currently OFF, turning ON");
        setZenModeState(true, newCheckbox);
      }
      
      return false; // Prevent default
    };
  }
  
  // Helper function to set ZenMode state
  function setZenModeState(state: boolean, checkboxEl: HTMLInputElement) {
    console.log(`Setting ZenMode to: ${state}`);
    
    // Update UI first
    checkboxEl.checked = state;
    statusText.textContent = state ? 'ZenMode is on' : 'ZenMode is off';
    
    // Then send message to update backend
    chrome.runtime.sendMessage({
      type: 'TOGGLE_ZEN_MODE',
      payload: { isActive: state }
    }, (response) => {
      if (response && response.success) {
        // Update local state
        appState = response.state;
        updateUI();
        console.log(`ZenMode ${state ? 'activated' : 'deactivated'} successfully`);
      } else {
        // Revert UI on error
        console.error("Failed to update ZenMode state");
        checkboxEl.checked = !state;
        statusText.textContent = !state ? 'ZenMode is on' : 'ZenMode is off';
      }
    });
  }
  
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
      // Stop timer and save remaining time
      pausedTime = remainingTime;
      stopTimer();
    } else {
      // Start a new timer
      pausedTime = 0; // Reset paused time when starting fresh
      const duration = parseInt(timerDuration.value);
      const now = Date.now();
      const endTime = now + (duration * 60 * 1000);
      
      startNewTimer(duration, now, endTime);
    }
  });
  
  // Resume timer button
  resumeTimerBtn.addEventListener('click', () => {
    if (!appState || pausedTime <= 0) return;
    
    // Calculate new end time based on remaining time
    const now = Date.now();
    const endTime = now + (pausedTime * 1000);
    
    // Use the original duration from settings to maintain context
    const duration = appState.settings.timer.duration;
    
    startNewTimer(duration, now, endTime);
    pausedTime = 0; // Reset paused time after resuming
  });
  
  // Function to start a new timer
  function startNewTimer(duration: number, startTime: number, endTime: number) {
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS',
      payload: { 
        timer: { 
          isActive: true,
          duration,
          startTime,
          endTime
        }
      }
    }, (response) => {
      if (response && response.success) {
        appState = response.state;
        remainingTime = Math.floor((endTime - Date.now()) / 1000);
        startTimer();
        startTimerBtn.textContent = 'Stop';
        startTimerBtn.classList.remove('hidden');
        resumeTimerBtn.classList.add('hidden');
      }
    });
  }
  
  // Function to stop the timer
  function stopTimer() {
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
        
        startTimerBtn.classList.add('hidden');
        resumeTimerBtn.classList.remove('hidden');
        updateUI();
      }
    });
  }
  
  // Reset timer button
  resetTimerBtn.addEventListener('click', () => {
    if (!appState) return;
    
    // Reset paused time
    pausedTime = 0;
    
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
        startTimerBtn.classList.remove('hidden');
        resumeTimerBtn.classList.add('hidden');
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