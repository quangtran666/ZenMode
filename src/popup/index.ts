import { ZenModeState, ZenTimer, AmbientSound } from '../types';
import { logger } from '../utils/logger';

// DOM Elements
const zenModeToggle = document.getElementById('zenModeToggle') as HTMLInputElement;
const statusText = document.getElementById('status-text') as HTMLSpanElement;
const timerValue = document.getElementById('timer-value') as HTMLSpanElement;
const sliderValue = document.getElementById('slider-value') as HTMLSpanElement;
const timerDuration = document.getElementById('timer-duration') as HTMLInputElement;
const startTimerBtn = document.getElementById('start-timer') as HTMLButtonElement;
const resumeTimerBtn = document.getElementById('resume-timer') as HTMLButtonElement;
const resetTimerBtn = document.getElementById('reset-timer') as HTMLButtonElement;
const countdownTab = document.getElementById('countdown-tab') as HTMLButtonElement;
const stopwatchTab = document.getElementById('stopwatch-tab') as HTMLButtonElement;
const countdownControls = document.getElementById('countdown-controls') as HTMLDivElement;
const stopwatchControls = document.getElementById('stopwatch-controls') as HTMLDivElement;
const soundSelect = document.getElementById('sound-select') as HTMLSelectElement;
const customSoundUrl = document.getElementById('custom-sound-url') as HTMLInputElement;
const volumeControl = document.getElementById('volume-control') as HTMLInputElement;
const toggleSoundBtn = document.getElementById('toggle-sound') as HTMLButtonElement;
const sessionCount = document.getElementById('session-count') as HTMLSpanElement;
const totalTime = document.getElementById('total-time') as HTMLSpanElement;
const showSettingsBtn = document.getElementById('show-settings') as HTMLButtonElement;
const viewHistoryBtn = document.getElementById('view-history') as HTMLButtonElement;

// Timer variables
let timer: number | null = null;
let remainingTime = 0;
let pausedTime = 0; // Store remaining time when paused
let elapsedTime = 0; // For stopwatch mode
let appState: ZenModeState | null = null;

// Countdown and Stopwatch specific functions
function startCountdownTimer(initialRemainingTime: number) {
  // Clear any existing timer
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  // Set initial remaining time
  remainingTime = initialRemainingTime;
  logger.log(`Starting COUNTDOWN timer with ${remainingTime} seconds remaining`);
  
  // Create a countdown-specific timer
  timer = setInterval(() => {
    // Debug log
    logger.log(`COUNTDOWN: remainingTime = ${remainingTime}`);
    
    if (remainingTime > 0) {
      remainingTime--;
      displayTime(remainingTime);
      
      if (remainingTime <= 0) {
        // Timer completed
        clearInterval(timer as number);
        timer = null;
        displayTime(0);
        
        // Notify timer completion
        chrome.runtime.sendMessage({ 
          type: 'TIMER_COMPLETED' 
        });
        
        if (startTimerBtn) startTimerBtn.textContent = 'Start';
      }
    } else {
      // Safety cleanup
      clearInterval(timer as number);
      timer = null;
      displayTime(0);
      
      if (startTimerBtn) startTimerBtn.textContent = 'Start';
    }
  }, 1000) as unknown as number;
}

function startStopwatchTimer(initialElapsedTime: number) {
  // Clear any existing timer
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
  
  // Set initial elapsed time
  elapsedTime = initialElapsedTime;
  logger.log(`Starting STOPWATCH timer with ${elapsedTime} seconds elapsed`);
  
  // Create a stopwatch-specific timer
  timer = setInterval(() => {
    // Debug log
    logger.log(`STOPWATCH: elapsedTime = ${elapsedTime}`);
    
    // Increment elapsed time
    elapsedTime++;
    displayTime(elapsedTime, true);
  }, 1000) as unknown as number;
}

// Start timer based on mode
function startTimer(mode: 'countdown' | 'stopwatch') {
  logger.log(`startTimer called with mode: ${mode}`);
  
  if (mode === 'countdown') {
    startCountdownTimer(remainingTime);
  } else {
    startStopwatchTimer(elapsedTime);
  }
}

