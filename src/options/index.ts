import { 
  ZenModeState, 
  ZenModeSettings, 
  TimeRange, 
  BlockedSite, 
  MotivationalQuote,
  DayOfWeek
} from '../types';
import { DEFAULT_SETTINGS, loadState, updateSettings } from '../utils/storage';
import { logger, initLogger } from '../utils/logger';

// State management
let appState: ZenModeState | null = null;

// DOM Elements - Schedule
const scheduleEnabled = document.getElementById('schedule-enabled') as HTMLInputElement;
const autoStartChrome = document.getElementById('auto-start-chrome') as HTMLInputElement;
const timeRangesContainer = document.getElementById('time-ranges-container') as HTMLDivElement;
const addTimeRangeBtn = document.getElementById('add-time-range') as HTMLButtonElement;
const timeRangeTemplate = document.getElementById('time-range-template') as HTMLTemplateElement;

// DOM Elements - Website Blocker
const blockedSitesContainer = document.getElementById('blocked-sites-container') as HTMLDivElement;
const newSitePattern = document.getElementById('new-site-pattern') as HTMLInputElement;
const addBlockedSiteBtn = document.getElementById('add-blocked-site') as HTMLButtonElement;
const blockedSiteTemplate = document.getElementById('blocked-site-template') as HTMLTemplateElement;

// DOM Elements - Quotes
const quotesContainer = document.getElementById('quotes-container') as HTMLDivElement;
const newQuoteText = document.getElementById('new-quote-text') as HTMLInputElement;
const newQuoteAuthor = document.getElementById('new-quote-author') as HTMLInputElement;
const addQuoteBtn = document.getElementById('add-quote') as HTMLButtonElement;
const quoteTemplate = document.getElementById('quote-template') as HTMLTemplateElement;

// DOM Elements - Security
const lockUntilComplete = document.getElementById('lock-until-complete') as HTMLInputElement;
const passcodeEnabled = document.getElementById('passcode-enabled') as HTMLInputElement;
const passcodeInput = document.getElementById('passcode') as HTMLInputElement;
const passcodeFormGroup = document.getElementById('passcode-form-group') as HTMLDivElement;
const usePuzzle = document.getElementById('use-puzzle') as HTMLInputElement;

// DOM Elements - Buttons
const saveSettingsBtn = document.getElementById('save-settings') as HTMLButtonElement;
const resetSettingsBtn = document.getElementById('reset-settings') as HTMLButtonElement;

// DOM Elements - Developer Settings
const loggerEnabled = document.getElementById('logger-enabled') as HTMLInputElement;
const logLevelDebug = document.getElementById('log-level-debug') as HTMLInputElement;
const logLevelInfo = document.getElementById('log-level-info') as HTMLInputElement;
const logLevelWarn = document.getElementById('log-level-warn') as HTMLInputElement;
const logLevelError = document.getElementById('log-level-error') as HTMLInputElement;

// Initialize options page
async function initialize() {
  // Load current state
  appState = await loadState();
  
  // Initialize logger
  await initLogger();
  
  // Populate UI with settings
  populateSettings();
  
  // Setup event listeners
  setupEventListeners();
}

// Populate UI with current settings
function populateSettings() {
  if (!appState) return;
  
  const settings = appState.settings;
  
  // Schedule settings
  scheduleEnabled.checked = settings.schedule.enabled;
  autoStartChrome.checked = settings.schedule.autoStartWithChrome;
  
  // Clear existing time ranges
  timeRangesContainer.innerHTML = '';
  
  // Add time ranges
  settings.schedule.timeRanges.forEach(addTimeRangeToUI);
  
  // Blocked sites
  blockedSitesContainer.innerHTML = '';
  settings.blockedSites.forEach(addBlockedSiteToUI);
  
  // Quotes
  quotesContainer.innerHTML = '';
  settings.motivationalQuotes.forEach(addQuoteToUI);
  
  // Security settings
  lockUntilComplete.checked = settings.timer.lockUntilComplete;
  passcodeEnabled.checked = settings.passcodeEnabled;
  passcodeInput.value = settings.passcode || '';
  usePuzzle.checked = settings.usePuzzleInsteadOfPasscode;
  
  // Show/hide passcode input based on enabled state
  togglePasscodeVisibility();
  
  // Developer settings
  const loggerState = logger.getState();
  loggerEnabled.checked = loggerState.enabled;
  logLevelDebug.checked = loggerState.enabledLevels.debug;
  logLevelInfo.checked = loggerState.enabledLevels.info;
  logLevelWarn.checked = loggerState.enabledLevels.warn;
  logLevelError.checked = loggerState.enabledLevels.error;
}

