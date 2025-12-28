import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import HeatmapCalendar from './HeatmapCalendar';
import { habitService } from '../../services/habitService';
import './HabitDetailView.css';

function HabitDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [habit, setHabit] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadHabitAndStats = useCallback(async () => {
    try {
      setLoading(true);
      const [habitData, statsData] = await Promise.all([
        habitService.getHabit(id),
        habitService.getHabitStats(id)
      ]);
      setHabit(habitData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load habit details:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadHabitAndStats();
  }, [loadHabitAndStats]);

  const handleBack = () => {
    navigate('/');
  };

  if (loading) {
    return (
      <div>
        <Header />
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  if (!habit || !stats) {
    return (
      <div>
        <Header />
        <div className="error-message">Habit not found</div>
      </div>
    );
  }

  return (
    <div className="habit-detail">
      <Header />

      <div className="habit-detail-content">
        <div className="habit-detail-header">
          <div className="habit-title-section">
            <div
              className="habit-color-large"
              style={{ backgroundColor: habit.color }}
            />
            <h2>{habit.name}</h2>
          </div>
          <button onClick={handleBack} className="btn-back">
            ← Back to Dashboard
          </button>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.current_streak}</div>
            <div className="stat-label">Current Streak</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{stats.longest_streak}</div>
            <div className="stat-label">Longest Streak</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{stats.total_completions}</div>
            <div className="stat-label">Total Count</div>
          </div>

          <div className="stat-card">
            <div className="stat-value">{stats.completion_rate}%</div>
            <div className="stat-label">Overall Rate</div>
          </div>
        </div>

        <HeatmapCalendar
          completionsByDate={stats.completions_by_date}
          habitColor={habit.color}
        />

        <div className="completions-info">
          <p>Tracking since {new Date(habit.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

export default HabitDetailView;
