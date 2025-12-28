import React from 'react';
import { calculateHabitStats } from '../../utils/statisticsUtils';
import './StatisticsSidebar.css';

function StatisticsSidebar({ habits, completions }) {
  return (
    <div className="statistics-sidebar">
      <h3 className="sidebar-title">Statistics</h3>

      {habits.map(habit => {
        const stats = calculateHabitStats(habit, completions);

        return (
          <div key={habit.id} className="habit-stats">
            <div className="habit-stats-header">
              <div
                className="habit-stats-color"
                style={{ backgroundColor: habit.color }}
              />
              <span className="habit-stats-name">{habit.name}</span>
            </div>

            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-label">Current Streak</div>
                <div className="stat-value">{stats.currentStreak}</div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Longest Streak</div>
                <div className="stat-value">{stats.longestStreak}</div>
              </div>

              <div className="stat-item">
                <div className="stat-label">Total Count</div>
                <div className="stat-value">{stats.totalCount}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default StatisticsSidebar;