// Add a time range to the UI
function addTimeRangeToUI(timeRange?: TimeRange) {
  if (!timeRangeTemplate) return;
  
  // Clone the template
  const clone = document.importNode(timeRangeTemplate.content, true);
  const timeRangeElement = clone.querySelector('.time-range') as HTMLDivElement;
  
  // Get elements
  const startTimeInput = timeRangeElement.querySelector('.start-time') as HTMLInputElement;
  const endTimeInput = timeRangeElement.querySelector('.end-time') as HTMLInputElement;
  const dayCheckboxes = timeRangeElement.querySelectorAll('.days-checkboxes input[type="checkbox"]');
  const removeButton = timeRangeElement.querySelector('.remove-button') as HTMLButtonElement;
  
  // Set values if timeRange is provided
  if (timeRange) {
    startTimeInput.value = timeRange.startTime;
    endTimeInput.value = timeRange.endTime;
    
    // Check days
    Array.from(dayCheckboxes).forEach((checkbox) => {
      const checkboxInput = checkbox as HTMLInputElement;
      checkboxInput.checked = timeRange.days.includes(checkboxInput.value as DayOfWeek);
    });
  }
  
  // Add remove event listener
  removeButton.addEventListener('click', () => {
    timeRangeElement.remove();
  });
  
  // Add to container
  timeRangesContainer.appendChild(timeRangeElement);
}

// Add a blocked site to the UI
function addBlockedSiteToUI(site?: BlockedSite) {
  if (!blockedSiteTemplate) return;
  
  // Clone the template
  const clone = document.importNode(blockedSiteTemplate.content, true);
  const siteElement = clone.querySelector('.blocked-site') as HTMLDivElement;
  
  // Get elements
  const enabledCheckbox = siteElement.querySelector('.site-enabled') as HTMLInputElement;
  const patternText = siteElement.querySelector('.site-pattern') as HTMLSpanElement;
  const removeButton = siteElement.querySelector('.remove-button') as HTMLButtonElement;
  
  // Set values if site is provided
  if (site) {
    enabledCheckbox.checked = site.isEnabled;
    patternText.textContent = site.pattern;
  }
  
  // Add remove event listener
  removeButton.addEventListener('click', () => {
    siteElement.remove();
  });
  
  // Add to container
  blockedSitesContainer.appendChild(siteElement);
}

// Add a quote to the UI
function addQuoteToUI(quote?: MotivationalQuote) {
  if (!quoteTemplate) return;
  
  // Clone the template
  const clone = document.importNode(quoteTemplate.content, true);
  const quoteElement = clone.querySelector('.quote') as HTMLDivElement;
  
  // Get elements
  const quoteText = quoteElement.querySelector('.quote-text') as HTMLSpanElement;
  const quoteAuthor = quoteElement.querySelector('.quote-author') as HTMLSpanElement;
  const removeButton = quoteElement.querySelector('.remove-button') as HTMLButtonElement;
  
  // Set values if quote is provided
  if (quote) {
    quoteText.textContent = quote.text;
    quoteAuthor.textContent = quote.author || '';
    
    // Add data attribute to identify custom quotes
    if (quote.isCustom) {
      quoteElement.setAttribute('data-custom', 'true');
    }
  }
  
  // Add remove event listener
  removeButton.addEventListener('click', () => {
    quoteElement.remove();
  });
  
  // Add to container
  quotesContainer.appendChild(quoteElement);
}

