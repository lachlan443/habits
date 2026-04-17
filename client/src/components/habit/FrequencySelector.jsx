import React from 'react';

const DAYS = [
  { key: 'mon', label: 'Mon' },
  { key: 'tue', label: 'Tue' },
  { key: 'wed', label: 'Wed' },
  { key: 'thu', label: 'Thu' },
  { key: 'fri', label: 'Fri' },
  { key: 'sat', label: 'Sat' },
  { key: 'sun', label: 'Sun' }
];

function FrequencySelector({ frequencyType, frequencyDays, onFrequencyTypeChange, onFrequencyDaysChange }) {
  const toggleDay = (dayKey) => {
    if (frequencyDays.includes(dayKey)) {
      onFrequencyDaysChange(frequencyDays.filter(d => d !== dayKey));
    } else {
      onFrequencyDaysChange([...frequencyDays, dayKey]);
    }
  };

  const radioLabelClass = "flex items-center gap-2 cursor-pointer text-sm text-ink-muted";
  const dayBtnBase = "px-4 py-2 border rounded text-[13px] cursor-pointer transition-all duration-200";
  const dayBtnUnselected = "bg-white border-line hover:bg-surface-hover hover:border-line-dark";
  const dayBtnSelected = "bg-brand text-white border-brand hover:bg-brand-hover";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-4">
        <label className={radioLabelClass}>
          <input
            type="radio"
            name="frequencyType"
            value="daily"
            checked={frequencyType === 'daily'}
            onChange={(e) => onFrequencyTypeChange(e.target.value)}
            className="cursor-pointer"
          />
          Every day
        </label>
        <label className={radioLabelClass}>
          <input
            type="radio"
            name="frequencyType"
            value="custom"
            checked={frequencyType === 'custom'}
            onChange={(e) => onFrequencyTypeChange(e.target.value)}
            className="cursor-pointer"
          />
          Custom
        </label>
      </div>

      {frequencyType === 'custom' && (
        <div className="flex flex-wrap gap-2">
          {DAYS.map((day) => {
            const isSelected = frequencyDays.includes(day.key);
            return (
              <button
                key={day.key}
                type="button"
                className={`${dayBtnBase} ${isSelected ? dayBtnSelected : dayBtnUnselected}`}
                onClick={() => toggleDay(day.key)}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default FrequencySelector;
