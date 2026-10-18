import React from 'react';
import { Copy, Trash2, X, Plus, Minus } from 'lucide-react';
import type { BoundingBox } from '../types';

interface LassoActionBarProps {
  bounds: BoundingBox;
  viewportZoom: number;
  viewportOffset: { x: number; y: number };
  onRecolor: (color: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onChangeWidth: (delta: number) => void;
  onClose: () => void;
}

const QUICK_COLORS = ['#0f172a', '#2563eb', '#dc2626', '#16a34a', '#9333ea', '#ea580c'];

export const LassoActionBar: React.FC<LassoActionBarProps> = ({
  bounds,
  viewportZoom,
  viewportOffset,
  onRecolor,
  onDuplicate,
  onDelete,
  onChangeWidth,
  onClose,
}) => {
  // Position above the selection bounding box
  const posX = (bounds.minX + bounds.maxX) / 2 * viewportZoom + viewportOffset.x;
  const posY = bounds.minY * viewportZoom + viewportOffset.y - 48;

  return (
    <div
      className="absolute z-40 -translate-x-1/2 flex items-center space-x-1.5 px-3 py-1.5 bg-slate-900/95 backdrop-blur-md text-white rounded-full shadow-2xl border border-slate-700/60 select-none animate-in fade-in zoom-in-95 duration-150"
      style={{ left: `${posX}px`, top: `${posY}px` }}
    >
      {/* Quick Recolor Swatches */}
      <div className="flex items-center space-x-1 pr-1.5 border-r border-slate-700">
        {QUICK_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onRecolor(c)}
            className="w-4 h-4 rounded-full border border-white/40 hover:scale-125 transition"
            style={{ backgroundColor: c }}
            title={`Cambiar color a ${c}`}
          />
        ))}
      </div>

      {/* Adjust Stroke Width */}
      <div className="flex items-center space-x-0.5 pr-1.5 border-r border-slate-700">
        <button
          onClick={() => onChangeWidth(-0.5)}
          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
          title="Disminuir grosor"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onChangeWidth(0.5)}
          className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white"
          title="Aumentar grosor"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Duplicate */}
      <button
        onClick={onDuplicate}
        className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition"
        title="Duplicar selección"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-1 hover:bg-rose-900/60 rounded text-rose-400 hover:text-rose-200 transition"
        title="Eliminar trazos seleccionados"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      {/* Close */}
      <button
        onClick={onClose}
        className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition"
        title="Deseleccionar"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
