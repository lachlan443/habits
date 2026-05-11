import React, { useState, useEffect, useCallback } from 'react';
import Header from '../common/Header';
import HabitGrid from './HabitGrid';
import HabitCreateModal from '../habit/HabitCreateModal';
import { habitService } from '../../services/habitService';
import { completionService } from '../../services/completionService';
import { addDays, isSameDay, formatDate } from '../../utils/dateUtils';
import { getTodayInTimezone } from '../../utils/timezoneUtils';
import { useAuth } from '../../context/AuthContext';

function Dashboard() {
  const { timezone, masterKey } = useAuth();
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [daysToShow, setDaysToShow] = useState(14);
  const [dateRange, setDateRange] = useState({
    start: addDays(getTodayInTimezone(timezone), -13),
    end: getTodayInTimezone(timezone)
  });

  const calculateDays = useCallback(() => {
    const nameWidth = Math.max(90, Math.min(Math.round(window.innerWidth * 0.5), 220));
    const outerPadding = 10;  // 5px each side
    const tablePadding = 10;  // p-[5px]
    const statsWidth = 68;    // 60px col + border spacing
    const dateWidth = 36;     // 35px cell + 1px border spacing
    const available = window.innerWidth - outerPadding - tablePadding - nameWidth - statsWidth;
    return Math.max(1, Math.min(Math.floor(available / dateWidth), 60));
  }, []);

  useEffect(() => {
    const updateLayout = () => {
      const days = calculateDays();
      setDaysToShow(days);
      const today = getTodayInTimezone(timezone);
      setDateRange({
        start: addDays(today, -(days - 1)),
        end: today
      });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    return () => window.removeEventListener('resize', updateLayout);
  }, [calculateDays, timezone]);

  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const [habitsData, completionsData] = await Promise.all([
        habitService.getHabits(masterKey, false),
        completionService.getCompletions(formatDate(dateRange.start), formatDate(dateRange.end))
      ]);
      setHabits(habitsData);
      setCompletions(completionsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  }, [dateRange, timezone]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  const navigateNext = () => {
    const today = getTodayInTimezone(timezone);
    const newEnd = addDays(dateRange.end, daysToShow);
    const cappedEnd = newEnd > today ? today : newEnd;
    setDateRange({
      start: addDays(dateRange.start, daysToShow),
      end: cappedEnd
    });
  };

  const navigatePrev = () => {
    setDateRange({
      start: addDays(dateRange.start, -daysToShow),
      end: addDays(dateRange.end, -daysToShow)
    });
  };

  const goToToday = () => {
    const today = getTodayInTimezone(timezone);
    setDateRange({
      start: addDays(today, -(daysToShow - 1)),
      end: today
    });
  };

  const handleHabitCreated = async () => {
    setShowCreateModal(false);
    await loadData(false);
  };

  const handleReorder = async (newOrderIds) => {
    const habitMap = new Map(habits.map(h => [h.id, h]));
    setHabits(newOrderIds.map(id => habitMap.get(id)));
    try {
      await habitService.reorderHabits(newOrderIds);
    } catch (error) {
      console.error('Failed to reorder habits:', error);
      await loadData(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex justify-center items-center h-[400px] text-ink-soft text-base">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <Header />

      <div className="mx-auto px-[5px] py-3 overflow-x-hidden flex flex-col items-center max-w-full">
        <div className="inline-flex items-center bg-white border border-line rounded-lg shadow-sm mb-3 overflow-hidden">
          <button
            onClick={navigatePrev}
            className="px-3 py-2 text-ink-soft hover:bg-surface-hover hover:text-ink transition-colors border-r border-line"
          >
            ‹
          </button>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-ink-soft hover:bg-surface-hover hover:text-ink transition-colors"
          >
            Today
          </button>
          <button
            onClick={navigateNext}
            disabled={isSameDay(dateRange.end, getTodayInTimezone(timezone))}
            className="px-3 py-2 text-ink-soft hover:bg-surface-hover hover:text-ink transition-colors border-l border-line disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ›
          </button>
        </div>

        <HabitGrid
          habits={habits}
          completions={completions}
          dateRange={dateRange}
          onUpdate={loadData}
          onNewHabit={() => setShowCreateModal(true)}
          onReorder={handleReorder}
          showStats={true}
        />
      </div>

      {showCreateModal && (
        <HabitCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleHabitCreated}
        />
      )}
    </div>
  );
}

export default Dashboard;
