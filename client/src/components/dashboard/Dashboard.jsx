import React, { useState, useEffect, useCallback } from 'react';
import Header from '../common/Header';
import HabitGrid from './HabitGrid';
import HabitCreateModal from '../habit/HabitCreateModal';
import { habitService } from '../../services/habitService';
import { completionService } from '../../services/completionService';
import { addDays, isSameDay } from '../../utils/dateUtils';
import { getTodayInTimezone, dateToUTC } from '../../utils/timezoneUtils';
import { useAuth } from '../../context/AuthContext';

function Dashboard() {
  const { timezone } = useAuth();
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [daysToShow, setDaysToShow] = useState(14);
  const [showStats, setShowStats] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: addDays(getTodayInTimezone(timezone), -13),
    end: getTodayInTimezone(timezone)
  });

  const calculateDaysToShow = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const habitLabelWidth = 130;
    const statsColumnsWidth = 72;
    const dateColumnWidth = 35;
    const padding = 120;
    const boardPadding = 16;

    const shouldShowStats = viewportWidth >= 1200;
    setShowStats(shouldShowStats);

    const fixedWidth = habitLabelWidth + (shouldShowStats ? statsColumnsWidth : 0) + padding + boardPadding;
    const availableWidth = viewportWidth - fixedWidth;
    const days = Math.floor(availableWidth / dateColumnWidth);

    const safeDays = Math.max(7, days - 1);

    return Math.max(7, Math.min(safeDays, 60));
  }, []);

  useEffect(() => {
    const updateDays = () => {
      const days = calculateDaysToShow();
      setDaysToShow(days);
      const today = getTodayInTimezone(timezone);
      setDateRange({
        start: addDays(today, -(days - 1)),
        end: today
      });
    };

    updateDays();
    window.addEventListener('resize', updateDays);
    return () => window.removeEventListener('resize', updateDays);
  }, [calculateDaysToShow, timezone]);

  const loadData = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      const startUTC = dateToUTC(dateRange.start, timezone);
      const endUTC = dateToUTC(dateRange.end, timezone);

      const [habitsData, completionsData] = await Promise.all([
        habitService.getHabits(false),
        completionService.getCompletions(startUTC, endUTC)
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

      <div className="mx-auto p-3 overflow-x-hidden flex flex-col items-center max-w-full">
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
          showStats={showStats}
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
