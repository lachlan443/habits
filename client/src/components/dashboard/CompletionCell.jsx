import React, { useRef } from 'react';
import { completionService } from '../../services/completionService';
import { formatDate, isSameDay, addDays } from '../../utils/dateUtils';
import { dateToUTC, getTodayInTimezone } from '../../utils/timezoneUtils';
import { isHabitApplicable } from '../../utils/frequencyUtils';
import { useAuth } from '../../context/AuthContext';

function CompletionCell({ habit, date, completion, onUpdate, completions }) {
  const { timezone } = useAuth();
  const isApplicable = isHabitApplicable(habit, date);
  const isToday = isSameDay(date, getTodayInTimezone(timezone));
  const isUpdating = useRef(false);

  const calculateStreakForDate = () => {
    if (completion?.status !== 'completed') return 0;

    let streak = 1;
    let checkDate = addDays(date, -1);

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

  const getDarkenedColor = (baseColor, streakLength) => {
    if (streakLength === 0) return baseColor;

    const hex = baseColor.replace('#', '');
    let r = parseInt(hex.substr(0, 2), 16);
    let g = parseInt(hex.substr(2, 2), 16);
    let b = parseInt(hex.substr(4, 2), 16);

    const maxStreak = 30;
    const darkenFactor = Math.min(streakLength / maxStreak, 1) * 0.5;

    r = Math.round(r * (1 - darkenFactor));
    g = Math.round(g * (1 - darkenFactor));
    b = Math.round(b * (1 - darkenFactor));

    return `rgb(${r}, ${g}, ${b})`;
  };

  const handleClick = async () => {
    if (!isApplicable || isUpdating.current) return;

    isUpdating.current = true;

    try {
      const dateUTC = dateToUTC(date, timezone);

      if (!completion) {
        await completionService.createCompletion({
          habit_id: habit.id,
          date: dateUTC,
          status: 'completed'
        });
      } else if (completion.status === 'completed') {
        await completionService.createCompletion({
          habit_id: habit.id,
          date: dateUTC,
          status: 'skipped'
        });
      } else if (completion.status === 'skipped') {
        await completionService.deleteCompletionByDate(habit.id, dateUTC);
      }
      await onUpdate();
    } catch (error) {
      console.error('Failed to update completion:', error);
      await onUpdate();
    } finally {
      isUpdating.current = false;
    }
  };

  const isCompleted = completion?.status === 'completed';
  const isSkipped = completion?.status === 'skipped';

  let cellClass = "w-[35px] h-[28px] rounded-sm cursor-pointer transition-all duration-150 ease-in-out bg-white block";

  if (!isApplicable) {
    cellClass = "w-[35px] h-[28px] rounded-sm cursor-not-allowed transition-all duration-150 ease-in-out bg-transparent block border border-white opacity-30";
  } else if (isToday) {
    cellClass = "w-[35px] h-[28px] rounded-sm cursor-pointer transition-all duration-150 ease-in-out block border-2 border-brand";
    if (!isCompleted && !isSkipped) cellClass += " bg-white";
  } else if (isCompleted || isSkipped) {
    cellClass = "w-[35px] h-[28px] rounded-sm cursor-pointer transition-all duration-150 ease-in-out block border-0";
  } else {
    cellClass += " border border-line hover:border-line-dark";
  }

  const getCellStyle = () => {
    if (isCompleted) {
      return { backgroundColor: getDarkenedColor(habit.color, streak) };
    } else if (isSkipped) {
      return {
        background: `linear-gradient(to top right, ${habit.color} 49.5%, white 50.5%)`
      };
    }
    return {};
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