// Function to start a new timer
function startNewTimer(duration: number, startTime: number, endTime: number) {
  if (!appState) return;

  const timerMode = appState.settings.timer.timerMode || 'countdown';
  logger.log(`Starting new timer: mode=${timerMode}, duration=${duration}`);

  const payload: Partial<ZenTimer> = {
    isActive: true,
    duration,
    startTime,
    timerMode // Ensure we maintain the timer mode
  };

  // In countdown mode, we need an end time
  if (timerMode === 'countdown') {
    payload.endTime = endTime;
  }

  chrome.runtime.sendMessage({ 
    type: 'UPDATE_SETTINGS',
    payload: { 
      timer: payload
    }
  }, (response) => {
    if (response && response.success) {
      appState = response.state;
      
      if (appState && appState.settings.timer.timerMode === 'countdown') {
        // Calculate the correct remaining time for countdown
        remainingTime = Math.floor((endTime - Date.now()) / 1000);
        logger.log(`Setting remainingTime for countdown: ${remainingTime} seconds`);
        
        // Ensure it's a positive value
        if (remainingTime <= 0) {
          logger.error('Invalid remaining time calculated. Using duration instead.');
          remainingTime = duration * 60;
        }
        
        // Start the countdown timer with specific function
        startCountdownTimer(remainingTime);
      } else if (appState) {
        // Reset and start the stopwatch with specific function
        elapsedTime = 0;
        logger.log('Setting elapsedTime for stopwatch: 0 seconds');
        startStopwatchTimer(elapsedTime);
      }
      
      if (startTimerBtn) startTimerBtn.textContent = 'Stop';
      if (startTimerBtn) startTimerBtn.classList.remove('hidden');
      if (resumeTimerBtn) resumeTimerBtn.classList.add('hidden');
    }
  });
}

// Function to update the duration slider value without affecting the timer display
function updateDurationSlider(duration: number) {
  // Only update slider-related elements, never modify the timer display
  if (timerDuration) {
    timerDuration.value = duration.toString();
  }
  
  // Update the slider value text display
  if (sliderValue) {
    sliderValue.textContent = `${duration} min`;
  }
  
  logger.log(`Updated slider to ${duration} minutes (timer display unchanged)`);
}

// Initialize popup
async function initialize() {
  // Get current state from background
  chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
    if (response && response.success) {
      appState = response.state;
      updateUI();
    }
  });
  
  // Setup event listeners
  setupEventListeners();
  
  // Example: Programmatically access Logo.png
  const logoImage = document.querySelector('.logo img') as HTMLImageElement;
  if (logoImage) {
    // Dynamic way to access Logo.png using chrome.runtime.getURL
    const logoUrl = chrome.runtime.getURL('images/Logo.png');
    logoImage.src = logoUrl;
    logger.log('Logo image set dynamically:', logoUrl);
  }
}

// Update UI based on current state
function updateUI() {
  if (!appState) return;
  
  // Update ZenMode toggle
  zenModeToggle.checked = appState.isActive;
  statusText.textContent = appState.isActive ? 'ZenMode is on' : 'ZenMode is off';
  
  // Update timer settings
  const timerSettings = appState.settings.timer;
  
  // Đảm bảo timerSettings.duration không bị undefined và cập nhật slider giá trị
  if (timerSettings && timerSettings.duration !== undefined) {
    updateDurationSlider(timerSettings.duration);
  } else {
    // Gán giá trị mặc định nếu duration bị undefined
    updateDurationSlider(25);
  }
  
  // Initialize slider value display on first load
  if (sliderValue && timerSettings && timerSettings.duration) {
    sliderValue.textContent = `${timerSettings.duration} min`;
  }
  
  updateTimerDisplay(timerSettings);
  
  // Enable/disable timer controls based on ZenMode active state
  const timerControls = [
    timerDuration, startTimerBtn, resumeTimerBtn, resetTimerBtn
  ];
  
  // Visual indicator for disabled timer section
  const timerSection = document.querySelector('.timer-section') as HTMLElement;
  
  // QUAN TRỌNG: Bỏ tất cả các thuộc tính disabled và style của các tab
  // KHÔNG đặt bất kỳ thuộc tính nào cho tab ở đây
  // Các tab phải luôn hoạt động bình thường
  
  if (appState.isActive) {
    // Enable timer controls if ZenMode is active
    timerControls.forEach(element => {
      element.disabled = false;
    });
    
    if (timerSection) {
      timerSection.classList.remove('disabled-section');
    }
  } else {
    // Disable timer controls if ZenMode is not active
    timerControls.forEach(element => {
      element.disabled = true;
    });
    
    // Stop any running timer
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    
    if (timerSection) {
      timerSection.classList.add('disabled-section');
    }
  }
  
  // Update sound settings
  const soundSettings = appState.settings.sound;
  if (soundSettings && soundSettings.type) {
    soundSelect.value = soundSettings.type;
  }
  
  if (soundSettings && soundSettings.volume !== undefined) {
    volumeControl.value = soundSettings.volume.toString();
  } else {
    volumeControl.value = "50"; // Giá trị mặc định
  }
  
  toggleSoundBtn.textContent = soundSettings && soundSettings.isPlaying ? 'Stop' : 'Play';
  toggleSoundBtn.disabled = false;
  
  if (soundSettings && soundSettings.type === 'custom' && soundSettings.customUrl) {
    customSoundUrl.value = soundSettings.customUrl;
    customSoundUrl.classList.remove('hidden');
  } else {
    customSoundUrl.classList.add('hidden');
  }
  
  // Update visual cues for sound playing
  if (soundSettings && soundSettings.isPlaying) {
    soundSelect.classList.add('active-sound');
    volumeControl.classList.add('active-sound');
    
    // Add animation to volume icon
    const volumeIcon = document.querySelector('.volume-icon');
    if (volumeIcon) {
      volumeIcon.classList.add('pulsing');
    }
  } else {
    soundSelect.classList.remove('active-sound');
    volumeControl.classList.remove('active-sound');
    
    // Remove animation from volume icon
    const volumeIcon = document.querySelector('.volume-icon');
    if (volumeIcon) {
      volumeIcon.classList.remove('pulsing');
    }
  }
  
  // Update stats
  updateStats();
}

