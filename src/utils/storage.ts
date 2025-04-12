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
    lockUntilComplete: false,
    timerMode: 'countdown' // Default to countdown mode
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
  try {
    const result = await chrome.storage.local.get('zenModeState');
    
    // Nếu không có dữ liệu, sử dụng state mặc định
    if (!result || !result.zenModeState) {
      return DEFAULT_STATE;
    }
    
    // Đảm bảo state có đủ các thuộc tính cần thiết bằng cách merge với DEFAULT_STATE
    const state: ZenModeState = {
      ...DEFAULT_STATE,
      ...result.zenModeState,
      // Đảm bảo settings luôn đầy đủ
      settings: {
        ...DEFAULT_STATE.settings,
        ...(result.zenModeState.settings || {}),
        // Đảm bảo các thuộc tính con trong settings cũng đầy đủ
        schedule: {
          ...DEFAULT_STATE.settings.schedule,
          ...(result.zenModeState.settings?.schedule || {})
        },
        timer: {
          ...DEFAULT_STATE.settings.timer,
          ...(result.zenModeState.settings?.timer || {})
        },
        sound: {
          ...DEFAULT_STATE.settings.sound,
          ...(result.zenModeState.settings?.sound || {})
        }
      },
      // Đảm bảo history luôn là mảng
      history: Array.isArray(result.zenModeState.history) ? result.zenModeState.history : []
    };
    
    return state;
  } catch (error) {
    console.error('Error loading state:', error);
    return DEFAULT_STATE;
  }
};

// Update settings
export const updateSettings = async (settings: Partial<ZenModeSettings>): Promise<ZenModeState> => {
  const state = await loadState();
  
  // Create a deep copy of the updated settings with proper handling of nested objects
  const updatedSettings = {
    ...state.settings,
  };
  
  // Handle each potential settings category separately to ensure proper nesting
  if (settings.timer) {
    updatedSettings.timer = {
      ...state.settings.timer,
      ...settings.timer
    };
  }
  
  if (settings.sound) {
    updatedSettings.sound = {
      ...state.settings.sound,
      ...settings.sound
    };
  }
  
  if (settings.schedule) {
    updatedSettings.schedule = {
      ...state.settings.schedule,
      ...settings.schedule
    };
  }
  
  if (settings.blockedSites) {
    updatedSettings.blockedSites = settings.blockedSites;
  }
  
  if (settings.motivationalQuotes) {
    updatedSettings.motivationalQuotes = settings.motivationalQuotes;
  }
  
  // Handle remaining top-level properties
  if (settings.passcodeEnabled !== undefined) {
    updatedSettings.passcodeEnabled = settings.passcodeEnabled;
  }
  
  if (settings.passcode !== undefined) {
    updatedSettings.passcode = settings.passcode;
  }
  
  if (settings.usePuzzleInsteadOfPasscode !== undefined) {
    updatedSettings.usePuzzleInsteadOfPasscode = settings.usePuzzleInsteadOfPasscode;
  }
  
  const updatedState = {
    ...state,
    settings: updatedSettings
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
  
  const duration = state.currentSession.startTime 
    ? Math.floor((Date.now() - state.currentSession.startTime) / 1000)
    : 0;
  
  // Tạo phiên hoàn thành
  const completedSession = {
    ...state.currentSession,
    endTime: Date.now(),
    completed: true,
    duration
  };
  
  // Chỉ lưu vào lịch sử nếu phiên kéo dài ít nhất 1 phút (60 giây)
  const shouldSaveToHistory = duration >= 60;
  
  const updatedState: ZenModeState = {
    ...state,
    isActive: false,
    currentSession: undefined,
    // Chỉ thêm vào history nếu phiên làm việc kéo dài hơn 1 phút
    history: shouldSaveToHistory 
      ? [...state.history, completedSession] 
      : state.history
  };
  
  await saveState(updatedState);
  return updatedState;
};

// Toggle ZenMode active state
export const toggleZenMode = async (isActive?: boolean): Promise<ZenModeState> => {
  const state = await loadState();
  
  const newActive = isActive !== undefined ? isActive : !state.isActive;
  console.log(`toggleZenMode called with isActive=${isActive}, current=${state.isActive}, new=${newActive}`);
  
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
    // Ensure isActive is set correctly in case completeCurrentSession changes it
    updatedState.isActive = newActive;
  }
  
  await saveState(updatedState);
  return updatedState;
}; 