import React, { useState } from 'react';
import ColorPicker from './ColorPicker';
import FrequencySelector from './FrequencySelector';
import { habitService } from '../../services/habitService';
import './HabitModal.css';

function HabitEditModal({ habit, onClose, onUpdated, onDeleted }) {
  const [name, setName] = useState(habit.name);
  const [color, setColor] = useState(habit.color);
  const [frequencyType, setFrequencyType] = useState(habit.frequency_type);
  const [frequencyDays, setFrequencyDays] = useState(habit.frequency_days || []);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
      const updates = {
        name: name.trim(),
        color,
        frequency_type: frequencyType,
        frequency_days: frequencyType === 'custom' ? frequencyDays : null
      };

      await habitService.updateHabit(habit.id, updates);
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update habit');
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      await habitService.updateHabit(habit.id, { archived: true });
      onUpdated();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to archive habit');
    }
  };

  const handleDelete = async () => {
    try {
      await habitService.deleteHabit(habit.id);
      onDeleted();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete habit');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Edit Habit</h2>

        <form onSubmit={handleSubmit}>
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Exercise, Read, Meditate"
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
            <div className="modal-actions-left">
              <button
                type="button"
                onClick={handleArchive}
                className="btn-warning"
              >
                Archive
              </button>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="btn-danger"
                >
                  Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="btn-danger-confirm"
                >
                  Confirm Delete
                </button>
              )}
            </div>

            <div className="modal-actions-right">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HabitEditModal;
