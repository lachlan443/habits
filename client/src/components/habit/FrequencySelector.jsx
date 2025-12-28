import React from 'react';
import './FrequencySelector.css';

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

  return (
    <div className="frequency-selector">
      <div className="frequency-type">
        <label>
          <input
            type="radio"
            name="frequencyType"
            value="daily"
            checked={frequencyType === 'daily'}
            onChange={(e) => onFrequencyTypeChange(e.target.value)}
          />
          Every day
        </label>
        <label>
          <input
            type="radio"
            name="frequencyType"
            value="custom"
            checked={frequencyType === 'custom'}
            onChange={(e) => onFrequencyTypeChange(e.target.value)}
          />
          Custom
        </label>
      </div>

      {frequencyType === 'custom' && (
        <div className="day-selector">
          {DAYS.map((day) => (
            <button
              key={day.key}
              type="button"
              className={`day-btn ${frequencyDays.includes(day.key) ? 'selected' : ''}`}
              onClick={() => toggleDay(day.key)}
            >
              {day.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default FrequencySelector;
