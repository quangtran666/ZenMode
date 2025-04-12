import { WorkSession, ZenModeState } from '../types';
import { loadState } from '../utils/storage';

// DOM Elements - Stats
const totalSessionsEl = document.getElementById('total-sessions') as HTMLDivElement;
const totalHoursEl = document.getElementById('total-hours') as HTMLDivElement;
const avgDurationEl = document.getElementById('avg-duration') as HTMLDivElement;
const streakDaysEl = document.getElementById('streak-days') as HTMLDivElement;

// DOM Elements - Chart
const timeChartEl = document.getElementById('time-chart') as HTMLDivElement;

// DOM Elements - Filters
const dateRangeSelect = document.getElementById('date-range') as HTMLSelectElement;
const startDateGroup = document.getElementById('start-date-group') as HTMLDivElement;
const endDateGroup = document.getElementById('end-date-group') as HTMLDivElement;
const startDateInput = document.getElementById('start-date') as HTMLInputElement;
const endDateInput = document.getElementById('end-date') as HTMLInputElement;

// DOM Elements - Table
const sessionsTable = document.getElementById('sessions-table') as HTMLTableElement;
const sessionsBody = document.getElementById('sessions-body') as HTMLTableSectionElement;
const noDataEl = document.getElementById('no-data') as HTMLDivElement;

// DOM Elements - Buttons
const exportCsvBtn = document.getElementById('export-csv') as HTMLButtonElement;
const downloadCsvBtn = document.getElementById('download-csv') as HTMLButtonElement;
const returnToPopupBtn = document.getElementById('return-to-popup') as HTMLButtonElement;

// App state
let appState: ZenModeState | null = null;
let filteredSessions: WorkSession[] = [];

// Date ranges
type DateRange = {
  start: Date;
  end: Date;
};

// Initialize history page
async function initialize() {
  // Load current state
  appState = await loadState();
  
  // Set default date range
  setDefaultDates();
  
  // Filter sessions based on default selection (today)
  filterSessions();
  
  // Setup event listeners
  setupEventListeners();
}

// Set default dates for date inputs
function setDefaultDates() {
  const today = new Date();
  const todayStr = formatDateForInput(today);
  
  // Default to today
  startDateInput.value = todayStr;
  endDateInput.value = todayStr;
}

// Format date for date input (YYYY-MM-DD)
function formatDateForInput(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Filter sessions based on selected date range
function filterSessions() {
  if (!appState) return;
  
  const history = appState.history;
  const dateRange = getSelectedDateRange();
  
  if (!dateRange) {
    // Show all sessions
    filteredSessions = [...history];
  } else {
    // Filter by date range
    filteredSessions = history.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= dateRange.start && sessionDate <= dateRange.end;
    });
  }
  
  // Sort by start time (newest first)
  filteredSessions.sort((a, b) => b.startTime - a.startTime);
  
  // Update UI
  updateStats();
  updateSessionsTable();
}

// Get selected date range based on dropdown selection
function getSelectedDateRange(): DateRange | null {
  const selected = dateRangeSelect.value;
  
  if (selected === 'all') {
    return null;
  }
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  switch (selected) {
    case 'today':
      return {
        start: today,
        end: tomorrow
      };
      
    case 'yesterday': {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        start: yesterday,
        end: today
      };
    }
    
    case 'this-week': {
      const startOfWeek = new Date(today);
      // Move to Sunday of current week
      const dayOfWeek = today.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
      
      return {
        start: startOfWeek,
        end: tomorrow
      };
    }
    
    case 'last-week': {
      const startOfLastWeek = new Date(today);
      // Move to Sunday of last week
      const dayOfWeek = today.getDay();
      startOfLastWeek.setDate(startOfLastWeek.getDate() - dayOfWeek - 7);
      
      const endOfLastWeek = new Date(startOfLastWeek);
      endOfLastWeek.setDate(endOfLastWeek.getDate() + 7);
      
      return {
        start: startOfLastWeek,
        end: endOfLastWeek
      };
    }
    
    case 'this-month': {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        start: startOfMonth,
        end: tomorrow
      };
    }
    
    case 'custom': {
      const startDate = startDateInput.value ? new Date(startDateInput.value) : today;
      let endDate = endDateInput.value ? new Date(endDateInput.value) : today;
      
      // Add a day to end date to include the full day
      endDate = new Date(endDate);
      endDate.setDate(endDate.getDate() + 1);
      
      return {
        start: startDate,
        end: endDate
      };
    }
    
    default:
      return null;
  }
}

