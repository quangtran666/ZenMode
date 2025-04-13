/**
 * Logger utility for ZenMode extension
 * Allows enabling/disabling console logs globally
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerConfig {
  enabled: boolean;
  enabledLevels: Record<LogLevel, boolean>;
}

// Default configuration - can be changed at runtime
const defaultConfig: LoggerConfig = {
  enabled: true,
  enabledLevels: {
    debug: true,
    info: true,
    warn: true,
    error: true
  }
};

// Use chrome.storage for persisting logger settings
const LOGGER_STORAGE_KEY = 'zenmode_logger_config';

// Current configuration (starts with default)
let currentConfig: LoggerConfig = { ...defaultConfig };

// Load configuration from storage
export const initLogger = async (): Promise<void> => {
  try {
    const result = await chrome.storage.local.get(LOGGER_STORAGE_KEY);
    if (result[LOGGER_STORAGE_KEY]) {
      currentConfig = result[LOGGER_STORAGE_KEY] as LoggerConfig;
    } else {
      // Save default config if not found
      await chrome.storage.local.set({ [LOGGER_STORAGE_KEY]: defaultConfig });
    }
  } catch (error) {
    // Use console.error directly for initialization errors
    console.error('Failed to initialize logger:', error);
  }
};

// Save configuration to storage
const saveConfig = async (): Promise<void> => {
  try {
    await chrome.storage.local.set({ [LOGGER_STORAGE_KEY]: currentConfig });
  } catch (error) {
    // Use console.error directly for critical errors
    console.error('Failed to save logger config:', error);
  }
};

// Enable/disable all logging
export const enableLogging = async (enabled: boolean): Promise<void> => {
  currentConfig.enabled = enabled;
  await saveConfig();
};

// Enable/disable specific log level
export const setLogLevel = async (level: LogLevel, enabled: boolean): Promise<void> => {
  currentConfig.enabledLevels[level] = enabled;
  await saveConfig();
};

// Check if logging is enabled for a specific level
const isLoggingEnabled = (level: LogLevel): boolean => {
  return currentConfig.enabled && currentConfig.enabledLevels[level];
};

// Logger functions
export const logger = {
  debug: (...args: unknown[]): void => {
    if (isLoggingEnabled('debug')) {
      console.debug(...args);
    }
  },
  
  log: (...args: unknown[]): void => {
    if (isLoggingEnabled('info')) {
      console.log(...args);
    }
  },
  
  info: (...args: unknown[]): void => {
    if (isLoggingEnabled('info')) {
      console.info(...args);
    }
  },
  
  warn: (...args: unknown[]): void => {
    if (isLoggingEnabled('warn')) {
      console.warn(...args);
    }
  },
  
  error: (...args: unknown[]): void => {
    if (isLoggingEnabled('error')) {
      console.error(...args);
    }
  },
  
  // Enable/disable all logging
  enableLogging: async (enabled: boolean): Promise<void> => {
    await enableLogging(enabled);
  },
  
  // Enable/disable specific log level
  setLogLevel: async (level: LogLevel, enabled: boolean): Promise<void> => {
    await setLogLevel(level, enabled);
  },
  
  // Toggle all logging on/off quickly
  toggle: async (): Promise<boolean> => {
    const newState = !currentConfig.enabled;
    await enableLogging(newState);
    return newState;
  },
  
  // Get current logger state
  getState: (): LoggerConfig => {
    return { ...currentConfig };
  }
};

// Initialize logger when module is loaded
initLogger().catch(e => console.error('Logger initialization failed:', e)); 