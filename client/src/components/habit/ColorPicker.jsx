import React from 'react';
import { COLOR_PALETTE } from '../../utils/colorPalette';

function ColorPicker({ selectedColor, onChange }) {
  return (
    <div className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(40px,1fr))]">
      {COLOR_PALETTE.map((color) => {
        const isSelected = selectedColor === color.hex;
        const base = "w-10 h-10 rounded-md cursor-pointer transition-all duration-200 hover:scale-110";
        const selectedStyles = isSelected
          ? " border-2 border-ink shadow-[0_0_0_2px_white,0_0_0_4px_#333] scale-105"
          : " border-2 border-transparent";
        return (
          <div
            key={color.hex}
            className={base + selectedStyles}
            style={{ backgroundColor: color.hex }}
            onClick={() => onChange(color.hex)}
            title={color.name}
          />
        );
      })}
    </div>
  );
}

export default ColorPicker;
