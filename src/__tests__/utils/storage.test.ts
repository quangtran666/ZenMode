/**
 * @jest-environment jsdom
 */
/// <reference types="jest" />

import { 
  DEFAULT_SETTINGS, 
  DEFAULT_STATE, 
  loadState, 
  saveState, 
  updateSettings, 
  toggleZenMode 
} from '../../utils/storage';
import { ZenModeState, AmbientSoundType } from '../../types';

describe('Storage Utils', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('loadState', () => {
    it('should return default state when no state exists in storage', async () => {
      // Mock storage.local.get to return empty result
      chrome.storage.local.get = jest.fn().mockResolvedValue({});

      const result = await loadState();

      // Should return the default state
      expect(result).toEqual(DEFAULT_STATE);
      expect(chrome.storage.local.get).toHaveBeenCalledWith('zenModeState');
    });

    it('should return merged state with defaults when partial state exists', async () => {
      // Mock partial state in storage
      const partialState = {
        zenModeState: {
          isActive: true,
          history: []
        }
      };
      chrome.storage.local.get = jest.fn().mockResolvedValue(partialState);

      const result = await loadState();

      // Should merge with defaults
      expect(result).toEqual({
        ...DEFAULT_STATE,
        isActive: true
      });
      expect(chrome.storage.local.get).toHaveBeenCalledWith('zenModeState');
    });

    it('should handle errors gracefully', async () => {
      // Mock error in storage access
      chrome.storage.local.get = jest.fn().mockRejectedValue(new Error('Storage error'));
      
      // Should not throw and return default state
      const result = await loadState();
      expect(result).toEqual(DEFAULT_STATE);
    });
  });

  describe('saveState', () => {
    it('should save state to chrome.storage', async () => {
      chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
      
      const testState: ZenModeState = {
        ...DEFAULT_STATE,
        isActive: true
      };
      
      await saveState(testState);
      
      expect(chrome.storage.local.set).toHaveBeenCalledWith({ 
        zenModeState: testState 
      });
    });
  });

  describe('updateSettings', () => {
    it('should update specific settings correctly', async () => {
      // Mock current state
      const currentState = { ...DEFAULT_STATE };
      chrome.storage.local.get = jest.fn().mockResolvedValue({ zenModeState: currentState });
      chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
      
      // Update settings
      const newSettings = {
        sound: {
          ...DEFAULT_SETTINGS.sound,
          volume: 75, // Changed value
          type: 'ocean' as AmbientSoundType // Explicitly cast to AmbientSoundType
        }
      };
      
      const result = await updateSettings(newSettings);
      
      // Check updated state
      expect(result.settings.sound.volume).toBe(75);
      expect(result.settings.sound.type).toBe('ocean');
      
      // Verify storage was called
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        zenModeState: result
      });
    });
  });

  describe('toggleZenMode', () => {
    it('should toggle ZenMode state from inactive to active', async () => {
      // Mock current state (inactive)
      const currentState = { ...DEFAULT_STATE, isActive: false };
      chrome.storage.local.get = jest.fn().mockResolvedValue({ zenModeState: currentState });
      chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
      
      const result = await toggleZenMode();
      
      // Should be active now and have a current session
      expect(result.isActive).toBe(true);
      expect(result.currentSession).toBeDefined();
      expect(result.currentSession?.startTime).toBeDefined();
      expect(result.currentSession?.completed).toBe(false);
      
      // Verify storage was called with updated state
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        zenModeState: result
      });
    });
    
    it('should toggle ZenMode state from active to inactive and complete session', async () => {
      // Mock current state (active with session)
      const startTime = Date.now() - 5000; // 5 seconds ago
      const currentState = { 
        ...DEFAULT_STATE, 
        isActive: true,
        currentSession: {
          id: startTime.toString(),
          startTime,
          completed: false
        }
      };
      chrome.storage.local.get = jest.fn().mockResolvedValue({ zenModeState: currentState });
      chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
      
      const result = await toggleZenMode();
      
      // Should be inactive and session completed
      expect(result.isActive).toBe(false);
      expect(result.currentSession).toBeUndefined();
      expect(result.history.length).toBe(1);
      expect(result.history[0].completed).toBe(true);
      expect(result.history[0].endTime).toBeDefined();
      
      // Verify storage was called with updated state
      expect(chrome.storage.local.set).toHaveBeenCalledWith({
        zenModeState: result
      });
    });
    
    it('should set specific state when passing isActive parameter', async () => {
      // Mock current state
      const currentState = { ...DEFAULT_STATE, isActive: true };
      chrome.storage.local.get = jest.fn().mockResolvedValue({ zenModeState: currentState });
      chrome.storage.local.set = jest.fn().mockResolvedValue(undefined);
      
      // Force to inactive
      const result = await toggleZenMode(false);
      
      expect(result.isActive).toBe(false);
    });
  });
}); 