import React, { useState, useEffect, useCallback } from 'react';
import Header from '../common/Header';
import HabitGrid from './HabitGrid';
import HabitCreateModal from '../habit/HabitCreateModal';
import { habitService } from '../../services/habitService';
import { completionService } from '../../services/completionService';
import { addDays, isSameDay } from '../../utils/dateUtils';
import { getTodayInTimezone, dateToUTC } from '../../utils/timezoneUtils';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css';

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

  // Calculate how many days can fit based on viewport width
  const calculateDaysToShow = useCallback(() => {
    const viewportWidth = window.innerWidth;
    const habitLabelWidth = 130;
    const statsColumnsWidth = 72; // 60px + 12px margin
    const dateColumnWidth = 35; // Cell width
    const padding = 120; // Increased padding for safety
    const boardPadding = 16; // board-layout padding (8px × 2)

    // Hide stats on mobile
    const shouldShowStats = viewportWidth >= 1200;
    setShowStats(shouldShowStats);

    const fixedWidth = habitLabelWidth + (shouldShowStats ? statsColumnsWidth : 0) + padding + boardPadding;
    const availableWidth = viewportWidth - fixedWidth;
    const days = Math.floor(availableWidth / dateColumnWidth);

    // Be conservative: subtract 1 to prevent overflow, then center
    const safeDays = Math.max(7, days - 1);

    // Minimum 7 days, maximum 60 days
    return Math.max(7, Math.min(safeDays, 60));
  }, []);

  // Update days to show on mount and resize
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
      // Convert dates to UTC for API call
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

    // Cap end date at today - never show future dates
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

  if (loading) {
    return (
      <div className="dashboard-loading">
        <Header />
        <div className="loading-message">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <Header />

      <div className="dashboard-content">
        {/* Navigation controls */}
        <div className="date-navigation">
          <button onClick={navigatePrev} className="nav-btn">&larr;</button>
          <button onClick={goToToday} className="btn-today">Today</button>
          <button
            onClick={navigateNext}
            className="nav-btn"
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
