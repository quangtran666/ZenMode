import { Message, BlockedSite, ZenModeState, AmbientSoundType } from '../types';
import { loadState, toggleZenMode, updateSettings, saveState } from '../utils/storage';
import { logger } from '../utils/logger';

// Audio player for ambient sounds
let audioPlayer: HTMLAudioElement | null = null;
let audioContext: AudioContext | null = null;
let audioSource: MediaElementAudioSourceNode | null = null;
let gainNode: GainNode | null = null;
// Track if offscreen document is created
let hasOffscreenDocument = false;
// Check if offscreen API is available
const hasOffscreenAPI = typeof chrome.offscreen !== 'undefined';

// Define Reason type for offscreen document
type OffscreenReason = chrome.offscreen.Reason;

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // Tắt logging ngay lập tức
    await logger.enableLogging(false);
    logger.log('ZenMode extension installed');

    // Load initial state
    const state = await loadState();
    
    // Setup alarms for scheduled zen sessions
    if (state.settings.schedule.enabled) {
      setupScheduledSessions(state);
    }
  } catch (e) {
    console.error('Lỗi khi tắt logging:', e);
  }
});

// Listen for alarm events (scheduled sessions)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name.startsWith('zen_start_')) {
    await toggleZenMode(true);
    
    // Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: 'ZenMode Activated',
      message: 'Time to focus! Your scheduled Zen session has started.'
    });
  }
  
  if (alarm.name.startsWith('zen_end_')) {
    await toggleZenMode(false);
    
    // Notify user
    chrome.notifications.create({
      type: 'basic',
      iconUrl: '../icons/icon128.png',
      title: 'ZenMode Completed',
      message: 'Great job! Your scheduled Zen session has ended.'
    });
  }
});

// Setup scheduled sessions
function setupScheduledSessions(state: ZenModeState) {
  // Clear existing alarms
  chrome.alarms.clearAll();
  
  if (!state.settings.schedule.enabled) return;
  
  // Create alarms for each time range
  state.settings.schedule.timeRanges.forEach((range, index) => {
    const [startHour, startMinute] = range.startTime.split(':').map(Number);
    const [endHour, endMinute] = range.endTime.split(':').map(Number);
    
    const today = new Date();
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const currentDay = daysOfWeek[today.getDay()];
    
    // Only schedule alarms for enabled days
    if (range.days.includes(currentDay as any)) {
      const startDate = new Date();
      startDate.setHours(startHour, startMinute, 0, 0);
      
      const endDate = new Date();
      endDate.setHours(endHour, endMinute, 0, 0);
      
      // Only set alarms for future times
      if (startDate > new Date()) {
        chrome.alarms.create(`zen_start_${index}`, { when: startDate.getTime() });
      }
      
      if (endDate > new Date()) {
        chrome.alarms.create(`zen_end_${index}`, { when: endDate.getTime() });
      }
    }
  });
}

// Listen for browser startup
chrome.runtime.onStartup.addListener(async () => {
  const state = await loadState();
  
  // Auto-start with Chrome if enabled
  if (state.settings.schedule.autoStartWithChrome) {
    await toggleZenMode(true);
  }
  
  // Setup scheduled sessions
  if (state.settings.schedule.enabled) {
    setupScheduledSessions(state);
  }
  
  // Restore audio if it was playing
  chrome.storage.local.get('audioState', (result) => {
    if (result.audioState && result.audioState.isPlaying) {
      playSound(
        result.audioState.type,
        result.audioState.volume,
        result.audioState.customUrl
      );
    }
  });
});

// Handle URL blocking
chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  // Only check main frame navigation
  if (details.frameId !== 0) return;
  
  const state = await loadState();
  
  // Skip if ZenMode is not active
  if (!state.isActive) return;
  
  // Check if URL matches any blocked patterns
  const blockedSites = state.settings.blockedSites.filter(site => site.isEnabled);
  const isBlocked = isUrlBlocked(details.url, blockedSites);
  
  if (isBlocked) {
    // Redirect to blocked page
    chrome.tabs.update(details.tabId, {
      url: chrome.runtime.getURL('blocked.html')
    });
  }
});

