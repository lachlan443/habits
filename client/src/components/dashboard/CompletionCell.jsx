import React, { useRef } from 'react';
import { completionService } from '../../services/completionService';
import { formatDate, isSameDay, addDays } from '../../utils/dateUtils';
import { dateToUTC, getTodayInTimezone } from '../../utils/timezoneUtils';
import { isHabitApplicable } from '../../utils/frequencyUtils';
import { useAuth } from '../../context/AuthContext';
import './CompletionCell.css';

function CompletionCell({ habit, date, completion, onUpdate, completions }) {
  const { timezone } = useAuth();
  const isApplicable = isHabitApplicable(habit, date);
  const isToday = isSameDay(date, getTodayInTimezone(timezone));
  const isUpdating = useRef(false);

  // Calculate streak leading up to this date
  const calculateStreakForDate = () => {
    if (completion?.status !== 'completed') return 0;

    let streak = 1;
    let checkDate = addDays(date, -1);

    // Look backwards to count consecutive completed/skipped days
    for (let i = 0; i < 365; i++) {
      if (!isHabitApplicable(habit, checkDate)) {
        checkDate = addDays(checkDate, -1);
        continue;
      }

      const checkDateStr = formatDate(checkDate);
      const prevCompletion = completions?.find(
        c => c.habit_id === habit.id && c.date === checkDateStr
      );

      if (prevCompletion && (prevCompletion.status === 'completed' || prevCompletion.status === 'skipped')) {
        if (prevCompletion.status === 'completed') {
          streak++;
        }
        checkDate = addDays(checkDate, -1);
      } else {
        break;
      }
    }

    return streak;
  };

  const streak = calculateStreakForDate();

  // Calculate darker color based on streak (max darkening at 30 days)
  const getDarkenedColor = (baseColor, streakLength) => {
    if (streakLength === 0) return baseColor;

    // Convert hex to RGB
    const hex = baseColor.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    // Calculate darkening factor (0 to 0.5, capped at 30 days)
    const maxStreak = 30;
    const darkenFactor = Math.min(streakLength / maxStreak, 1) * 0.5;

    // Darken by moving towards black
    r = Math.round(r * (1 - darkenFactor));
    g = Math.round(g * (1 - darkenFactor));
    b = Math.round(b * (1 - darkenFactor));

    return `rgb(${r}, ${g}, ${b})`;
  };

  // Single-click round-robin: empty → complete → skipped → empty
  const handleClick = async () => {
    if (!isApplicable || isUpdating.current) return;

    isUpdating.current = true;

    try {
      // Convert date to UTC for API
      const dateUTC = dateToUTC(date, timezone);

      if (!completion) {
        // Empty → Completed
        await completionService.createCompletion({
          habit_id: habit.id,
          date: dateUTC,
          status: 'completed'
        });
      } else if (completion.status === 'completed') {
        // Completed → Skipped
        await completionService.createCompletion({
          habit_id: habit.id,
          date: dateUTC,
          status: 'skipped'
        });
      } else if (completion.status === 'skipped') {
        // Skipped → Empty (delete)
        await completionService.deleteCompletionByDate(habit.id, dateUTC);
      }
      await onUpdate();
    } catch (error) {
      console.error('Failed to update completion:', error);
      // Refresh data even on error to sync state
      await onUpdate();
    } finally {
      isUpdating.current = false;
    }
  };

  // Determine cell classes
  let cellClass = 'cell';
  if (!isApplicable) {
    cellClass += ' disabled';
  } else if (completion?.status === 'completed') {
    cellClass += ' completed';
  } else if (completion?.status === 'skipped') {
    cellClass += ' skipped';
  }
  if (isToday) {
    cellClass += ' today';
  }

  // Get cell background style
  const getCellStyle = () => {
    if (completion?.status === 'completed') {
      return { backgroundColor: getDarkenedColor(habit.color, streak) };
    } else if (completion?.status === 'skipped') {
      // Diagonal half-fill for skipped with anti-aliasing
      return {
        background: `linear-gradient(to top right, ${habit.color} 49.5%, white 50.5%)`
      };
    }
    return { backgroundColor: 'transparent' };
  };

  return (
    <div
      className={cellClass}
      style={getCellStyle()}
      onClick={handleClick}
    />
  );
}

export default CompletionCell;
