/**
 * @jest-environment jsdom
 */
/// <reference types="jest" />

import { ZenModeState, Message } from '../../types';
import { loadState, toggleZenMode, updateSettings } from '../../utils/storage';

// Mock the storage functions
jest.mock('../../utils/storage', () => ({
  loadState: jest.fn(),
  toggleZenMode: jest.fn(),
  updateSettings: jest.fn(),
  saveState: jest.fn()
}));

// Helper function to simulate onMessage event
function simulateOnMessageEvent(message: Message, sender: any = {}) {
  return new Promise<any>((resolve) => {
    // Create a mock sendResponse function
    const sendResponse = jest.fn().mockImplementation((response) => {
      resolve(response);
      return true;
    });

    // Get the last added listener
    const listeners = (chrome.runtime.onMessage.addListener as jest.Mock).mock.calls;
    const lastListener = listeners[listeners.length - 1][0];
    lastListener(message, sender, sendResponse);
  });
}

describe('Background Message Handling', () => {
  let mockState: ZenModeState;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock state
    mockState = {
      isActive: false,
      history: [],
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

    // Mock loadState to return the mock state
    (loadState as jest.Mock).mockResolvedValue(mockState);
  });

  // Import the background script to test
  beforeAll(() => {
    // We need to import the file here to ensure the message listener is set up
    // Note: This is just registering the module, not actually executing tests on it yet
    require('../../background/index');
  });

  it('should handle TOGGLE_ZEN_MODE message', async () => {
    // Setup mock response for toggleZenMode
    const toggledState = { ...mockState, isActive: true };
    (toggleZenMode as jest.Mock).mockResolvedValue(toggledState);

    // Send a message to the background script
    const response = await simulateOnMessageEvent({
      type: 'TOGGLE_ZEN_MODE',
      payload: { isActive: true }
    });

    // Verify response
    expect(response).toEqual({
      success: true,
      state: toggledState
    });

    // Verify toggleZenMode was called with the right arguments
    expect(toggleZenMode).toHaveBeenCalledWith(true);
  });

  it('should handle GET_STATE message', async () => {
    // Send a message to the background script
    const response = await simulateOnMessageEvent({
      type: 'GET_STATE'
    });

    // Verify response
    expect(response).toEqual({
      success: true,
      state: mockState
    });

    // Verify loadState was called
    expect(loadState).toHaveBeenCalled();
  });

  it('should handle UPDATE_SETTINGS message', async () => {
    // Setup mock response for updateSettings
    const updatedSettings = {
      ...mockState.settings,
      sound: {
        ...mockState.settings.sound,
        volume: 75
      }
    };
    const updatedState = {
      ...mockState,
      settings: updatedSettings
    };
    (updateSettings as jest.Mock).mockResolvedValue(updatedState);

    // Send a message to the background script
    const response = await simulateOnMessageEvent({
      type: 'UPDATE_SETTINGS',
      payload: {
        sound: {
          volume: 75
        }
      }
    });

    // Verify response
    expect(response).toEqual({
      success: true,
      state: updatedState
    });

    // Verify updateSettings was called with the right arguments
    expect(updateSettings).toHaveBeenCalledWith({
      sound: {
        volume: 75
      }
    });
  });

  it('should handle unknown message types gracefully', async () => {
    // Send an unknown message type
    const response = await simulateOnMessageEvent({
      type: 'INVALID_TYPE' as any
    });

    // Verify response indicates error
    expect(response).toEqual({
      success: false,
      error: 'Unknown message type'
    });
  });
}); 