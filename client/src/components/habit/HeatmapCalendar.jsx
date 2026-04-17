import React from 'react';
import { addDays, formatDate } from '../../utils/dateUtils';
import { getTodayInTimezone } from '../../utils/timezoneUtils';
import { useAuth } from '../../context/AuthContext';

function HeatmapCalendar({ completionsByDate, habitColor }) {
  const { timezone } = useAuth();

  const today = getTodayInTimezone(timezone);
  const startDate = addDays(today, -364);

  const dates = [];
  for (let i = 0; i < 365; i++) {
    dates.push(addDays(startDate, i));
  }

  const weeks = [];
  let currentWeek = [];
  let currentWeekStart = dates[0].getDay();

  for (let i = 0; i < currentWeekStart; i++) {
    currentWeek.push(null);
  }

  dates.forEach((date, index) => {
    currentWeek.push(date);

    if (date.getDay() === 6 || index === dates.length - 1) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  const cellBase = "w-[14px] h-[14px] rounded-sm border border-line";
  const cellEmpty = `${cellBase} bg-surface-hover`;
  const cellCompleted = "w-[14px] h-[14px] rounded-sm border-0";
  const cellSkipped = `${cellBase} heatmap-stripes`;

  const getCellClass = (date) => {
    if (!date) return cellEmpty;

    const dateStr = formatDate(date);
    const status = completionsByDate[dateStr];

    if (status === 'completed') return cellCompleted;
    if (status === 'skipped') return cellSkipped;
    return cellEmpty;
  };

  const getCellStyle = (date) => {
    if (!date) return {};
    const dateStr = formatDate(date);
    const status = completionsByDate[dateStr];
    if (status === 'completed') return { backgroundColor: habitColor };
    return {};
  };

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
    <div className="bg-white rounded-sm p-4 mt-6 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <div>
        <h3 className="m-0 mb-4 text-lg font-semibold text-ink">Last 365 Days</h3>
      </div>

      <div className="overflow-x-auto">
        <div className="grid grid-flow-col [grid-auto-columns:14px] gap-0.5 mb-1 ml-10">
          {monthLabels.map((label, index) => (
            <div
              key={index}
              className="text-[11px] text-ink-soft"
              style={{ gridColumn: label.weekIndex + 1 }}
            >
              {label.label}
            </div>
          ))}
        </div>

        <div className="grid grid-rows-7 [grid-template-rows:repeat(7,14px)] gap-0.5 float-left mr-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
            <div key={index} className="text-[10px] text-ink-soft flex items-center w-8">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-flow-col [grid-auto-columns:14px] gap-0.5 ml-10">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid [grid-template-rows:repeat(7,14px)] gap-0.5">
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

        <div className="flex items-center gap-1 mt-3 justify-end text-xs text-ink-soft clear-both">
          <span>Less</span>
          <div className={cellEmpty} />
          <div className={cellSkipped} />
          <div className={cellCompleted} style={{ backgroundColor: habitColor }} />
          <span>More</span>
        </div>
      </div>
    </div>
  );
}

export default HeatmapCalendar;
