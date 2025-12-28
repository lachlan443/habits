import React from 'react';
import { getDateRange, getDayName, isSameDay } from '../../utils/dateUtils';
import './DateHeader.css';

function DateHeader({ dateRange, onPrev, onNext, onToday, showStats }) {
  const dates = getDateRange(dateRange.start, dateRange.end);
  const today = new Date();

  // Disable next button if we're already at today
  const isAtToday = isSameDay(dateRange.end, today);

  return (
    <div className="date-header">
      <div className="date-navigation">
        <button onClick={onPrev} className="nav-btn">&larr;</button>
        <button onClick={onToday} className="btn-today">Today</button>
        <button
          onClick={onNext}
          className="nav-btn"
          disabled={isAtToday}
        >
          &rarr;
        </button>
      </div>

      <div className="date-header-layout">
        <table className="date-header-table">
          <tbody>
            <tr>
              {/* First column: Empty spacer for habit names */}
              <td className="habit-name-header"></td>

              {/* Date columns */}
              {dates.map((date, index) => {
                const monthAbbr = date.toLocaleDateString('en-US', { month: 'short' });
                const isToday = isSameDay(date, today);
                return (
                  <td key={index} className={isToday ? 'today' : ''}>
                    <div className="date-column">
                      <div className="date-month">{monthAbbr}</div>
                      <div className="date-number">{date.getDate()}</div>
                      <div className="date-day">{getDayName(date)}</div>
                    </div>
                  </td>
                );
              })}

              {/* Stats header */}
              {showStats && (
                <td className="stat-header-cell">
                  <span className="stat-header-label">
                    Current<br />Streak
                  </span>
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default DateHeader;