// Check if URL matches any blocked pattern
function isUrlBlocked(url: string, blockedSites: BlockedSite[]): boolean {
  const urlObj = new URL(url);
  
  return blockedSites.some(site => {
    const pattern = site.pattern
      .replace(/\./g, '\\.')
      .replace(/\*/g, '.*');
    
    const regex = new RegExp(`^${pattern}$`);
    return regex.test(url);
  });
}

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((message: Message, sender, sendResponse) => {
  (async () => {
    try {
      switch (message.type) {
        case 'TOGGLE_ZEN_MODE':
          logger.log('Toggling ZenMode with payload:', message.payload);
          const newState = await toggleZenMode(message.payload?.isActive);
          logger.log('New ZenMode state:', newState.isActive);
          sendResponse({ success: true, state: newState });
          break;
        
        case 'UPDATE_SETTINGS':
          if (message.payload) {
            const updatedState = await updateSettings(message.payload);
            
            // Update schedule if needed
            if (message.payload.schedule) {
              setupScheduledSessions(updatedState);
            }
            
            sendResponse({ success: true, state: updatedState });
          }
          break;
        
        case 'TIMER_COMPLETED':
          // Khi bộ đếm thời gian hoàn thành, chúng ta muốn hoàn thành phiên làm việc hiện tại
          // nhưng giữ ZenMode vẫn hoạt động
          const currentState = await loadState();
          
          // Chỉ xử lý nếu đang có phiên làm việc
          if (currentState.currentSession) {
            // Tính toán thời lượng phiên
            const duration = currentState.currentSession.startTime
              ? Math.floor((Date.now() - currentState.currentSession.startTime) / 1000)
              : 0;
              
            // Chỉ lưu vào lịch sử nếu phiên kéo dài ít nhất 1 phút (60 giây)
            if (duration >= 60) {
              const completedSession = {
                ...currentState.currentSession,
                endTime: Date.now(),
                completed: true,
                duration
              };
              
              // Cập nhật trạng thái với phiên làm việc đã hoàn thành và khởi động phiên mới
              const updatedState = {
                ...currentState,
                // Thêm phiên hiện tại vào lịch sử
                history: [...currentState.history, completedSession],
                // Bắt đầu phiên mới
                currentSession: {
                  id: Date.now().toString(),
                  startTime: Date.now(),
                  completed: false
                }
              };
              
              await saveState(updatedState);
              sendResponse({ success: true, state: updatedState });
            } else {
              // Nếu phiên dưới 1 phút, chỉ khởi động phiên mới mà không lưu phiên hiện tại
              const updatedState = {
                ...currentState,
                currentSession: {
                  id: Date.now().toString(),
                  startTime: Date.now(),
                  completed: false
                }
              };
              
              await saveState(updatedState);
              sendResponse({ success: true, state: updatedState });
            }
          } else {
            sendResponse({ success: true, state: currentState });
          }
          break;
        
        case 'GET_STATE':
          const state = await loadState();
          sendResponse({ success: true, state });
          break;
        
        case 'PLAY_SOUND':
          if (message.payload) {
            const { soundType, volume, customUrl } = message.payload;
            const success = await playSound(soundType, volume, customUrl);
            sendResponse({ success });
          } else {
            sendResponse({ success: false, error: 'Invalid payload' });
          }
          break;
        
        case 'STOP_SOUND':
          stopSound();
          sendResponse({ success: true });
          break;
        
        default:
          sendResponse({ success: false, error: 'Unknown message type' });
      }
    } catch (error) {
      logger.error('Error handling message:', error);
      sendResponse({ success: false, error: `Error: ${error}` });
    }
  })();
  
  // Return true to indicate we will respond asynchronously
  return true;
});

