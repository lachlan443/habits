import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import HeatmapCalendar from './HeatmapCalendar';
import { habitService } from '../../services/habitService';

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
        <div className="flex justify-center items-center h-[400px] text-ink-soft text-base">Loading...</div>
      </div>
    );
  }

  if (!habit || !stats) {
    return (
      <div>
        <Header />
        <div className="bg-danger-bg text-danger-text px-3 py-3 rounded mb-5 text-sm max-w-md mx-auto mt-6">
          Habit not found
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <div className="max-w-[1000px] mx-auto p-6">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-md flex-shrink-0"
              style={{ backgroundColor: habit.color }}
            />
            <h2 className="m-0 text-2xl font-semibold text-ink">{habit.name}</h2>
          </div>
          <button
            onClick={handleBack}
            className="px-4 py-2 bg-white text-ink-soft border border-line rounded cursor-pointer text-sm transition-all hover:bg-surface-hover hover:border-line-dark"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
          <div className="bg-white rounded-sm p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="text-2xl font-semibold text-ink">{stats.current_streak}</div>
            <div className="text-xs text-ink-soft uppercase tracking-wide mt-1">Current Streak</div>
          </div>

          <div className="bg-white rounded-sm p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="text-2xl font-semibold text-ink">{stats.longest_streak}</div>
            <div className="text-xs text-ink-soft uppercase tracking-wide mt-1">Longest Streak</div>
          </div>

          <div className="bg-white rounded-sm p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="text-2xl font-semibold text-ink">{stats.total_completions}</div>
            <div className="text-xs text-ink-soft uppercase tracking-wide mt-1">Total Count</div>
          </div>

          <div className="bg-white rounded-sm p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <div className="text-2xl font-semibold text-ink">{stats.completion_rate}%</div>
            <div className="text-xs text-ink-soft uppercase tracking-wide mt-1">Overall Rate</div>
          </div>
        </div>

        <HeatmapCalendar
          completionsByDate={stats.completions_by_date}
          habitColor={habit.color}
        />

        <div className="mt-4 text-sm text-ink-soft">
          <p>Tracking since {new Date(habit.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}

export default HabitDetailView;
