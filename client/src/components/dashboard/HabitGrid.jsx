import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompletionCell from './CompletionCell';
import HabitEditModal from '../habit/HabitEditModal';
import { formatDate, getDateRange, isSameDay, getDayName } from '../../utils/dateUtils';
import { calculateHabitStats } from '../../utils/statisticsUtils';
import { isHabitApplicable } from '../../utils/frequencyUtils';
import './HabitGrid.css';

function HabitGrid({ habits, completions, dateRange, onUpdate, onNewHabit, showStats }) {
  const dates = getDateRange(dateRange.start, dateRange.end);
  const navigate = useNavigate();

  // Build completion map for fast lookup
  const completionMap = new Map();
  completions.forEach(c => {
    const key = `${c.habit_id}-${c.date}`;
    completionMap.set(key, c);
  });

  return (
    <div className="board-layout">
      <table className="board-table">
        <DateHeaderRow dates={dates} showStats={showStats} />
        <tbody>
          {habits.map(habit => (
            <HabitTableRow
              key={habit.id}
              habit={habit}
              dates={dates}
              completionMap={completionMap}
              completions={completions}
              onUpdate={onUpdate}
              navigate={navigate}
              showStats={showStats}
            />
          ))}
          <TallyTableRow
            habits={habits}
            dates={dates}
            completionMap={completionMap}
            onNewHabit={onNewHabit}
            showStats={showStats}
          />
        </tbody>
      </table>
    </div>
  );
}

// Date header row component
function DateHeaderRow({ dates, showStats }) {
  const today = new Date();

  return (
    <thead>
      <tr className="date-header-row">
        {/* Empty header for habit names */}
        <th className="habit-name-header"></th>

        {/* Date headers */}
        {dates.map((date, index) => {
          const monthAbbr = date.toLocaleDateString('en-US', { month: 'short' });
          const isToday = isSameDay(date, today);
          return (
            <th key={index} className={isToday ? 'date-header-cell today' : 'date-header-cell'}>
              <div className="date-column">
                <div className="date-month">{monthAbbr}</div>
                <div className="date-number">{date.getDate()}</div>
                <div className="date-day">{getDayName(date)}</div>
              </div>
            </th>
          );
        })}

        {/* Stats header */}
        {showStats && (
          <th className="stat-header-cell">
            <span className="stat-header-label">
              Current<br />Streak
            </span>
          </th>
        )}
      </tr>
    </thead>
  );
}

// Table row with habit name + cells for one habit
function HabitTableRow({ habit, dates, completionMap, completions, onUpdate, navigate, showStats }) {
  const [showEditModal, setShowEditModal] = useState(false);

  const handleHabitClick = () => {
    navigate(`/habit/${habit.id}`);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleHabitUpdated = () => {
    setShowEditModal(false);
    onUpdate();
  };

  const stats = showStats ? calculateHabitStats(habit, completions) : null;

  return (
    <>
      <tr>
        {/* First column: Habit name */}
        <td className="habit-name-cell">
          <div className="habit-label" onClick={handleHabitClick}>
            <div
              className="habit-color-indicator"
              style={{ backgroundColor: habit.color }}
            />
            <span className="habit-name">{habit.name}</span>
            <button
              className="btn-edit-habit"
              onClick={handleEditClick}
              title="Edit habit"
            >
              ⋯
            </button>
          </div>
        </td>

        {/* Date cells */}
        {dates.map((date, index) => {
          const dateStr = formatDate(date);
          const key = `${habit.id}-${dateStr}`;
          const completion = completionMap.get(key);

          return (
            <td key={index} className="completion-cell-wrapper">
              <CompletionCell
                habit={habit}
                date={date}
                completion={completion}
                completions={completions}
                onUpdate={onUpdate}
              />
            </td>
          );
        })}

        {/* Stats column */}
        {showStats && (
          <td className="stat-cell">
            <div className="stat-value">{stats.currentStreak}</div>
          </td>
        )}
      </tr>

      {showEditModal && (
        <HabitEditModal
          habit={habit}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleHabitUpdated}
          onDeleted={onUpdate}
        />
      )}
    </>
  );
}

// Tally row at bottom
function TallyTableRow({ habits, dates, completionMap, onNewHabit, showStats }) {
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
    <tr className="tally-row">
      {/* First column: New Habit button */}
      <td className="new-habit-cell">
        <button className="btn-new-habit" onClick={onNewHabit}>
          + New Habit
        </button>
      </td>

      {/* Tally cells */}
      {dates.map((date, index) => {
        const completed = calculateDailyTally(date);
        return (
          <td key={index} className="tally-cell">
            <span className="tally-count">{completed}</span>
          </td>
        );
      })}

      {/* Empty stats column */}
      {showStats && <td className="stat-cell"></td>}
    </tr>
  );
}

export default HabitGrid;