// Toggle passcode input visibility
function togglePasscodeVisibility() {
  if (passcodeEnabled.checked) {
    passcodeFormGroup.style.display = 'block';
  } else {
    passcodeFormGroup.style.display = 'none';
  }
}

// Collect settings from UI
function collectSettings(): ZenModeSettings {
  // Schedule settings
  const timeRanges: TimeRange[] = [];
  const timeRangeElements = timeRangesContainer.querySelectorAll('.time-range');
  
  Array.from(timeRangeElements).forEach((element) => {
    const timeRangeDiv = element as HTMLDivElement;
    const startTime = (timeRangeDiv.querySelector('.start-time') as HTMLInputElement).value;
    const endTime = (timeRangeDiv.querySelector('.end-time') as HTMLInputElement).value;
    const dayCheckboxes = timeRangeDiv.querySelectorAll('.days-checkboxes input[type="checkbox"]:checked');
    
    const days: DayOfWeek[] = [];
    Array.from(dayCheckboxes).forEach((checkbox) => {
      const checkboxInput = checkbox as HTMLInputElement;
      days.push(checkboxInput.value as DayOfWeek);
    });
    
    if (startTime && endTime && days.length > 0) {
      timeRanges.push({ startTime, endTime, days });
    }
  });
  
  // Blocked sites
  const blockedSites: BlockedSite[] = [];
  const siteElements = blockedSitesContainer.querySelectorAll('.blocked-site');
  
  Array.from(siteElements).forEach((element) => {
    const siteDiv = element as HTMLDivElement;
    const isEnabled = (siteDiv.querySelector('.site-enabled') as HTMLInputElement).checked;
    const pattern = (siteDiv.querySelector('.site-pattern') as HTMLSpanElement).textContent || '';
    
    if (pattern) {
      blockedSites.push({ pattern, isEnabled });
    }
  });
  
  // Quotes
  const quotes: MotivationalQuote[] = [];
  const quoteElements = quotesContainer.querySelectorAll('.quote');
  
  Array.from(quoteElements).forEach((element, index) => {
    const quoteDiv = element as HTMLDivElement;
    const text = (quoteDiv.querySelector('.quote-text') as HTMLSpanElement).textContent || '';
    const author = (quoteDiv.querySelector('.quote-author') as HTMLSpanElement).textContent || '';
    const isCustom = quoteDiv.hasAttribute('data-custom');
    
    if (text) {
      quotes.push({ 
        id: isCustom ? `custom-${index}` : `default-${index}`,
        text,
        author: author.replace(/^— /, ''), // Remove the "— " prefix
        isCustom
      });
    }
  });
  
  // Build settings object
  return {
    schedule: {
      enabled: scheduleEnabled.checked,
      autoStartWithChrome: autoStartChrome.checked,
      timeRanges
    },
    timer: {
      ...appState!.settings.timer,
      lockUntilComplete: lockUntilComplete.checked
    },
    sound: appState!.settings.sound,
    blockedSites,
    motivationalQuotes: quotes,
    passcodeEnabled: passcodeEnabled.checked,
    passcode: passcodeInput.value,
    usePuzzleInsteadOfPasscode: usePuzzle.checked
  };
}

// Save logger settings
async function saveLoggerSettings() {
  try {
    await logger.enableLogging(loggerEnabled.checked);
    
    await logger.setLogLevel('debug', logLevelDebug.checked);
    await logger.setLogLevel('info', logLevelInfo.checked);
    await logger.setLogLevel('warn', logLevelWarn.checked);
    await logger.setLogLevel('error', logLevelError.checked);
    
    return true;
  } catch (error) {
    console.error('Error saving logger settings:', error);
    return false;
  }
}

