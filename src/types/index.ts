// ZenMode Types

// Schedule Types
export interface TimeRange {
  startTime: string; // Format: "HH:MM"
  endTime: string; // Format: "HH:MM"
  days: DayOfWeek[]; // Days when this schedule is active
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ZenSchedule {
  enabled: boolean;
  autoStartWithChrome: boolean;
  timeRanges: TimeRange[];
}

// Timer Types
export interface ZenTimer {
  duration: number; // in minutes
  startTime?: number; // timestamp when timer started
  endTime?: number; // timestamp when timer should end
  isActive: boolean;
  lockUntilComplete: boolean;
  passcode?: string;
  timerMode: 'countdown' | 'stopwatch'; // Mode of the timer: countdown or stopwatch
}

// Sound Types
export type AmbientSoundType = 
  | 'white-noise' 
  | 'rain' 
  | 'cafe' 
  | 'ocean' 
  | 'nature' 
  | 'fireplace'
  | 'custom';

export interface AmbientSound {
  type: AmbientSoundType;
  volume: number; // 0-100
  isPlaying: boolean;
  customUrl?: string; // For custom sounds (YouTube/Spotify)
}

// Blocker Types
export interface BlockedSite {
  pattern: string; // URL pattern, supports wildcards
  isEnabled: boolean;
}

// Work Log Types
export interface WorkSession {
  id: string;
  startTime: number; // timestamp
  endTime?: number; // timestamp
  duration?: number; // in seconds
  completed: boolean;
}

// Motivation Quotes Types
export interface MotivationalQuote {
  id: string;
  text: string;
  author?: string;
  isCustom: boolean;
}

// User Settings
export interface ZenModeSettings {
  schedule: ZenSchedule;
  timer: ZenTimer;
  sound: AmbientSound;
  blockedSites: BlockedSite[];
  motivationalQuotes: MotivationalQuote[];
  passcodeEnabled: boolean;
  passcode?: string;
  usePuzzleInsteadOfPasscode: boolean;
}

// Application State
export interface ZenModeState {
  isActive: boolean;
  currentSession?: WorkSession;
  history: WorkSession[];
  settings: ZenModeSettings;
}

// Message Types for communication between extension components
export type MessageType = 
  | 'TOGGLE_ZEN_MODE' 
  | 'TIMER_COMPLETED'
  | 'UPDATE_SETTINGS'
  | 'GET_STATE'
  | 'STATE_UPDATED'
  | 'PLAY_SOUND'
  | 'STOP_SOUND'
  | 'BLOCK_SITE'
  | 'ALLOW_SITE';

export interface Message {
  type: MessageType;
  payload?: any;
} 