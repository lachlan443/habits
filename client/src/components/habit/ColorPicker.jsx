import React from 'react';
import { COLOR_PALETTE } from '../../utils/colorPalette';
import './ColorPicker.css';

function ColorPicker({ selectedColor, onChange }) {
  return (
    <div className="color-picker">
      {COLOR_PALETTE.map((color) => (
        <div
          key={color.hex}
          className={`color-option ${selectedColor === color.hex ? 'selected' : ''}`}
          style={{ backgroundColor: color.hex }}
          onClick={() => onChange(color.hex)}
          title={color.name}
        />
      ))}
    </div>
  );
}

export default ColorPicker;
