import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CompletionCell from './CompletionCell';
import HabitEditModal from '../habit/HabitEditModal';
import { formatDate, getDateRange, isSameDay, getDayName } from '../../utils/dateUtils';
import { calculateHabitStats } from '../../utils/statisticsUtils';
import { isHabitApplicable } from '../../utils/frequencyUtils';

function HabitGrid({ habits, completions, dateRange, onUpdate, onNewHabit, showStats }) {
  const dates = getDateRange(dateRange.start, dateRange.end);
  const navigate = useNavigate();

  const completionMap = new Map();
  completions.forEach(c => {
    const key = `${c.habit_id}-${c.date}`;
    completionMap.set(key, c);
  });

  return (
    <div className="bg-white rounded-sm p-2 shadow-[0_1px_2px_rgba(0,0,0,0.05)] w-fit max-w-full overflow-x-auto">
      <table className="border-separate [border-spacing:1px]">
        <DateHeaderRow dates={dates} showStats={showStats} />
        <tbody>
          {habits.map(habit => (
            <HabitTableRow
              key={habit.id}
              habit={habit}
              dates={dates}
              completionMap={completionMap}
              completions={completions}
              onUpdate={onUpdate}
              navigate={navigate}
              showStats={showStats}
            />
          ))}
          <TallyTableRow
            habits={habits}
            dates={dates}
            completionMap={completionMap}
            onNewHabit={onNewHabit}
            showStats={showStats}
          />
        </tbody>
      </table>
    </div>
  );
}

function DateHeaderRow({ dates, showStats }) {
  const today = new Date();

  return (
    <thead>
      <tr>
        <th className="w-[130px] min-w-[130px] pr-1 pb-1 text-center p-0 align-middle"></th>

        {dates.map((date, index) => {
          const monthAbbr = date.toLocaleDateString('en-US', { month: 'short' });
          const isToday = isSameDay(date, today);
          const cellClass = isToday
            ? 'p-0.5 bg-brand-tint rounded-sm text-center pb-1 align-middle'
            : 'p-0.5 text-center pb-1 align-middle';
          return (
            <th key={index} className={cellClass}>
              <div className="flex flex-col gap-px items-center">
                <div className="text-[10px] text-ink-faint uppercase font-medium">{monthAbbr}</div>
                <div className={`text-base font-semibold ${isToday ? 'text-brand' : 'text-ink'}`}>
                  {date.getDate()}
                </div>
                <div className="text-[10px] text-ink-soft uppercase">{getDayName(date)}</div>
              </div>
            </th>
          );
        })}

        {showStats && (
          <th className="w-[60px] min-w-[60px] text-center pl-3 pb-1 p-0 align-middle">
            <span className="text-[9px] text-ink-faint uppercase font-semibold leading-[1.3]">
              Current<br />Streak
            </span>
          </th>
        )}
      </tr>
    </thead>
  );
}

function HabitTableRow({ habit, dates, completionMap, completions, onUpdate, navigate, showStats }) {
  const [showEditModal, setShowEditModal] = useState(false);

  const handleHabitClick = () => {
    navigate(`/habit/${habit.id}`);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    setShowEditModal(true);
  };

  const handleHabitUpdated = () => {
    setShowEditModal(false);
    onUpdate();
  };

  const stats = showStats ? calculateHabitStats(habit, completions) : null;

  return (
    <>
      <tr>
        <td className="w-[130px] min-w-[130px] pr-1 p-0 align-middle">
          <div
            className="flex items-center gap-2 cursor-pointer px-2 py-[3px] rounded-sm transition-colors h-6 group hover:bg-surface-subtle"
            onClick={handleHabitClick}
          >
            <div
              className="w-4 h-4 rounded-[3px] flex-shrink-0"
              style={{ backgroundColor: habit.color }}
            />
            <span className="flex-1 text-sm text-ink font-medium overflow-hidden text-ellipsis whitespace-nowrap">
              {habit.name}
            </span>
            <button
              className="px-2 py-1 bg-transparent border-none cursor-pointer text-lg text-ink-faint opacity-0 transition-opacity flex-shrink-0 group-hover:opacity-100 hover:!text-ink-soft"
              onClick={handleEditClick}
              title="Edit habit"
            >
              ⋯
            </button>
          </div>
        </td>

        {dates.map((date, index) => {
          const dateStr = formatDate(date);
          const key = `${habit.id}-${dateStr}`;
          const completion = completionMap.get(key);

          return (
            <td key={index} className="p-0 align-middle">
              <CompletionCell
                habit={habit}
                date={date}
                completion={completion}
                completions={completions}
                onUpdate={onUpdate}
              />
            </td>
          );
        })}

        {showStats && (
          <td className="w-[60px] min-w-[60px] text-center pl-3 p-0 align-middle">
            <div className="text-[11px] font-semibold text-ink">{stats.currentStreak}</div>
          </td>
        )}
      </tr>

      {showEditModal && (
        <HabitEditModal
          habit={habit}
          onClose={() => setShowEditModal(false)}
          onUpdated={handleHabitUpdated}
          onDeleted={onUpdate}
        />
      )}
    </>
  );
}

function TallyTableRow({ habits, dates, completionMap, onNewHabit, showStats }) {
  const calculateDailyTally = (date) => {
    const dateStr = formatDate(date);
    let completed = 0;

    habits.forEach(habit => {
      if (isHabitApplicable(habit, date)) {
        const key = `${habit.id}-${dateStr}`;
        const completion = completionMap.get(key);
        if (completion?.status === 'completed') {
          completed++;
        }
      }
    });

    return completed;
  };

  return (
    <tr className="border-t-2 border-line">
      <td className="w-[130px] min-w-[130px] pr-1 pt-2 p-0 align-middle">
        <button
          className="w-full px-4 py-2 bg-brand text-white border-none rounded-sm text-sm font-medium cursor-pointer transition-colors hover:bg-brand-hover"
          onClick={onNewHabit}
        >
          + New Habit
        </button>
      </td>

      {dates.map((date, index) => {
        const completed = calculateDailyTally(date);
        return (
          <td key={index} className="text-center pt-2 p-0 align-middle">
            <span className="text-xs font-semibold text-ink-soft">{completed}</span>
          </td>
        );
      })}

      {showStats && <td className="w-[60px] min-w-[60px] text-center pl-3 pt-2 p-0 align-middle"></td>}
    </tr>
  );
}

export default HabitGrid;
