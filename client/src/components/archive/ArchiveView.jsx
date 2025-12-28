import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import { habitService } from '../../services/habitService';
import './ArchiveView.css';

function ArchiveView() {
  const navigate = useNavigate();
  const [archivedHabits, setArchivedHabits] = useState([]);
  const [habitStats, setHabitStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadArchivedHabits();
  }, []);

  const loadArchivedHabits = async () => {
    try {
      setLoading(true);
      const habits = await habitService.getHabits(true);
      const archived = habits.filter(h => h.archived);
      setArchivedHabits(archived);

      // Load stats for each archived habit
      const statsPromises = archived.map(habit =>
        habitService.getHabitStats(habit.id)
      );
      const stats = await Promise.all(statsPromises);

      const statsMap = {};
      archived.forEach((habit, index) => {
        statsMap[habit.id] = stats[index];
      });
      setHabitStats(statsMap);
    } catch (error) {
      console.error('Failed to load archived habits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (habitId) => {
    try {
      await habitService.updateHabit(habitId, { archived: false });
      await loadArchivedHabits();
    } catch (error) {
      console.error('Failed to unarchive habit:', error);
    }
  };

  const handleViewDetails = (habitId) => {
    navigate(`/habit/${habitId}`);
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  return (
    <div className="archive-view">
      <Header />

      <div className="archive-content">
        <h2>Archived Habits</h2>

        {archivedHabits.length === 0 ? (
          <div className="empty-state">
            <p>No archived habits yet.</p>
          </div>
        ) : (
          <div className="archived-habits-list">
            {archivedHabits.map(habit => (
              <div key={habit.id} className="archived-habit-card">
                <div className="habit-info">
                  <div
                    className="habit-color"
                    style={{ backgroundColor: habit.color }}
                  />
                  <div className="habit-details">
                    <h3>{habit.name}</h3>
                    <div className="habit-frequency">
                      {habit.frequency_type === 'daily'
                        ? 'Every day'
                        : `Custom: ${JSON.parse(habit.frequency_days || '[]').join(', ')}`}
                    </div>
                  </div>
                </div>

                {habitStats[habit.id] && (
                  <div className="habit-stats">
                    <div className="stat">
                      <div className="stat-value">{habitStats[habit.id].current_streak}</div>
                      <div className="stat-label">Current Streak</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{habitStats[habit.id].longest_streak}</div>
                      <div className="stat-label">Longest Streak</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{habitStats[habit.id].total_completions}</div>
                      <div className="stat-label">Total</div>
                    </div>
                    <div className="stat">
                      <div className="stat-value">{habitStats[habit.id].completion_rate}%</div>
                      <div className="stat-label">Rate</div>
                    </div>
                  </div>
                )}

                <div className="habit-actions">
                  <button
                    className="btn-view"
                    onClick={() => handleViewDetails(habit.id)}
                  >
                    View Details
                  </button>
                  <button
                    className="btn-unarchive"
                    onClick={() => handleUnarchive(habit.id)}
                  >
                    Unarchive
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ArchiveView;