// Update timer display
function updateTimerDisplay(timerSettings: ZenTimer) {
  // Kiểm tra xem timerSettings có tồn tại không
  if (!timerSettings) {
    logger.error('timerSettings is undefined');
    return;
  }

  try {
    // Sử dụng giá trị mặc định cho timerMode nếu undefined
    const timerMode = timerSettings.timerMode || 'countdown';
    logger.log(`updateTimerDisplay: mode=${timerMode}, isActive=${timerSettings.isActive}`);
    
    // First, update the tabs UI based on timer mode
    if (timerMode === 'countdown') {
      if (countdownTab) countdownTab.classList.add('active');
      if (stopwatchTab) stopwatchTab.classList.remove('active');
      if (countdownControls) countdownControls.classList.remove('hidden');
      if (stopwatchControls) stopwatchControls.classList.add('hidden');
    } else {
      if (countdownTab) countdownTab.classList.remove('active');
      if (stopwatchTab) stopwatchTab.classList.add('active');
      if (countdownControls) countdownControls.classList.add('hidden');
      if (stopwatchControls) stopwatchControls.classList.remove('hidden');
    }

    // Kiểm tra ZenMode có được bật không
    if (!appState || !appState.isActive) {
      // Nếu ZenMode không được bật, hiển thị thời gian mặc định và dừng mọi hoạt động
      if (timerMode === 'countdown') {
        // Đảm bảo duration không bị undefined
        const duration = timerSettings.duration !== undefined ? timerSettings.duration : 25;
        displayTime(duration * 60);
      } else {
        displayTime(0, true);
      }
      
      if (startTimerBtn) startTimerBtn.textContent = 'Start';
      
      // Dừng mọi timer đang hoạt động
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      
      return;
    }

    // Timer is active, update display accordingly
    if (timerSettings.isActive && timerSettings.startTime) {
      const now = Date.now();
      
      if (timerMode === 'countdown' && timerSettings.endTime) {
        // Countdown mode - calculate remaining time
        if (now < timerSettings.endTime) {
          // Tính thời gian còn lại
          remainingTime = Math.floor((timerSettings.endTime - now) / 1000);
          logger.log(`updateTimerDisplay: countdown active, remainingTime=${remainingTime}`);
          
          // Hiển thị thời gian
          displayTime(remainingTime);
          
          // Nếu chưa có timer đang chạy, khởi động timer đếm ngược
          if (!timer) {
            startCountdownTimer(remainingTime);
          }
          
          if (startTimerBtn) startTimerBtn.textContent = 'Stop';
          if (startTimerBtn) startTimerBtn.classList.remove('hidden');
          if (resumeTimerBtn) resumeTimerBtn.classList.add('hidden');
        } else {
          // Timer has ended
          remainingTime = 0;
          displayTime(0);
          if (startTimerBtn) startTimerBtn.textContent = 'Start';
          if (startTimerBtn) startTimerBtn.classList.remove('hidden');
          if (resumeTimerBtn) resumeTimerBtn.classList.add('hidden');
        }
      } else if (timerMode === 'stopwatch') {
        // Stopwatch mode - calculate elapsed time
        elapsedTime = Math.floor((now - timerSettings.startTime) / 1000);
        logger.log(`updateTimerDisplay: stopwatch active, elapsedTime=${elapsedTime}`);
        
        // Hiển thị thời gian
        displayTime(elapsedTime, true);
        
        // Nếu chưa có timer đang chạy, khởi động timer đếm lên
        if (!timer) {
          startStopwatchTimer(elapsedTime);
        }
        
        if (startTimerBtn) startTimerBtn.textContent = 'Stop';
        if (startTimerBtn) startTimerBtn.classList.remove('hidden');
        if (resumeTimerBtn) resumeTimerBtn.classList.add('hidden');
      }
    } else {
      // Timer is not active
      if (timerMode === 'countdown') {
        // If we have paused time, show that instead of the default duration
        if (pausedTime > 0) {
          displayTime(pausedTime);
          logger.log(`Showing paused countdown time: ${pausedTime} seconds`);
        } else {
          // Display default timer duration when not active and not paused
          const duration = timerSettings.duration !== undefined ? timerSettings.duration : 25;
          displayTime(duration * 60);
        }
      } else {
        // For stopwatch, show paused elapsed time or 00:00:00
        if (pausedTime > 0) {
          displayTime(pausedTime, true);
          logger.log(`Showing paused stopwatch time: ${pausedTime} seconds`);
        } else {
          displayTime(0, true);
        }
      }
      
      if (startTimerBtn) startTimerBtn.textContent = 'Start';
      
      // Show Resume button if we have a paused timer
      if (pausedTime > 0) {
        if (startTimerBtn) startTimerBtn.classList.add('hidden');
        if (resumeTimerBtn) resumeTimerBtn.classList.remove('hidden');
      } else {
        if (startTimerBtn) startTimerBtn.classList.remove('hidden');
        if (resumeTimerBtn) resumeTimerBtn.classList.add('hidden');
      }
    }
  } catch (error) {
    logger.error('Error updating timer display:', error);
  }
}

