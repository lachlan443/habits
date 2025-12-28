import React from 'react';
import { formatDate } from '../../utils/dateUtils';
import { isHabitApplicable } from '../../utils/frequencyUtils';
import './TallyRow.css';

function TallyRow({ habits, dates, completionMap, onNewHabit, showStats }) {
  const calculateDailyTally = (date) => {
    const dateStr = formatDate(date);
    let completed = 0;

    habits.forEach(habit => {
      if (isHabitApplicable(habit, date)) {
        const key = `${habit.id}-${dateStr}`;
        const completion = completionMap.get(key);
        if (completion?.status === 'completed') {
          completed++;
        }
      }
    });

    return completed;
  };

  return (
    <div className="tally-row">
      <button className="btn-new-habit-inline" onClick={onNewHabit}>
        + New Habit
      </button>
      <div className="tally-cells">
        {dates.map((date, index) => {
          const completed = calculateDailyTally(date);
          return (
            <div key={index} className="tally-cell">
              <span className="tally-count">{completed}</span>
            </div>
          );
        })}
      </div>
      {showStats && (
        <div className="tally-stats-spacer">
          <div className="stat-spacer"></div>
          <div className="stat-spacer"></div>
          <div className="stat-spacer"></div>
        </div>
      )}
    </div>
  );
}

export default TallyRow;
