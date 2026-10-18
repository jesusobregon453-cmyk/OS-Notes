import React, { useRef } from 'react';
import { Trash2, GripHorizontal } from 'lucide-react';
import type { StickyNote } from '../types';

interface StickyNotesLayerProps {
  notes: StickyNote[];
  scale: number;
  onUpdateNote: (note: StickyNote) => void;
  onDeleteNote: (id: string) => void;
}

export const StickyNotesLayer: React.FC<StickyNotesLayerProps> = ({
  notes,
  scale,
  onUpdateNote,
  onDeleteNote,
}) => {
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    initX: number;
    initY: number;
  } | null>(null);

  if (!notes || notes.length === 0) return null;

  const handlePointerDown = (e: React.PointerEvent, note: StickyNote) => {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: note.id,
      startX: e.clientX,
      startY: e.clientY,
      initX: note.x,
      initY: note.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent, note: StickyNote) => {
    if (!dragRef.current || dragRef.current.id !== note.id) return;
    const dx = (e.clientX - dragRef.current.startX) / (scale || 1.0);
    const dy = (e.clientY - dragRef.current.startY) / (scale || 1.0);
    onUpdateNote({
      ...note,
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
      {notes.map((note) => {
        const isImage =
          note.text.startsWith('data:image/') ||
          note.text.startsWith('blob:') ||
          note.text.startsWith('http://') ||
          note.text.startsWith('https://');

        return (
          <div
            key={note.id}
            className="absolute shadow-lg rounded-xl border border-black/10 flex flex-col pointer-events-auto overflow-hidden transition-shadow select-none"
            style={{
              left: `${note.x}px`,
              top: `${note.y}px`,
              width: `${note.width}px`,
              minHeight: `${note.height}px`,
              backgroundColor: isImage ? '#ffffff' : (note.color || '#fef08a'),
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
            }}
          >
            {/* Note Header / Drag Handle */}
            <div
              onPointerDown={(e) => handlePointerDown(e, note)}
              onPointerMove={(e) => handlePointerMove(e, note)}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="flex items-center justify-between px-2.5 py-1 bg-black/5 cursor-move touch-none"
            >
              <GripHorizontal className="w-3.5 h-3.5 text-black/40" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNote(note.id);
                }}
                className="p-0.5 rounded hover:bg-black/10 text-black/50 hover:text-rose-600 transition"
                title="Eliminar elemento"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Note Body: Image vs Editable Note */}
            {isImage ? (
              <div className="flex-1 w-full p-1 flex items-center justify-center bg-white pointer-events-none">
                <img
                  src={note.text}
                  alt="Inserción de imagen"
                  className="max-w-full max-h-full object-contain rounded"
                  draggable={false}
                />
              </div>
            ) : (
              <textarea
                value={note.text}
                onChange={(e) => onUpdateNote({ ...note, text: e.target.value })}
                placeholder="Escribe una nota adhesiva..."
                className="flex-1 w-full p-2.5 bg-transparent text-xs text-slate-800 placeholder:text-black/40 resize-none outline-none font-sans leading-relaxed"
                rows={4}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};
