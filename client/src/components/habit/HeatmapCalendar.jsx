import React from 'react';
import { addDays, formatDate } from '../../utils/dateUtils';
import { getTodayInTimezone } from '../../utils/timezoneUtils';
import { useAuth } from '../../context/AuthContext';
import './HeatmapCalendar.css';

function HeatmapCalendar({ completionsByDate, habitColor }) {
  const { timezone } = useAuth();

  // Calculate the last 365 days in user's timezone
  const today = getTodayInTimezone(timezone);
  const startDate = addDays(today, -364); // 365 days including today

  // Generate array of all dates in the range
  const dates = [];
  for (let i = 0; i < 365; i++) {
    dates.push(addDays(startDate, i));
  }

  // Group dates by week (Sunday start)
  const weeks = [];
  let currentWeek = [];
  let currentWeekStart = dates[0].getDay(); // Day of week for first date

  // Add empty cells for days before the first date
  for (let i = 0; i < currentWeekStart; i++) {
    currentWeek.push(null);
  }

  dates.forEach((date, index) => {
    currentWeek.push(date);

    // If Sunday or last date, complete the week
    if (date.getDay() === 6 || index === dates.length - 1) {
      // Fill remaining days if needed
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  // Helper to get cell class based on completion status
  const getCellClass = (date) => {
    if (!date) return 'heatmap-cell empty';

    const dateStr = formatDate(date);
    const status = completionsByDate[dateStr];

    if (status === 'completed') {
      return 'heatmap-cell completed';
    } else if (status === 'skipped') {
      return 'heatmap-cell skipped';
    }
    return 'heatmap-cell empty';
  };

  // Helper to get cell style (background color for completed)
  const getCellStyle = (date) => {
    if (!date) return {};

    const dateStr = formatDate(date);
    const status = completionsByDate[dateStr];

    if (status === 'completed') {
      return { backgroundColor: habitColor };
    }
    return {};
  };

  // Month labels
  const monthLabels = [];
  let lastMonth = null;
  weeks.forEach((week, weekIndex) => {
    const firstDateInWeek = week.find(d => d !== null);
    if (firstDateInWeek) {
      const month = firstDateInWeek.getMonth();
      if (month !== lastMonth && weekIndex > 0) {
        monthLabels.push({
          weekIndex,
          label: firstDateInWeek.toLocaleDateString('en-US', { month: 'short' })
        });
        lastMonth = month;
      }
    }
  });

  return (
    <div className="heatmap-calendar">
      <div className="heatmap-header">
        <h3>Last 365 Days</h3>
      </div>

      <div className="heatmap-content">
        {/* Month labels */}
        <div className="heatmap-months">
          {monthLabels.map((label, index) => (
            <div
              key={index}
              className="month-label"
              style={{ gridColumn: label.weekIndex + 1 }}
            >
              {label.label}
            </div>
          ))}
        </div>

        {/* Days of week labels */}
        <div className="heatmap-days">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div key={index} className="day-label">
              {day}
            </div>
          ))}
        </div>

        {/* Heatmap grid */}
        <div className="heatmap-grid">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="heatmap-week">
              {week.map((date, dayIndex) => (
                <div
                  key={dayIndex}
                  className={getCellClass(date)}
                  style={getCellStyle(date)}
                  title={date ? formatDate(date) : ''}
                />
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="heatmap-legend">
          <span>Less</span>
          <div className="legend-cell empty" />
          <div className="legend-cell skipped" />
          <div className="legend-cell completed" style={{ backgroundColor: habitColor }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export default HeatmapCalendar;
