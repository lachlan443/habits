import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompletionCell from './CompletionCell';
import HabitEditModal from '../habit/HabitEditModal';
import { formatDate } from '../../utils/dateUtils';
import { calculateHabitStats } from '../../utils/statisticsUtils';
import './HabitRow.css';

function HabitRow({ habit, dates, completionMap, completions, onUpdate, showStats }) {
  const [showEditModal, setShowEditModal] = useState(false);
  const navigate = useNavigate();

  const stats = showStats ? calculateHabitStats(habit, completions) : null;

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

  return (
    <>
      <div className="habit-row">
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

        <div className="completion-cells">
          {dates.map((date, index) => {
            const dateStr = formatDate(date);
            const key = `${habit.id}-${dateStr}`;
            const completion = completionMap.get(key);

            return (
              <CompletionCell
                key={index}
                habit={habit}
                date={date}
                completion={completion}
                completions={completions}
                onUpdate={onUpdate}
              />
            );
          })}
        </div>

        {showStats && (
          <div className="habit-stats-columns">
            <div className="stat-column">{stats.currentStreak}</div>
            <div className="stat-column">{stats.longestStreak}</div>
            <div className="stat-column">{stats.totalCount}</div>
          </div>
        )}
      </div>

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

export default HabitRow;
