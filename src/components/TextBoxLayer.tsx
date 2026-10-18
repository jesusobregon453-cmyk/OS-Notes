import React from 'react';
import { Trash2, GripHorizontal } from 'lucide-react';
import type { TextBoxItem } from '../types';

interface TextBoxLayerProps {
  textBoxes: TextBoxItem[];
  scale: number;
  isReadOnly: boolean;
  onUpdateTextBox: (item: TextBoxItem) => void;
  onDeleteTextBox: (id: string) => void;
}

export const TextBoxLayer: React.FC<TextBoxLayerProps> = ({
  textBoxes,
  scale,
  isReadOnly,
  onUpdateTextBox,
  onDeleteTextBox,
}) => {
  if (!textBoxes || textBoxes.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {textBoxes.map((box) => (
        <div
          key={box.id}
          className={`absolute rounded-md flex flex-col pointer-events-auto transition-shadow ${
            isReadOnly ? 'border-transparent' : 'border border-dashed border-indigo-400/60 bg-white/40 shadow-sm hover:border-indigo-600'
          }`}
          style={{
            left: `${box.x}px`,
            top: `${box.y}px`,
            width: `${box.width}px`,
            minHeight: `${box.height}px`,
            backgroundColor: box.backgroundColor || 'transparent',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {/* Header Bar when editing */}
          {!isReadOnly && (
            <div className="flex items-center justify-between px-2 py-0.5 bg-slate-800/10 rounded-t-md cursor-move">
              <GripHorizontal className="w-3 h-3 text-slate-500" />
              <button
                onClick={() => onDeleteTextBox(box.id)}
                className="p-0.5 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 transition"
                title="Eliminar caja de texto"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Text Area */}
          <textarea
            value={box.text}
            readOnly={isReadOnly}
            onChange={(e) => onUpdateTextBox({ ...box, text: e.target.value })}
            placeholder={isReadOnly ? '' : 'Escribe aquí...'}
            className="flex-1 w-full p-2 bg-transparent resize-none outline-none font-sans leading-relaxed"
            style={{
              fontSize: `${box.fontSize}px`,
              color: box.color,
            }}
            rows={Math.max(2, box.text.split('\n').length)}
          />
        </div>
      ))}
    </div>
  );
};