// Save settings
async function saveSettings() {
  if (!appState) return;
  
  try {
    // Collect settings from UI
    const newSettings = collectSettings();
    
    // Update state
    await updateSettings(newSettings);
    
    // Save logger settings
    await saveLoggerSettings();
    
    // Show success message
    showMessage('Settings saved successfully', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showMessage('Error saving settings', 'error');
  }
}

// Reset settings to default
async function resetSettings() {
  if (confirm('Are you sure you want to reset all settings to default?')) {
    try {
      // Update with default settings
      await updateSettings(DEFAULT_SETTINGS);
      
      // Reload state
      appState = await loadState();
      
      // Update UI
      populateSettings();
      
      // Show success message
      showMessage('Settings reset to default.', 'success');
    } catch (error) {
      // Show error message
      showMessage('Failed to reset settings.', 'error');
      console.error('Error resetting settings:', error);
    }
  }
}

// Show a message to the user
function showMessage(message: string, type: 'success' | 'error') {
  // Create notification container if it doesn't exist
  let notificationContainer = document.getElementById('notification-container');
  
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notification-container';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.top = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '1000';
    document.body.appendChild(notificationContainer);
  }
  
  // Create message element
  const messageElement = document.createElement('div');
  messageElement.className = `notification ${type}`;
  messageElement.style.padding = '12px 20px';
  messageElement.style.borderRadius = '4px';
  messageElement.style.marginBottom = '10px';
  messageElement.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
  messageElement.style.display = 'flex';
  messageElement.style.alignItems = 'center';
  messageElement.style.minWidth = '250px';
  messageElement.style.transform = 'translateX(120%)';
  messageElement.style.transition = 'transform 0.3s ease-in-out';
  
  // Set background color based on type
  if (type === 'success') {
    messageElement.style.backgroundColor = '#4CAF50';
    messageElement.style.color = 'white';
  } else {
    messageElement.style.backgroundColor = '#f44336';
    messageElement.style.color = 'white';
  }
  
  // Icon based on message type
  const icon = document.createElement('span');
  icon.innerHTML = type === 'success' ? '✓' : '✗';
  icon.style.marginRight = '10px';
  icon.style.fontSize = '16px';
  
  // Message text
  const text = document.createElement('span');
  text.textContent = message;
  
  // Add elements to the notification
  messageElement.appendChild(icon);
  messageElement.appendChild(text);
  
  // Add to notification container
  notificationContainer.appendChild(messageElement);
  
  // Animate in
  setTimeout(() => {
    messageElement.style.transform = 'translateX(0)';
  }, 10);
  
  // Remove after delay
  setTimeout(() => {
    messageElement.style.transform = 'translateX(120%)';
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      if (messageElement.parentNode === notificationContainer) {
        notificationContainer.removeChild(messageElement);
      }
      
      // Remove container if empty
      if (notificationContainer.childNodes.length === 0) {
        document.body.removeChild(notificationContainer);
      }
    }, 300);
  }, 3000);
}

// Setup event listeners
function setupEventListeners() {
  // Add time range button
  addTimeRangeBtn.addEventListener('click', () => {
    addTimeRangeToUI();
  });
  
  // Add blocked site button
  addBlockedSiteBtn.addEventListener('click', () => {
    const pattern = newSitePattern.value.trim();
    
    if (pattern) {
      addBlockedSiteToUI({ pattern, isEnabled: true });
      newSitePattern.value = '';
    }
  });
  
  // Add quote button
  addQuoteBtn.addEventListener('click', () => {
    const text = newQuoteText.value.trim();
    const author = newQuoteAuthor.value.trim();
    
    if (text) {
      addQuoteToUI({ id: `custom-${Date.now()}`, text, author, isCustom: true });
      newQuoteText.value = '';
      newQuoteAuthor.value = '';
    }
  });
  
  // Toggle passcode visibility
  passcodeEnabled.addEventListener('change', togglePasscodeVisibility);
  
  // Save settings button
  saveSettingsBtn.addEventListener('click', saveSettings);
  
  // Reset settings button
  resetSettingsBtn.addEventListener('click', resetSettings);
  
  // Logger settings
  loggerEnabled.addEventListener('change', () => {
    const isEnabled = loggerEnabled.checked;
    logLevelDebug.disabled = !isEnabled;
    logLevelInfo.disabled = !isEnabled;
    logLevelWarn.disabled = !isEnabled;
    logLevelError.disabled = !isEnabled;
  });
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initialize); 