// Check if offscreen document is ready
async function isOffscreenReady(): Promise<boolean> {
  if (!hasOffscreenDocument) return false;
  
  try {
    // Use direct tab messaging instead of runtime messaging
    const tabs = await chrome.tabs.query({});
    return true; // If we can query tabs, assume the document is ready
  } catch (e) {
    logger.error('Error checking offscreen document status:', e);
    return false;
  }
}

// Play ambient sound
async function playSound(soundType: AmbientSoundType, volume: number, customUrl?: string): Promise<boolean> {
  try {
    // Stop current sound if playing
    await stopSound();
    
    // Set audio source based on sound type
    let audioSrc;
    if (soundType === 'custom' && customUrl) {
      // Custom URL provided
      audioSrc = customUrl;
    } else {
      // Use built-in sounds
      audioSrc = chrome.runtime.getURL(`sounds/${soundType}.mp3`);
    }

    // Use offscreen API if available, otherwise use simpler approach
    if (hasOffscreenAPI) {
      try {
        // Close any existing document first to ensure clean state
        if (hasOffscreenDocument) {
          try {
            await chrome.offscreen.closeDocument();
            hasOffscreenDocument = false;
          } catch (e) {
            logger.log('No existing offscreen document to close');
          }
        }

        // Create a new offscreen document
        await chrome.offscreen.createDocument({
          url: 'offscreen.html?src=' + encodeURIComponent(audioSrc) + '&volume=' + (volume / 100) + '&loop=true',
          reasons: ['AUDIO_PLAYBACK' as OffscreenReason],
          justification: 'Play ambient sounds for focus'
        });
        
        hasOffscreenDocument = true;
        
        // Don't need to send a message - offscreen document will auto-play based on URL params
        logger.log('Created offscreen document for audio playback');
      } catch (e: any) {
        logger.error('Error with offscreen document:', e);
        return useSimpleAudioPlayback(audioSrc, volume);
      }
    } else {
      // Fallback to simpler audio
      return useSimpleAudioPlayback(audioSrc, volume);
    }
    
    // Save audio state
    saveAudioState(soundType, volume, customUrl);
    
    return true;
  } catch (error) {
    logger.error('Error in playSound:', error);
    return false;
  }
}

// Simple approach to play audio without using AudioContext
function useSimpleAudioPlayback(audioSrc: string, volume: number): boolean {
  try {
    // Stop any existing audio
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer = null;
    }
    
    // Create new audio player without AudioContext
    audioPlayer = new Audio(audioSrc);
    audioPlayer.loop = true;
    audioPlayer.volume = volume / 100;
    
    // Play audio
    audioPlayer.play().catch(error => {
      logger.error('Error playing audio with simple playback:', error);
      return false;
    });
    
    return true;
  } catch (error) {
    logger.error('Error in useSimpleAudioPlayback:', error);
    return false;
  }
}

// Stop ambient sound
async function stopSound() {
  if (hasOffscreenAPI && hasOffscreenDocument) {
    try {
      // Close the offscreen document - no need to send stop message
      await chrome.offscreen.closeDocument();
      hasOffscreenDocument = false;
    } catch (e) {
      logger.error('Error closing offscreen document:', e);
    }
  } else if (audioPlayer) {
    // Stop simple audio
    try {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      audioPlayer = null;
    } catch (e) {
      logger.error('Error stopping simple audio playback:', e);
    }
  }
  
  // Clear audio state
  clearAudioState();
}

// Save audio state to storage
function saveAudioState(soundType: AmbientSoundType, volume: number, customUrl?: string) {
  chrome.storage.local.set({
    audioState: {
      type: soundType,
      volume: volume,
      customUrl: customUrl,
      isPlaying: true,
      timestamp: Date.now()
    }
  });
}

// Clear audio state from storage
function clearAudioState() {
  chrome.storage.local.set({
    audioState: {
      isPlaying: false
    }
  });
} 