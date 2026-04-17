import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../common/Header';
import { habitService } from '../../services/habitService';

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
        <div className="flex justify-center items-center h-[400px] text-ink-soft text-base">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <div className="max-w-[1000px] mx-auto p-6">
        <h2 className="m-0 mb-6 text-2xl font-semibold text-ink">Archived Habits</h2>

        {archivedHabits.length === 0 ? (
          <div className="bg-white rounded-sm p-10 text-center text-ink-soft shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            <p className="m-0">No archived habits yet.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {archivedHabits.map(habit => (
              <div
                key={habit.id}
                className="bg-white rounded-sm p-4 shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-5 h-5 rounded-[3px] flex-shrink-0"
                    style={{ backgroundColor: habit.color }}
                  />
                  <div className="min-w-0">
                    <h3 className="m-0 text-base font-medium text-ink truncate">{habit.name}</h3>
                    <div className="text-xs text-ink-soft mt-0.5">
                      {habit.frequency_type === 'daily'
                        ? 'Every day'
                        : `Custom: ${JSON.parse(habit.frequency_days || '[]').join(', ')}`}
                    </div>
                  </div>
                </div>

                {habitStats[habit.id] && (
                  <div className="grid grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-lg font-semibold text-ink">{habitStats[habit.id].current_streak}</div>
                      <div className="text-[10px] text-ink-soft uppercase tracking-wide">Current</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-ink">{habitStats[habit.id].longest_streak}</div>
                      <div className="text-[10px] text-ink-soft uppercase tracking-wide">Longest</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-ink">{habitStats[habit.id].total_completions}</div>
                      <div className="text-[10px] text-ink-soft uppercase tracking-wide">Total</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-semibold text-ink">{habitStats[habit.id].completion_rate}%</div>
                      <div className="text-[10px] text-ink-soft uppercase tracking-wide">Rate</div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 bg-white text-ink-soft border border-line rounded text-xs cursor-pointer transition-all hover:bg-surface-hover hover:border-line-dark"
                    onClick={() => handleViewDetails(habit.id)}
                  >
                    View Details
                  </button>
                  <button
                    className="px-3 py-1.5 bg-brand text-white border-none rounded text-xs cursor-pointer transition-colors hover:bg-brand-hover"
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