// Display time in different formats based on mode - updates ONLY the timer display (not slider)
function displayTime(seconds: number, isStopwatch: boolean = false) {
  if (seconds === undefined || seconds === null) {
    seconds = 0;
  }
  
  if (isStopwatch) {
    // For stopwatch, use HH:MM:SS format
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    timerValue.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    // For countdown, use MM:SS format
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    timerValue.textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  
  logger.log(`Updated timer display to ${timerValue.textContent} (slider value unchanged)`);
}

// Update stats display
function updateStats() {
  if (!appState) return;
  
  // Count sessions completed today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todaySessions = appState.history.filter(session => {
    const sessionDate = new Date(session.startTime);
    return sessionDate >= today && session.completed;
  });
  
  // Update session count
  sessionCount.textContent = todaySessions.length.toString();
  
  // Calculate total time
  const totalSeconds = todaySessions.reduce((total, session) => {
    return total + (session.duration || 0);
  }, 0);
  
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (hours > 0) {
    totalTime.textContent = `${hours}h ${minutes}m`;
  } else {
    totalTime.textContent = `${minutes}m`;
  }
}

// Setup event listeners
function setupEventListeners() {
  // ZenMode toggle - direct implementation that fixes double-click issue
  const switchEl = document.querySelector('.switch') as HTMLLabelElement;
  const toggleCheckbox = zenModeToggle; // Use the direct reference to the checkbox
  
  if (switchEl && toggleCheckbox) {
    // Remove default click handlers from both the switch and checkbox
    switchEl.onclick = null;
    toggleCheckbox.onclick = null;
    
    // Stop the default checkbox behavior completely
    toggleCheckbox.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      return false;
    });
    
    // Add click handler to the switch
    switchEl.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      
      logger.log("Switch clicked");
      
      if (!appState) {
        logger.error("Cannot toggle: App state is null");
        return;
      }
      
      // Get current state from appState (the source of truth)
      const currentState = appState.isActive;
      handleZenModeToggle(currentState);
    });
    
    // Also handle direct clicks on the checkbox itself
    toggleCheckbox.addEventListener('change', function(event) {
      event.preventDefault();
      event.stopPropagation();
      
      logger.log("Checkbox changed directly");
      
      if (!appState) {
        logger.error("Cannot toggle: App state is null");
        return;
      }
      
      // Get current state from appState (the source of truth)
      const currentState = appState.isActive;
      handleZenModeToggle(currentState);
      
      return false;
    });
  }
  
  // Handle the toggle logic in a separate function for reuse
  function handleZenModeToggle(currentState: boolean) {
    // If currently on, need to verify before turning off
    if (currentState) {
      logger.log("Currently ON, attempting to turn OFF");
      
      if (!appState) {
        logger.error("State is null when attempting to toggle ZenMode");
        return;
      }
      
      // Check if passcode verification is needed
      if (appState.settings.passcodeEnabled) {
        const passcode = prompt('Enter passcode to exit ZenMode:');
        if (passcode !== appState.settings.passcode) {
          alert('Incorrect passcode. Stay focused!');
          return; // Keep ZenMode on
        }
      } 
      // Check if puzzle verification is needed
      else if (appState.settings.usePuzzleInsteadOfPasscode) {
        const num1 = Math.floor(Math.random() * 20) + 1;
        const num2 = Math.floor(Math.random() * 20) + 1;
        const operation = Math.random() > 0.5 ? '+' : '*';
        const correctAnswer = operation === '+' ? num1 + num2 : num1 * num2;
        
        const userAnswer = prompt(`Solve this puzzle to exit ZenMode:\n${num1} ${operation} ${num2} = ?`);
        if (!userAnswer || parseInt(userAnswer) !== correctAnswer) {
          alert('Incorrect answer. Stay focused!');
          return; // Keep ZenMode on
        }
      }
      
      // Passed verification, turn off
      setZenModeState(false);
    } else {
      // Turn on (no verification needed)
      logger.log("Currently OFF, turning ON");
      setZenModeState(true);
    }
  }
  
  // Helper function to set ZenMode state
  function setZenModeState(state: boolean) {
    logger.log(`Setting ZenMode to: ${state}`);
    
    // Show loading state
    statusText.textContent = state ? 'Turning on...' : 'Turning off...';
    toggleCheckbox.disabled = true; // Disable during transition
    
    // Then send message to update backend
    chrome.runtime.sendMessage({
      type: 'TOGGLE_ZEN_MODE',
      payload: { isActive: state }
    }, (response) => {
      toggleCheckbox.disabled = false; // Re-enable
      
      if (response && response.success) {
        // Update local state
        appState = response.state;
        
        // Make sure UI is updated based on the returned state, not what we set
        if (appState) {
          const actualState = appState.isActive;
          toggleCheckbox.checked = actualState;
          statusText.textContent = actualState ? 'ZenMode is on' : 'ZenMode is off';
          
          // Add some visual feedback to show the state change was successful
          switchEl.classList.add('state-changed');
          setTimeout(() => {
            switchEl.classList.remove('state-changed');
          }, 300);
          
          logger.log(`ZenMode is now: ${actualState ? 'ON' : 'OFF'}`);
        }
        
        updateUI();
      } else {
        // Revert UI on error
        logger.error("Failed to update ZenMode state:", response);
        toggleCheckbox.checked = !state;
        statusText.textContent = !state ? 'ZenMode is on' : 'ZenMode is off';
      }
    });
  }
  
  // Timer duration slider
  timerDuration.addEventListener('input', () => {
    if (!appState || !appState.isActive) return;
    
    const duration = parseInt(timerDuration.value);
    
    // Only update the countdown display if we're showing the initial timer value
    // (i.e., no timer is running, no timer was paused, and we're in countdown mode)
    if (!timer && 
        !pausedTime && 
        appState.settings.timer.timerMode === 'countdown' && 
        !appState.settings.timer.isActive) {
      displayTime(duration * 60);
    }
    // Never update the timer display if we have a pausedTime (timer was stopped)
    // This ensures the current time display shows the actual time left
    
    // Always update the slider value display
    if (sliderValue) {
      sliderValue.textContent = `${duration} min`;
    }
    
    // Update settings in background
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS',
      payload: { 
        timer: { 
          duration
        }
      }
    }, (response) => {
      if (response && response.success) {
        appState = response.state;
      }
    });
  });
  
  // Start/Stop timer button
  startTimerBtn.addEventListener('click', () => {
    if (!appState || !appState.isActive) return;
    
    const isTimerActive = appState.settings.timer.isActive;
    const timerMode = appState.settings.timer.timerMode || 'countdown';
    
    logger.log(`Timer button clicked: isActive=${isTimerActive}, mode=${timerMode}`);
    
    if (isTimerActive) {
      // Stop timer and save remaining time
      if (timerMode === 'countdown') {
        logger.log(`Stopping countdown timer with remainingTime=${remainingTime}`);
        pausedTime = remainingTime;
      } else {
        // For stopwatch, store elapsed time
        logger.log(`Stopping stopwatch with elapsedTime=${elapsedTime}`);
        pausedTime = elapsedTime;
      }
      stopTimer();
    } else {
      // Start a new timer
      const now = Date.now();
      
      if (timerMode === 'countdown') {
        // Countdown mode
        pausedTime = 0; // Reset paused time when starting fresh
        const duration = parseInt(timerDuration.value);
        logger.log(`Starting countdown timer with duration=${duration} minutes`);
        
        // Calculate endTime
        const endTime = now + (duration * 60 * 1000);
        
        // Set the correct initial remainingTime
        remainingTime = duration * 60;
        logger.log(`Setting initial remainingTime to ${remainingTime} seconds`);
        
        startNewTimer(duration, now, endTime);
      } else {
        // Stopwatch mode
        logger.log(`Starting stopwatch timer`);
        elapsedTime = 0; // Reset elapsed time for fresh start
        startNewTimer(0, now, 0); // For stopwatch, duration and endTime aren't used
      }
    }
  });
  
  // Resume timer button
  resumeTimerBtn.addEventListener('click', () => {
    if (!appState || !appState.isActive || pausedTime <= 0) return;
    
    const now = Date.now();
    const timerMode = appState.settings.timer.timerMode || 'countdown';
    
    logger.log(`Resuming timer: mode=${timerMode}, pausedTime=${pausedTime}`);
    
    if (timerMode === 'countdown') {
      // For countdown, calculate new end time based on remaining time
      const endTime = now + (pausedTime * 1000);
      // Use the original duration from settings
      const duration = appState.settings.timer.duration || 25;
      logger.log(`Countdown resume: duration=${duration}, remainingTime=${pausedTime}`);
      
      // Đảm bảo remainingTime được set đúng từ pausedTime trước khi gọi startNewTimer
      remainingTime = pausedTime;
      
      startNewTimer(duration, now, endTime);
    } else {
      // For stopwatch, we continue from the stored elapsed time
      logger.log(`Stopwatch resume: elapsedTime=${pausedTime}`);
      
      // Đảm bảo elapsedTime được set đúng từ pausedTime
      elapsedTime = pausedTime;
      
      // Tính lại startTime dựa trên elapsedTime hiện tại
      const adjustedStartTime = now - (elapsedTime * 1000);
      startNewTimer(0, adjustedStartTime, 0);
    }
    
    pausedTime = 0; // Reset paused time after resuming
  });
  
  // Function to stop the timer
  function stopTimer() {
    if (!appState) return;

    // Store current timer mode before stopping
    const currentTimerMode = appState.settings.timer.timerMode;
    
    // Store the current display time before stopping
    // This ensures we don't lose the current time display when adjusting slider
    if (currentTimerMode === 'countdown') {
      // Save the current remaining time for countdown
      pausedTime = remainingTime;
      logger.log(`Saving remaining time: ${pausedTime} seconds`);
    } else {
      // Save the current elapsed time for stopwatch
      pausedTime = elapsedTime;
      logger.log(`Saving elapsed time: ${pausedTime} seconds`);
    }

    // Nếu là chế độ stopwatch và đang có timer chạy, cần ghi nhận thời gian đã trôi qua
    if (currentTimerMode === 'stopwatch' && 
        appState.settings.timer.isActive && 
        timer) {
      // Chỉ cần gửi thông báo về endTime là undefined để giữ trạng thái startTime
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS',
        payload: { 
          timer: { 
            isActive: false,
            timerMode: 'stopwatch' // Ensure we stay in stopwatch mode
          }
        }
      }, (response) => {
        if (response && response.success) {
          appState = response.state;
          
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          
          startTimerBtn.classList.add('hidden');
          resumeTimerBtn.classList.remove('hidden');
          updateUI();
        }
      });
    } else {
      // Hành vi mặc định cho chế độ countdown
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS',
        payload: { 
          timer: { 
            isActive: false,
            startTime: undefined,
            endTime: undefined,
            timerMode: currentTimerMode // Preserve current timer mode
          }
        }
      }, (response) => {
        if (response && response.success) {
          appState = response.state;
          
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          
          startTimerBtn.classList.add('hidden');
          resumeTimerBtn.classList.remove('hidden');
          updateUI();
        }
      });
    }
  }
  
  // Reset timer button
  resetTimerBtn.addEventListener('click', () => {
    if (!appState || !appState.isActive) return;
    
    // Reset paused time
    pausedTime = 0;
    elapsedTime = 0;
    
    // Stop and reset timer
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS',
      payload: { 
        timer: { 
          isActive: false,
          startTime: undefined,
          endTime: undefined
        }
      }
    }, (response) => {
      if (response && response.success) {
        appState = response.state;
        
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
        
        if (appState && appState.settings.timer.timerMode === 'countdown') {
          const duration = parseInt(timerDuration.value);
          displayTime(duration * 60);
        } else {
          displayTime(0, true);
        }
        
        startTimerBtn.textContent = 'Start';
        startTimerBtn.classList.remove('hidden');
        resumeTimerBtn.classList.add('hidden');
      }
    });
    
    // Nếu đang trong chế độ ZenMode, hoàn thành phiên hiện tại và bắt đầu phiên mới
    chrome.runtime.sendMessage({
      type: 'TOGGLE_ZEN_MODE',
      payload: { isActive: false }
    }, () => {
      // Đợi một chút để đảm bảo phiên trước đã kết thúc
      setTimeout(() => {
        chrome.runtime.sendMessage({
          type: 'TOGGLE_ZEN_MODE',
          payload: { isActive: true }
        });
      }, 100);
    });
  });
  
  // Sound select
  soundSelect.addEventListener('change', () => {
    const soundType = soundSelect.value as AmbientSound['type'];
    
    // Show/hide custom URL input
    if (soundType === 'custom') {
      customSoundUrl.classList.remove('hidden');
    } else {
      customSoundUrl.classList.add('hidden');
      
      // Update sound settings
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS',
        payload: { 
          sound: { 
            type: soundType
          }
        }
      }, (response) => {
        if (response && response.success) {
          appState = response.state;
        }
      });
    }
  });
  
  // Custom sound URL
  customSoundUrl.addEventListener('blur', () => {
    const customUrl = customSoundUrl.value;
    
    if (customUrl) {
      chrome.runtime.sendMessage({ 
        type: 'UPDATE_SETTINGS',
        payload: { 
          sound: { 
            type: 'custom',
            customUrl
          }
        }
      }, (response) => {
        if (response && response.success) {
          appState = response.state;
        }
      });
    }
  });
  
  // Volume control
  volumeControl.addEventListener('input', () => {
    const volume = parseInt(volumeControl.value);
    
    chrome.runtime.sendMessage({ 
      type: 'UPDATE_SETTINGS',
      payload: { 
        sound: { 
          volume
        }
      }
    }, (response) => {
      if (response && response.success) {
        appState = response.state;
      }
    });
  });
  
  // Toggle sound button
  toggleSoundBtn.addEventListener('click', () => {
    if (!appState) return;
    
    const isPlaying = appState.settings.sound.isPlaying;
    
    // Show loading state
    toggleSoundBtn.textContent = isPlaying ? 'Stopping...' : 'Loading...';
    toggleSoundBtn.disabled = true;
    
    chrome.runtime.sendMessage({ 
      type: isPlaying ? 'STOP_SOUND' : 'PLAY_SOUND',
      payload: isPlaying ? undefined : {
        soundType: appState.settings.sound.type,
        volume: appState.settings.sound.volume,
        customUrl: appState.settings.sound.customUrl
      }
    }, (response) => {
      // Check if the sound operation was successful
      if (response && response.success) {
        // Update sound playing state
        chrome.runtime.sendMessage({ 
          type: 'UPDATE_SETTINGS',
          payload: { 
            sound: { 
              isPlaying: !isPlaying
            }
          }
        }, (response) => {
          if (response && response.success) {
            appState = response.state;
            toggleSoundBtn.textContent = !isPlaying ? 'Stop' : 'Play';
            
            // Visual feedback for sound playing
            if (!isPlaying) {
              // Sound started playing
              soundSelect.classList.add('active-sound');
              volumeControl.classList.add('active-sound');
              
              // Add animation to volume icon
              const volumeIcon = document.querySelector('.volume-icon');
              if (volumeIcon) {
                volumeIcon.classList.add('pulsing');
              }
            } else {
              // Sound stopped
              soundSelect.classList.remove('active-sound');
              volumeControl.classList.remove('active-sound');
              
              // Remove animation from volume icon
              const volumeIcon = document.querySelector('.volume-icon');
              if (volumeIcon) {
                volumeIcon.classList.remove('pulsing');
              }
            }
          }
          
          // Re-enable button
          toggleSoundBtn.disabled = false;
        });
      } else {
        // Error occurred
        logger.error('Error controlling sound');
        alert('There was an error playing the selected sound');
        toggleSoundBtn.textContent = 'Play';
        toggleSoundBtn.disabled = false;
      }
    });
  });
  
  // Settings button
  showSettingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  // History button
  viewHistoryBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('history.html') });
  });
}

