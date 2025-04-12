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

## 🌟 Usage

1. Click the ZenMode icon in your Chrome toolbar to open the popup
2. Toggle ZenMode on/off using the switch
3. Set a timer for focused work sessions
4. Go to settings to configure schedules, blocked sites, and more
5. View your work history in the Work Log

## 🔒 Privacy

ZenMode operates completely locally on your browser. No data is sent to any external servers, and your settings and work history are stored only in Chrome's local storage.

## 📝 License

MIT License 