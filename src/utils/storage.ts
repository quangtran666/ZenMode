import { ZenModeState, ZenModeSettings } from '../types';

// Default settings for initial setup
export const DEFAULT_SETTINGS: ZenModeSettings = {
  schedule: {
    enabled: false,
    autoStartWithChrome: false,
    timeRanges: []
  },
  timer: {
    duration: 25, // 25 minutes by default (Pomodoro technique)
    isActive: false,
    lockUntilComplete: false
  },
  sound: {
    type: 'rain',
    volume: 50,
    isPlaying: false
  },
  blockedSites: [
    { pattern: '*://*.facebook.com/*', isEnabled: true },
    { pattern: '*://*.twitter.com/*', isEnabled: true },
    { pattern: '*://*.instagram.com/*', isEnabled: true },
    { pattern: '*://*.youtube.com/*', isEnabled: true },
    { pattern: '*://*.reddit.com/*', isEnabled: true }
  ],
  motivationalQuotes: [
    { 
      id: '1', 
      text: 'Focus on being productive instead of busy.', 
      author: 'Tim Ferriss', 
      isCustom: false 
    },
    { 
      id: '2', 
      text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", 
      author: 'Stephen Covey', 
      isCustom: false 
    },
    { 
      id: '3', 
      text: "You don't have to see the whole staircase, just take the first step.", 
      author: 'Martin Luther King Jr.', 
      isCustom: false 
    },
    { 
      id: '4', 
      text: 'The secret of getting ahead is getting started.', 
      author: 'Mark Twain', 
      isCustom: false 
    },
    { 
      id: '5', 
      text: "Don't count the days, make the days count.", 
      author: 'Muhammad Ali', 
      isCustom: false 
    }
  ],
  passcodeEnabled: false,
  usePuzzleInsteadOfPasscode: false
};

// Default initial state
export const DEFAULT_STATE: ZenModeState = {
  isActive: false,
  history: [],
  settings: DEFAULT_SETTINGS
};

// Save state to Chrome Storage
export const saveState = async (state: ZenModeState): Promise<void> => {
  await chrome.storage.local.set({ zenModeState: state });
};

// Load state from Chrome Storage
export const loadState = async (): Promise<ZenModeState> => {
  const result = await chrome.storage.local.get('zenModeState');
  return result.zenModeState || DEFAULT_STATE;
};

// Update settings
export const updateSettings = async (settings: Partial<ZenModeSettings>): Promise<ZenModeState> => {
  const state = await loadState();
  const updatedState = {
    ...state,
    settings: {
      ...state.settings,
      ...settings
    }
  };
  
  await saveState(updatedState);
  return updatedState;
};

// Save work session
export const saveWorkSession = async (session: Partial<ZenModeState['currentSession']>): Promise<ZenModeState> => {
  const state = await loadState();
  
  const updatedState: ZenModeState = {
    ...state,
    currentSession: {
      ...state.currentSession,
      ...session
    } as any
  };
  
  await saveState(updatedState);
  return updatedState;
};

// Complete current work session and add to history
export const completeCurrentSession = async (): Promise<ZenModeState> => {
  const state = await loadState();
  
  if (!state.currentSession) {
    return state;
  }
  
  const completedSession = {
    ...state.currentSession,
    endTime: Date.now(),
    completed: true,
    duration: state.currentSession.startTime 
      ? Math.floor((Date.now() - state.currentSession.startTime) / 1000)
      : undefined
  };
  
  const updatedState: ZenModeState = {
    ...state,
    currentSession: undefined,
    history: [...state.history, completedSession]
  };
  
  await saveState(updatedState);
  return updatedState;
};

// Toggle ZenMode active state
export const toggleZenMode = async (isActive?: boolean): Promise<ZenModeState> => {
  const state = await loadState();
  
  const newActive = isActive !== undefined ? isActive : !state.isActive;
  
  let updatedState: ZenModeState = {
    ...state,
    isActive: newActive
  };
  
  if (newActive && !state.currentSession) {
    // Start a new session when activating
    updatedState.currentSession = {
      id: Date.now().toString(),
      startTime: Date.now(),
      completed: false
    };
  } else if (!newActive && state.currentSession) {
    // Complete the session when deactivating
    updatedState = await completeCurrentSession();
  }
  
  await saveState(updatedState);
  return updatedState;
}; 