// Update stats based on filtered sessions
function updateStats() {
  // Total sessions
  totalSessionsEl.textContent = filteredSessions.length.toString();
  
  // Total hours
  const totalSeconds = filteredSessions.reduce((total, session) => {
    return total + (session.duration || 0);
  }, 0);
  
  const totalHours = Math.floor(totalSeconds / 3600);
  const totalMinutes = Math.floor((totalSeconds % 3600) / 60);
  
  if (totalHours > 0) {
    totalHoursEl.textContent = `${totalHours}h ${totalMinutes}m`;
  } else {
    totalHoursEl.textContent = `${totalMinutes}m`;
  }
  
  // Average duration
  if (filteredSessions.length > 0) {
    const avgSeconds = totalSeconds / filteredSessions.length;
    const avgMinutes = Math.floor(avgSeconds / 60);
    
    avgDurationEl.textContent = `${avgMinutes}m`;
  } else {
    avgDurationEl.textContent = '0m';
  }
  
  // Calculate streak
  if (appState) {
    const streak = calculateStreak(appState.history);
    streakDaysEl.textContent = streak.toString();
  }
  
  // Render chart
  renderChart();
}

// Calculate the current day streak
function calculateStreak(sessions: WorkSession[]): number {
  if (sessions.length === 0) return 0;
  
  // Get unique days with sessions
  const uniqueDays = new Set<string>();
  
  sessions.forEach(session => {
    const date = new Date(session.startTime);
    const dateStr = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    uniqueDays.add(dateStr);
  });
  
  const days = Array.from(uniqueDays).sort();
  
  // Check if today has sessions
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  
  if (!uniqueDays.has(todayStr)) {
    // Check if yesterday had sessions
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    
    if (!uniqueDays.has(yesterdayStr)) {
      return 0;
    }
  }
  
  // Count consecutive days backwards from today
  let streak = 0;
  let currentDate = new Date();
  
  while (true) {
    const dateStr = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${currentDate.getDate()}`;
    
    if (uniqueDays.has(dateStr)) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  return streak;
}

// Update sessions table
function updateSessionsTable() {
  // Clear existing rows
  sessionsBody.innerHTML = '';
  
  // Show "no data" message if no sessions
  if (filteredSessions.length === 0) {
    sessionsTable.style.display = 'none';
    noDataEl.style.display = 'block';
    return;
  }
  
  // Hide "no data" message and show table
  sessionsTable.style.display = 'table';
  noDataEl.style.display = 'none';
  
  // Add rows for each session
  filteredSessions.forEach(session => {
    const row = document.createElement('tr');
    
    // Date
    const dateCell = document.createElement('td');
    const startDate = new Date(session.startTime);
    dateCell.textContent = startDate.toLocaleDateString();
    row.appendChild(dateCell);
    
    // Start time
    const startTimeCell = document.createElement('td');
    startTimeCell.textContent = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    row.appendChild(startTimeCell);
    
    // End time
    const endTimeCell = document.createElement('td');
    if (session.endTime) {
      const endDate = new Date(session.endTime);
      endTimeCell.textContent = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      endTimeCell.textContent = '-';
    }
    row.appendChild(endTimeCell);
    
    // Duration
    const durationCell = document.createElement('td');
    if (session.duration) {
      const hours = Math.floor(session.duration / 3600);
      const minutes = Math.floor((session.duration % 3600) / 60);
      
      if (hours > 0) {
        durationCell.textContent = `${hours}h ${minutes}m`;
      } else {
        durationCell.textContent = `${minutes}m`;
      }
    } else {
      durationCell.textContent = '-';
    }
    row.appendChild(durationCell);
    
    // Status
    const statusCell = document.createElement('td');
    statusCell.textContent = session.completed ? 'Completed' : 'Interrupted';
    row.appendChild(statusCell);
    
    // Add row to table
    sessionsBody.appendChild(row);
  });
}

// Generate and download CSV
function downloadCSV() {
  if (filteredSessions.length === 0) {
    alert('No sessions to export.');
    return;
  }
  
  // CSV header
  const header = ['Date', 'Start Time', 'End Time', 'Duration (seconds)', 'Status'];
  
  // CSV rows
  const rows = filteredSessions.map(session => {
    const startDate = new Date(session.startTime);
    const dateStr = startDate.toLocaleDateString();
    const startTimeStr = startDate.toLocaleTimeString();
    
    let endTimeStr = '-';
    if (session.endTime) {
      const endDate = new Date(session.endTime);
      endTimeStr = endDate.toLocaleTimeString();
    }
    
    const duration = session.duration || 0;
    const status = session.completed ? 'Completed' : 'Interrupted';
    
    return [dateStr, startTimeStr, endTimeStr, duration.toString(), status];
  });
  
  // Combine header and rows
  const csvContent = [
    header.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');
  
  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  // Set filename with date
  const now = new Date();
  const filename = `zenmode_history_${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}.csv`;
  
  // Trigger download
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Setup event listeners
function setupEventListeners() {
  // Date range select
  dateRangeSelect.addEventListener('change', () => {
    const selected = dateRangeSelect.value;
    
    // Show/hide custom date inputs
    if (selected === 'custom') {
      startDateGroup.style.display = 'block';
      endDateGroup.style.display = 'block';
    } else {
      startDateGroup.style.display = 'none';
      endDateGroup.style.display = 'none';
    }
    
    // Filter sessions
    filterSessions();
  });
  
  // Custom date inputs
  startDateInput.addEventListener('change', filterSessions);
  endDateInput.addEventListener('change', filterSessions);
  
  // Export CSV button
  exportCsvBtn.addEventListener('click', downloadCSV);
  downloadCsvBtn.addEventListener('click', downloadCSV);
  
  // Return to popup button
  returnToPopupBtn.addEventListener('click', () => {
    window.close();
  });
}

// Render the time distribution chart
function renderChart() {
  // Clear previous chart
  timeChartEl.innerHTML = '';
  
  if (filteredSessions.length === 0) {
    timeChartEl.innerHTML = '<div class="no-data">No data available for chart.</div>';
    return;
  }
  
  // Make sure the chart container has position:relative
  timeChartEl.style.position = 'relative';
  
  // Group sessions by day
  const sessionsByDay = new Map<string, number>(); // day -> total minutes
  
  // Get date range for filtered sessions
  let minDate: Date | null = null;
  let maxDate: Date | null = null;
  
  filteredSessions.forEach(session => {
    const date = new Date(session.startTime);
    const dateStr = formatDateForDisplay(date);
    
    if (!minDate || date < minDate) minDate = new Date(date);
    if (!maxDate || date > maxDate) maxDate = new Date(date);
    
    // Add session duration in minutes
    const durationMinutes = session.duration ? Math.floor(session.duration / 60) : 0;
    
    if (sessionsByDay.has(dateStr)) {
      sessionsByDay.set(dateStr, sessionsByDay.get(dateStr)! + durationMinutes);
    } else {
      sessionsByDay.set(dateStr, durationMinutes);
    }
  });
  
  // Fill in missing days in the range
  if (minDate && maxDate) {
    const currentDate = new Date(minDate);
    const endDate = new Date(maxDate); // Make a copy of maxDate
    
    while (currentDate <= endDate) {
      const dateStr = formatDateForDisplay(currentDate);
      
      if (!sessionsByDay.has(dateStr)) {
        sessionsByDay.set(dateStr, 0);
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  // Sort dates
  const sortedDays = Array.from(sessionsByDay.keys()).sort();
  
  // Find maximum value for scaling
  const maxMinutes = Math.max(...Array.from(sessionsByDay.values()));
  
  // Create chart container
  const chartEl = document.createElement('div');
  chartEl.className = 'chart-bars';
  chartEl.style.display = 'flex';
  chartEl.style.alignItems = 'flex-end';
  chartEl.style.justifyContent = 'space-between';
  chartEl.style.height = '250px';
  chartEl.style.padding = '0 10px';
  
  // Create bars for each day
  sortedDays.forEach(day => {
    const minutes = sessionsByDay.get(day) || 0;
    const percentage = maxMinutes ? (minutes / maxMinutes) * 100 : 0;
    
    // Create bar container
    const barContainer = document.createElement('div');
    barContainer.style.display = 'flex';
    barContainer.style.flexDirection = 'column';
    barContainer.style.alignItems = 'center';
    barContainer.style.width = `${100 / sortedDays.length}%`;
    barContainer.style.maxWidth = '40px';
    
    // Create bar
    const bar = document.createElement('div');
    bar.className = 'chart-bar';
    bar.style.height = `${percentage}%`;
    bar.style.width = '15px';
    bar.style.backgroundColor = 'var(--primary-color)';
    bar.style.borderRadius = '2px 2px 0 0';
    bar.title = `${day}: ${minutes} minutes`;
    
    // Create label
    const label = document.createElement('div');
    label.className = 'chart-label';
    label.textContent = day.split('/')[1]; // Show only day part
    label.style.fontSize = '10px';
    label.style.marginTop = '5px';
    label.style.color = 'var(--dark-gray)';
    
    // Append elements
    barContainer.appendChild(bar);
    barContainer.appendChild(label);
    chartEl.appendChild(barContainer);
  });
  
  // Append chart to container
  timeChartEl.appendChild(chartEl);
  
  // Add Y-axis labels
  const yAxis = document.createElement('div');
  yAxis.className = 'y-axis';
  yAxis.style.position = 'absolute';
  yAxis.style.left = '5px';
  yAxis.style.top = '0';
  yAxis.style.height = '100%';
  yAxis.style.display = 'flex';
  yAxis.style.flexDirection = 'column';
  yAxis.style.justifyContent = 'space-between';
  yAxis.style.fontSize = '10px';
  yAxis.style.color = 'var(--dark-gray)';
  
  // Add labels
  const labels = [
    { value: maxMinutes, label: `${maxMinutes}m` },
    { value: maxMinutes * 0.75, label: `${Math.floor(maxMinutes * 0.75)}m` },
    { value: maxMinutes * 0.5, label: `${Math.floor(maxMinutes * 0.5)}m` },
    { value: maxMinutes * 0.25, label: `${Math.floor(maxMinutes * 0.25)}m` },
    { value: 0, label: '0m' }
  ];
  
  labels.forEach(item => {
    const label = document.createElement('div');
    label.textContent = item.label;
    yAxis.appendChild(label);
  });
  
  timeChartEl.appendChild(yAxis);
}

// Format date for display (MM/DD)
function formatDateForDisplay(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}

// Initialize the history page
document.addEventListener('DOMContentLoaded', initialize); 