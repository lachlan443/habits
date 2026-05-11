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
  const { timezone, masterKey, preferences } = useAuth();
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
    const displayLength = preferences?.habitNameDisplayLength ?? 20;
    const nameWidth = Math.max(90, Math.min(displayLength * 8 + 64, 220));
    const outerPadding = 20;  // 10px each side
    const tablePadding = 16;  // p-2
    const statsWidth = 68;    // 60px col + border spacing
    const dateWidth = 36;     // 35px cell + 1px border spacing
    const available = window.innerWidth - outerPadding - tablePadding - nameWidth - statsWidth;
    return Math.max(1, Math.min(Math.floor(available / dateWidth), 60));
  }, [preferences?.habitNameDisplayLength]);

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
    const newEnd = addDays(dateRange.end, 7);
    const cappedEnd = newEnd > today ? today : newEnd;

    setDateRange({
      start: addDays(dateRange.start, 7),
      end: cappedEnd
    });
  };

  const navigatePrev = () => {
    setDateRange({
      start: addDays(dateRange.start, -7),
      end: addDays(dateRange.end, -7)
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

  const navBtnClass = "px-4 py-2 bg-transparent border border-line rounded cursor-pointer text-lg transition-all hover:bg-surface-hover hover:border-line-dark disabled:opacity-50 disabled:cursor-not-allowed";

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

      <div className="mx-auto px-[10px] py-3 overflow-x-hidden flex flex-col items-center max-w-full">
        <div className="flex justify-center items-center gap-3 mb-2">
          <button onClick={navigatePrev} className={navBtnClass}>&larr;</button>
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-white border border-line rounded cursor-pointer text-sm transition-all hover:bg-surface-hover hover:border-line-dark"
          >
            Today
          </button>
          <button
            onClick={navigateNext}
            className={navBtnClass}
            disabled={isSameDay(dateRange.end, getTodayInTimezone(timezone))}
          >
            &rarr;
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
