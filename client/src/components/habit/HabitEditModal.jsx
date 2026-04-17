import React, { useState } from 'react';
import ColorPicker from './ColorPicker';
import FrequencySelector from './FrequencySelector';
import { habitService } from '../../services/habitService';

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

  const fieldLabelClass = "block mb-1.5 text-ink-muted text-sm font-medium";
  const inputClass = "w-full px-3 py-2.5 border border-line rounded text-sm box-border transition-colors focus:outline-none focus:border-brand";
  const btnSecondary = "px-5 py-2.5 bg-white text-ink-soft border border-line rounded text-sm cursor-pointer transition-all hover:bg-surface-hover hover:border-line-dark";
  const btnPrimary = "px-5 py-2.5 bg-brand text-white border-none rounded text-sm font-medium cursor-pointer transition-colors hover:bg-brand-hover disabled:opacity-60 disabled:cursor-not-allowed";
  const btnWarning = "px-5 py-2.5 bg-warning text-white border-none rounded text-sm cursor-pointer transition-colors hover:bg-[#F57C00]";
  const btnDanger = "px-5 py-2.5 bg-danger text-white border-none rounded text-sm cursor-pointer transition-colors hover:bg-[#D32F2F]";
  const btnDangerConfirm = "px-5 py-2.5 bg-[#D32F2F] text-white border-none rounded text-sm font-semibold cursor-pointer animate-pop";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex justify-center items-center z-[2000]"
      onClick={onClose}
    >
      <div
        className="bg-white p-8 rounded-lg shadow-[0_8px_32px_rgba(0,0,0,0.2)] w-full max-w-[500px] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="m-0 mb-6 text-2xl text-ink">Edit Habit</h2>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-danger-bg text-danger-text px-3 py-3 rounded mb-5 text-sm">
              {error}
            </div>
          )}

          <div className="mb-5">
            <label className={fieldLabelClass}>Habit Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Exercise, Read, Meditate"
              className={inputClass}
            />
          </div>

          <div className="mb-5">
            <label className={fieldLabelClass}>Color</label>
            <ColorPicker selectedColor={color} onChange={setColor} />
          </div>

          <div className="mb-5">
            <label className={fieldLabelClass}>Frequency</label>
            <FrequencySelector
              frequencyType={frequencyType}
              frequencyDays={frequencyDays}
              onFrequencyTypeChange={setFrequencyType}
              onFrequencyDaysChange={setFrequencyDays}
            />
          </div>

          <div className="flex justify-between gap-3 mt-6">
            <div className="flex gap-2">
              <button type="button" onClick={handleArchive} className={btnWarning}>
                Archive
              </button>
              {!showDeleteConfirm ? (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className={btnDanger}
                >
                  Delete
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleDelete}
                  className={btnDangerConfirm}
                >
                  Confirm Delete
                </button>
              )}
            </div>

            <div className="flex gap-2 ml-auto">
              <button type="button" onClick={onClose} className={btnSecondary}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className={btnPrimary}>
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