// Initialize the popup
document.addEventListener('DOMContentLoaded', () => {
  initialize();
  
  // Thêm event listener cho các tab
  logger.log("Adding tab event listeners");
  
  // Timer mode tabs
  if (countdownTab && stopwatchTab) {
    countdownTab.addEventListener('click', () => {
      if (!appState) return;
      
      // Đảm bảo các phần tử UI đã được định nghĩa
      if (!countdownControls || !stopwatchControls) {
        logger.error('countdownControls or stopwatchControls not found');
        return;
      }
      
      // Get current timer state before switching
      const wasTimerActive = appState.settings.timer.isActive;
      // Store current duration value before switching
      const currentDuration = appState.settings.timer.duration || 25;
      
      // Dừng timer hiện tại nếu có
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      
      // Cập nhật giao diện ngay lập tức để feedback trực quan
      countdownTab.classList.add('active');
      stopwatchTab.classList.remove('active');
      countdownControls.classList.remove('hidden');
      stopwatchControls.classList.add('hidden');
      
      // Reset biến thời gian của chế độ khác
      elapsedTime = 0;
      
      // Đảm bảo hiển thị thời gian Countdown mặc định
      if (appState.settings.timer && appState.settings.timer.duration) {
        const duration = appState.settings.timer.duration;
        displayTime(duration * 60); // Update timer display
        updateDurationSlider(duration); // Update slider and its display separately
        
        // Update slider value display explicitly
        if (sliderValue) {
          sliderValue.textContent = `${duration} min`;
        }
      } else {
        displayTime(25 * 60); // Mặc định 25 phút
        updateDurationSlider(25); // Update slider separately
        
        // Update slider value display explicitly
        if (sliderValue) {
          sliderValue.textContent = '25 min';
        }
      }
      
      // Cập nhật appState thông qua message
      if (appState.settings.timer) {
        chrome.runtime.sendMessage({ 
          type: 'UPDATE_SETTINGS',
          payload: { 
            timer: { 
              timerMode: 'countdown',
              isActive: false, // Đảm bảo timer không chạy khi chuyển tab
              startTime: undefined,
              endTime: undefined,
              duration: currentDuration // Preserve the duration value
            }
          }
        }, (response) => {
          if (response && response.success) {
            appState = response.state;
            updateUI();
          }
        });
      }
    });
    
    stopwatchTab.addEventListener('click', () => {
      if (!appState) return;
      
      // Đảm bảo các phần tử UI đã được định nghĩa
      if (!countdownControls || !stopwatchControls) {
        logger.error('countdownControls or stopwatchControls not found');
        return;
      }
      
      // Get current timer state before switching
      const wasTimerActive = appState.settings.timer.isActive;
      
      // Dừng timer hiện tại nếu có
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      
      // Cập nhật giao diện ngay lập tức để feedback trực quan
      countdownTab.classList.remove('active');
      stopwatchTab.classList.add('active');
      countdownControls.classList.add('hidden');
      stopwatchControls.classList.remove('hidden');
      
      // Reset biến thời gian của chế độ khác
      remainingTime = 0;
      pausedTime = 0;
      
      // Đảm bảo hiển thị thời gian Stopwatch mặc định
      displayTime(0, true);
      
      // Cập nhật appState thông qua message
      if (appState.settings.timer) {
        chrome.runtime.sendMessage({ 
          type: 'UPDATE_SETTINGS',
          payload: { 
            timer: { 
              timerMode: 'stopwatch',
              isActive: false, // Đảm bảo timer không chạy khi chuyển tab
              startTime: undefined,
              endTime: undefined
            }
          }
        }, (response) => {
          if (response && response.success) {
            appState = response.state;
            updateUI();
          }
        });
      }
    });
  } else {
    logger.error('Timer tabs not found');
  }
}); 