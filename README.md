# ZenMode Chrome Extension

ZenMode is a Chrome extension designed to help you stay focused and productive by blocking distracting websites, setting focus timers, and tracking your work sessions.

## 🔍 Features

### 1. Zen Schedule
- Automatically activate ZenMode during scheduled times
- Set multiple time ranges for different days of the week
- Option to auto-start when Chrome opens

### 2. Website Blocker
- Block distracting websites during focus sessions
- Add custom URL patterns with wildcard support
- Shows motivational quotes when a site is blocked

### 3. Zen Timer
- Set a focused work timer (Pomodoro-style)
- Lock mode prevents deactivating before completion
- Optional passcode or puzzle protection

### 4. Ambient Sounds
- Play various background sounds to help focus
- Options: white noise, rain, cafe, ocean, nature, and more
- Support for custom audio URLs (Spotify/YouTube)

### 5. Work Log
- Track all your focus sessions
- View statistics on total time and streaks
- Export work history as CSV

### 6. Motivational Support
- Shows inspiring quotes when you try to access blocked sites
- Customize your own collection of quotes

## 🛠️ Installation

### From Chrome Web Store
*(Coming Soon)*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top-right)
4. Click "Load unpacked" and select the `dist` folder
5. ZenMode extension should now appear in your extensions

## 💻 Development

### Prerequisites
- Node.js (v14+)
- npm or yarn

### Setup
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## 🌟 Detailed Usage Guide

### Getting Started
1. After installation, click the ZenMode icon in your Chrome toolbar to open the popup
2. Toggle ZenMode on/off using the switch at the top of the popup

### Using the Timer
1. In the main popup, use the slider to select your desired focus duration (1-120 minutes)
2. Click "Start" to begin your focus session
3. The timer will count down, and ZenMode will block distracting websites during this time
4. Use "Reset" to cancel and reset the timer to your selected duration

### Playing Ambient Sounds
1. Select a sound type from the dropdown menu
2. Adjust the volume using the slider
3. Click "Play" to start the sound and "Stop" to end it
4. For custom sounds, select "Custom URL" and enter a valid audio URL

### Accessing Settings
1. Click the ⚙️ Settings button at the bottom of the popup
2. The settings page opens in a new tab with multiple configuration sections:

#### Schedule Settings
- Toggle "Enable scheduled sessions" to activate ZenMode automatically during specific times
- Enable "Auto-start ZenMode when Chrome opens" to start focus mode immediately on browser startup
- Click "Add Time Range" to create a new scheduled time slot
- For each time range, set:
  - Start and end times
  - Days of the week when this schedule should apply
  - Use the "×" button to remove a time range

#### Website Blocker
- View and manage your list of blocked websites
- Enter URL patterns in the input field and click "Add" to block new sites
- Use "*" for wildcards (e.g., "*facebook.com*" will block all Facebook URLs)
- Toggle individual sites on/off without removing them
- Use the "×" button to completely remove a site from your blocklist

#### Motivational Quotes
- Customize the quotes shown when attempting to access blocked sites
- Enter new quote text and (optionally) an author, then click "Add"
- Default quotes are provided but can be removed
- Your custom quotes will display randomly when you attempt to visit blocked sites

#### Security Settings
- Enable "Lock ZenMode until timer completes" to prevent early deactivation
- Enable "Require passcode to exit early" and set a passcode for additional security
- Alternatively, enable "Use mini puzzle instead of passcode" to require solving a small puzzle to exit focus mode

### Viewing Work History
1. Click the 📊 Work Log button at the bottom of the popup
2. View statistics about your focus sessions:
   - Total sessions completed
   - Total hours focused
   - Average session duration
   - Current day streak
3. Filter your history by different time periods
4. See a detailed list of all your focus sessions
5. Download your work history as a CSV file for external analysis

## 🔒 Privacy

ZenMode operates completely locally on your browser. No data is sent to any external servers, and your settings and work history are stored only in Chrome's local storage.

## 🔧 Troubleshooting

### Extension Not Working?
- Make sure Developer mode is enabled in Chrome Extensions
- Try reloading the extension from the Extensions page
- If the settings page doesn't open, reload Chrome and try again
- Clear extension data: go to the extension Details page and click "Clear data"

### Website Blocking Issues
- Ensure ZenMode is toggled on
- Check that your URL patterns are correctly formatted (include wildcards as needed)
- Verify the blocked site's toggle is enabled in Settings

### Timer or Sound Issues
- If the timer doesn't start, try reloading the extension
- For sound playback problems, check your browser's sound permissions

## 📝 License

MIT License

## Testing

ZenMode includes a comprehensive test suite built with Jest. These tests help ensure that the extension's functionality works correctly and prevents regressions when making changes.

### Running Tests

To run the tests:

```bash
# Run all tests once
npm test

# Run tests in watch mode (development)
npm run test:watch
```

### Test Structure

Tests are organized in the `src/__tests__` directory, which mirrors the structure of the source code:

- `src/__tests__/utils/` - Tests for utility functions
- `src/__tests__/background/` - Tests for background script functionality 
- `src/__tests__/popup/` - Tests for popup UI functionality

### Writing New Tests

When adding a new feature or modifying existing functionality, please add or update the corresponding tests. Here's a basic example of how to write a test:

```typescript
/**
 * @jest-environment jsdom
 */
/// <reference types="jest" />

import { featureToTest } from '../../path/to/feature';

describe('Feature description', () => {
  beforeEach(() => {
    // Setup code
  });

  it('should do something specific', () => {
    // Arrange
    const input = 'something';
    
    // Act
    const result = featureToTest(input);
    
    // Assert
    expect(result).toBe('expected output');
  });
});
```

### Mocking Chrome APIs

Chrome extension APIs are not available in the Jest test environment, so we need to mock them. The `jest.setup.js` file provides basic mocks for many Chrome APIs, but you may need to extend these for specific tests:

```typescript
// Example of mocking chrome.storage.local for a specific test
beforeEach(() => {
  chrome.storage.local.get = jest.fn().mockImplementation((key, callback) => {
    callback({ key: 'mockValue' });
  });
});
``` 