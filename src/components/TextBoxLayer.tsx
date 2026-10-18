import React, { useRef } from 'react';
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
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  } | null>(null);

  if (!textBoxes || textBoxes.length === 0) return null;

  const handlePointerDown = (e: React.PointerEvent, box: TextBoxItem) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: box.id,
      startX: e.clientX,
      startY: e.clientY,
      initX: box.x,
      initY: box.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent, box: TextBoxItem) => {
    if (!dragRef.current || dragRef.current.id !== box.id) return;
    const dx = (e.clientX - dragRef.current.startX) / (scale || 1.0);
    const dy = (e.clientY - dragRef.current.startY) / (scale || 1.0);
    onUpdateTextBox({
      ...box,
      x: Math.max(0, Math.round(dragRef.current.initX + dx)),
      y: Math.max(0, Math.round(dragRef.current.initY + dy)),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current) {
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
      dragRef.current = null;
    }
  };

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
            <div
              onPointerDown={(e) => handlePointerDown(e, box)}
              onPointerMove={(e) => handlePointerMove(e, box)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="flex items-center justify-between px-2 py-1 bg-slate-800/10 rounded-t-md cursor-move select-none touch-none"
            >
              <GripHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteTextBox(box.id);
                }}
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
            className="flex-1 w-full p-2 bg-transparent resize-none outline-none leading-relaxed"
            style={{
              fontSize: `${box.fontSize}px`,
              fontFamily:
                box.fontFamily === 'Manuscrita'
                  ? 'Caveat, cursive, sans-serif'
                  : box.fontFamily === 'Serif'
                  ? 'Georgia, serif'
                  : box.fontFamily === 'Mono'
                  ? 'ui-monospace, monospace'
                  : 'inherit',
              fontWeight: box.isBold ? 'bold' : 'normal',
              fontStyle: box.isItalic ? 'italic' : 'normal',
              color: box.color,
            }}
            rows={Math.max(2, box.text.split('\n').length)}
          />
        </div>
      ))}
    </div>
  );
};
