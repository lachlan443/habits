import React, { useState } from 'react';
import ColorPicker from './ColorPicker';
import FrequencySelector from './FrequencySelector';
import { habitService } from '../../services/habitService';
import { DEFAULT_COLOR } from '../../utils/colorPalette';
import './HabitModal.css';

function HabitCreateModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [frequencyType, setFrequencyType] = useState('daily');
  const [frequencyDays, setFrequencyDays] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Habit name is required');
      return;
    }

    if (frequencyType === 'custom' && frequencyDays.length === 0) {
      setError('Please select at least one day');
      return;
    }

    setLoading(true);

    try {
      const habitData = {
        name: name.trim(),
        color,
        frequency_type: frequencyType,
        frequency_days: frequencyType === 'custom' ? frequencyDays : null
      };

      const newHabit = await habitService.createHabit(habitData);
      onCreated(newHabit);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create habit');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>New Habit</h2>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Exercise, Read, Meditate"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <ColorPicker selectedColor={color} onChange={setColor} />
          </div>

          <div className="form-group">
            <label>Frequency</label>
            <FrequencySelector
              frequencyType={frequencyType}
              frequencyDays={frequencyDays}
              onFrequencyTypeChange={setFrequencyType}
              onFrequencyDaysChange={setFrequencyDays}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? 'Creating...' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HabitCreateModal;
