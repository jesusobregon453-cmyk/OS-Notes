import React from 'react';
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
  const handleDragStart = (e: React.DragEvent, note: StickyNote) => {
    e.dataTransfer.setData('text/plain', note.id);
  };

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {notes.map((note) => (
        <div
          key={note.id}
          className="absolute shadow-lg rounded-lg border border-black/10 flex flex-col pointer-events-auto transition-transform"
          style={{
            left: `${note.x}px`,
            top: `${note.y}px`,
            width: `${note.width}px`,
            minHeight: `${note.height}px`,
            backgroundColor: note.color || '#fef08a',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
          draggable
          onDragStart={(e) => handleDragStart(e, note)}
        >
          {/* Note Header / Drag Handle */}
          <div className="flex items-center justify-between px-2 py-1 bg-black/5 cursor-move rounded-t-lg">
            <GripHorizontal className="w-3.5 h-3.5 text-black/40" />
            <button
              onClick={() => onDeleteNote(note.id)}
              className="p-0.5 rounded hover:bg-black/10 text-black/50 hover:text-rose-600 transition"
              title="Eliminar nota"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>

          {/* Note Body */}
          <textarea
            value={note.text}
            onChange={(e) => onUpdateNote({ ...note, text: e.target.value })}
            placeholder="Escribe una nota adhesiva..."
            className="flex-1 w-full p-2 bg-transparent text-xs text-slate-800 placeholder:text-black/40 resize-none outline-none font-sans"
            rows={4}
          />
        </div>
      ))}
    </div>
  );
};
