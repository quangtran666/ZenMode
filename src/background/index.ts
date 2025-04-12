import { Message, BlockedSite, ZenModeState } from '../types';
import { loadState, toggleZenMode, updateSettings } from '../utils/storage';

// Initialize extension when installed
chrome.runtime.onInstalled.addListener(async () => {
  console.log('ZenMode extension installed');
  
  // Load initial state
  const state = await loadState();
  
  // Setup alarms for scheduled zen sessions
  if (state.settings.schedule.enabled) {
    setupScheduledSessions(state);
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
    switch (message.type) {
      case 'TOGGLE_ZEN_MODE':
        const newState = await toggleZenMode(message.payload?.isActive);
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
        
      case 'GET_STATE':
        const state = await loadState();
        sendResponse({ success: true, state });
        break;
        
      default:
        sendResponse({ success: false, error: 'Unknown message type' });
    }
  })();
  
  // Return true to indicate we will respond asynchronously
  return true;
}); 