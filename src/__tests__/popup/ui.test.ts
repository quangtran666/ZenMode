/**
 * @jest-environment jsdom
 */
/// <reference types="jest" />

import { ZenModeState } from '../../types';

describe('Popup UI Tests', () => {
  // DOM Elements
  let zenModeToggle: HTMLInputElement;
  let statusText: HTMLSpanElement;
  let timerValue: HTMLSpanElement;
  let timerDuration: HTMLInputElement;
  let startTimerBtn: HTMLButtonElement;
  let resumeTimerBtn: HTMLButtonElement;
  let resetTimerBtn: HTMLButtonElement;
  let soundSelect: HTMLSelectElement;
  let customSoundUrl: HTMLInputElement;
  let volumeControl: HTMLInputElement;
  let toggleSoundBtn: HTMLButtonElement;
  let sessionCount: HTMLSpanElement;
  let totalTime: HTMLSpanElement;

  // Mock state
  const mockState: ZenModeState = {
    isActive: false,
    history: [
      {
        id: '1',
        startTime: Date.now() - 3600000, // 1 hour ago
        endTime: Date.now() - 1800000, // 30 minutes ago
        duration: 1800, // 30 minutes in seconds
        completed: true
      }
    ],
    settings: {
      schedule: {
        enabled: false,
        autoStartWithChrome: false,
        timeRanges: []
      },
      timer: {
        duration: 25,
        isActive: false,
        lockUntilComplete: false
      },
      sound: {
        type: 'rain',
        volume: 50,
        isPlaying: false
      },
      blockedSites: [],
      motivationalQuotes: [],
      passcodeEnabled: false,
      usePuzzleInsteadOfPasscode: false
    }
  };

  // Mock chrome.runtime.sendMessage
  beforeEach(() => {
    // Set up DOM
    document.body.innerHTML = `
      <div class="container">
        <header>
          <div class="logo">
            <img src="" alt="ZenMode" width="48" height="48">
            <h1>ZenMode</h1>
          </div>
          <div class="toggle-container">
            <label class="switch">
              <input type="checkbox" id="zenModeToggle">
              <span class="slider"></span>
            </label>
            <span id="status-text">ZenMode is off</span>
          </div>
        </header>
        
        <div class="timer-section">
          <h2>Zen Timer</h2>
          <div class="timer-display">
            <span id="timer-value">25:00</span>
          </div>
          <div class="timer-controls">
            <input type="range" id="timer-duration" min="1" max="120" value="25">
            <div class="timer-labels">
              <span>1 min</span>
              <span>60 min</span>
              <span>120 min</span>
            </div>
            <div class="buttons">
              <button id="start-timer" class="primary">Start</button>
              <button id="resume-timer" class="primary hidden">Resume</button>
              <button id="reset-timer">Reset</button>
            </div>
          </div>
        </div>
        
        <div class="sound-section">
          <h2>Ambient Sounds</h2>
          <div class="sound-controls">
            <select id="sound-select">
              <option value="rain">Rain</option>
              <option value="white-noise">White Noise</option>
              <option value="cafe">Café</option>
              <option value="ocean">Ocean</option>
              <option value="nature">Nature</option>
              <option value="fireplace">Fireplace</option>
              <option value="custom">Custom URL</option>
            </select>
            <input type="text" id="custom-sound-url" placeholder="Enter Spotify/YouTube URL" class="hidden">
            <div class="volume-container">
              <input type="range" id="volume-control" min="0" max="100" value="50">
              <div class="volume-icon">🔊</div>
            </div>
            <button id="toggle-sound" class="secondary">Play</button>
          </div>
        </div>
        
        <div class="stats-section">
          <h2>Today's Progress</h2>
          <div class="stats">
            <div class="stat-item">
              <span class="stat-value" id="session-count">0</span>
              <span class="stat-label">Sessions</span>
            </div>
            <div class="stat-item">
              <span class="stat-value" id="total-time">0:00</span>
              <span class="stat-label">Total Time</span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Get DOM elements
    zenModeToggle = document.getElementById('zenModeToggle') as HTMLInputElement;
    statusText = document.getElementById('status-text') as HTMLSpanElement;
    timerValue = document.getElementById('timer-value') as HTMLSpanElement;
    timerDuration = document.getElementById('timer-duration') as HTMLInputElement;
    startTimerBtn = document.getElementById('start-timer') as HTMLButtonElement;
    resumeTimerBtn = document.getElementById('resume-timer') as HTMLButtonElement;
    resetTimerBtn = document.getElementById('reset-timer') as HTMLButtonElement;
    soundSelect = document.getElementById('sound-select') as HTMLSelectElement;
    customSoundUrl = document.getElementById('custom-sound-url') as HTMLInputElement;
    volumeControl = document.getElementById('volume-control') as HTMLInputElement;
    toggleSoundBtn = document.getElementById('toggle-sound') as HTMLButtonElement;
    sessionCount = document.getElementById('session-count') as HTMLSpanElement;
    totalTime = document.getElementById('total-time') as HTMLSpanElement;

    // Mock chrome API
    chrome.runtime.sendMessage = jest.fn().mockImplementation((message, callback) => {
      if (message.type === 'GET_STATE') {
        callback?.({ success: true, state: mockState });
      } else if (message.type === 'TOGGLE_ZEN_MODE') {
        const updatedState = {
          ...mockState,
          isActive: message.payload?.isActive
        };
        callback?.({ success: true, state: updatedState });
      } else if (message.type === 'UPDATE_SETTINGS') {
        const updatedState = {
          ...mockState,
          settings: {
            ...mockState.settings,
            ...message.payload
          }
        };
        callback?.({ success: true, state: updatedState });
      }
      return true;
    });
  });

  afterEach(() => {
    // Clean up
    jest.clearAllMocks();
    document.body.innerHTML = '';
  });

  // Load the popup module - dynamic import to prevent module registration errors
  const loadPopupModule = async () => {
    // We need to dynamically import to ensure the module runs after our mocks are set up
    try {
      jest.isolateModules(() => {
        require('../../popup/index');
      });
    } catch (error) {
      console.error('Error loading popup module:', error);
    }
  };

  it('should initialize the UI with correct values', async () => {
    await loadPopupModule();

    // Trigger DOMContentLoaded event
    const event = new Event('DOMContentLoaded');
    document.dispatchEvent(event);

    // Let async initialization complete
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check that the UI was initialized with values from the state
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'GET_STATE' },
      expect.any(Function)
    );

    // Check that timer duration is set correctly
    expect(timerDuration.value).toBe('25');
    expect(timerValue.textContent).toBe('25:00');

    // Sound settings should match state
    expect(soundSelect.value).toBe('rain');
    expect(volumeControl.value).toBe('50');
    expect(toggleSoundBtn.textContent).toBe('Play');
  });

  it('should toggle ZenMode when the switch is clicked', async () => {
    await loadPopupModule();
    
    // Trigger DOMContentLoaded event
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initial state
    expect(zenModeToggle.checked).toBe(false);
    expect(statusText.textContent).toBe('ZenMode is off');
    
    // Simulate click on the switch
    const switchElement = document.querySelector('.switch') as HTMLLabelElement;
    switchElement.click();
    
    // Let the async handler complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that sendMessage was called with correct arguments
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'TOGGLE_ZEN_MODE', payload: { isActive: true } },
      expect.any(Function)
    );
  });

  it('should update timer settings when duration is changed', async () => {
    await loadPopupModule();
    
    // Trigger DOMContentLoaded event
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Initial timer value
    expect(timerValue.textContent).toBe('25:00');
    
    // Change timer duration
    timerDuration.value = '30';
    timerDuration.dispatchEvent(new Event('input'));
    
    // Let the async handler complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify that sendMessage was called with correct arguments
    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      { type: 'UPDATE_SETTINGS', payload: { timer: { duration: 30 } } },
      expect.any(Function)
    );
  });
}); 