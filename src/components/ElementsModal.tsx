import React, { useState } from 'react';
import { X, Sparkles, Folder } from 'lucide-react';
import type { SavedElement } from '../types';

interface ElementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedElements: SavedElement[];
  onInsertElement: (element: SavedElement) => void;
}

// Built-in starter elements with pre-drawn vector strokes
const PRESET_COLLECTIONS: { name: string; elements: SavedElement[] }[] = [
  {
    name: 'Banderas y Sellos',
    elements: [
      {
        id: 'stamp-star',
        title: 'Estrella Dorada',
        category: 'Sellos',
        strokes: [
          {
            id: 'star-1',
            tool: 'pen',
            color: '#eab308',
            baseWidth: 3,
            opacity: 1,
            bounds: { minX: 0, minY: 0, maxX: 60, maxY: 60 },
            points: [
              { x: 30, y: 5, pressure: 0.8, time: 0 },
              { x: 38, y: 22, pressure: 0.8, time: 10 },
              { x: 57, y: 22, pressure: 0.8, time: 20 },
              { x: 42, y: 34, pressure: 0.8, time: 30 },
              { x: 48, y: 53, pressure: 0.8, time: 40 },
              { x: 30, y: 41, pressure: 0.8, time: 50 },
              { x: 12, y: 53, pressure: 0.8, time: 60 },
              { x: 18, y: 34, pressure: 0.8, time: 70 },
              { x: 3, y: 22, pressure: 0.8, time: 80 },
              { x: 22, y: 22, pressure: 0.8, time: 90 },
              { x: 30, y: 5, pressure: 0.8, time: 100 },
            ],
          },
        ],
      },
      {
        id: 'stamp-check',
        title: 'Checkmark Verde',
        category: 'Sellos',
        strokes: [
          {
            id: 'check-1',
            tool: 'fountain',
            color: '#16a34a',
            baseWidth: 4,
            opacity: 1,
            bounds: { minX: 0, minY: 0, maxX: 50, maxY: 40 },
            points: [
              { x: 8, y: 22, pressure: 0.5, time: 0 },
              { x: 20, y: 35, pressure: 0.9, time: 20 },
              { x: 46, y: 8, pressure: 0.8, time: 40 },
            ],
          },
        ],
      },
      {
        id: 'stamp-flag',
        title: 'Bandera Roja',
        category: 'Sellos',
        strokes: [
          {
            id: 'flag-pole',
            tool: 'pen',
            color: '#475569',
            baseWidth: 2.5,
            opacity: 1,
            bounds: { minX: 5, minY: 5, maxX: 10, maxY: 55 },
            points: [
              { x: 10, y: 5, pressure: 0.8, time: 0 },
              { x: 10, y: 55, pressure: 0.8, time: 20 },
            ],
          },
          {
            id: 'flag-cloth',
            tool: 'fountain',
            color: '#dc2626',
            baseWidth: 3,
            opacity: 1,
            bounds: { minX: 10, minY: 5, maxX: 45, maxY: 30 },
            points: [
              { x: 10, y: 5, pressure: 0.8, time: 0 },
              { x: 45, y: 17, pressure: 0.8, time: 20 },
              { x: 10, y: 30, pressure: 0.8, time: 40 },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'Matemáticas y Ciencia',
    elements: [
      {
        id: 'math-sum',
        title: 'Sigma Sumatoria',
        category: 'Matemáticas',
        strokes: [
          {
            id: 'sigma-1',
            tool: 'calligraphy',
            color: '#2563eb',
            baseWidth: 3.5,
            opacity: 1,
            bounds: { minX: 0, minY: 0, maxX: 40, maxY: 50 },
            points: [
              { x: 38, y: 8, pressure: 0.8, time: 0 },
              { x: 10, y: 8, pressure: 0.8, time: 20 },
              { x: 25, y: 25, pressure: 0.9, time: 40 },
              { x: 10, y: 42, pressure: 0.9, time: 60 },
              { x: 38, y: 42, pressure: 0.8, time: 80 },
            ],
          },
        ],
      },
      {
        id: 'math-integral',
        title: 'Integral',
        category: 'Matemáticas',
        strokes: [
          {
            id: 'integral-1',
            tool: 'fountain',
            color: '#7c3aed',
            baseWidth: 4,
            opacity: 1,
            bounds: { minX: 0, minY: 0, maxX: 30, maxY: 60 },
            points: [
              { x: 26, y: 8, pressure: 0.5, time: 0 },
              { x: 16, y: 15, pressure: 0.9, time: 20 },
              { x: 16, y: 45, pressure: 0.9, time: 40 },
              { x: 6, y: 52, pressure: 0.5, time: 60 },
            ],
          },
        ],
      },
    ],
  },
];

export const ElementsModal: React.FC<ElementsModalProps> = ({
  isOpen,
  onClose,
  savedElements,
  onInsertElement,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('Banderas y Sellos');

  if (!isOpen) return null;

  const userCategory = 'Mis Elementos Guardados';
  const categories = [...PRESET_COLLECTIONS.map((c) => c.name), userCategory];

  const currentElements =
    activeCategory === userCategory
      ? savedElements
      : PRESET_COLLECTIONS.find((c) => c.name === activeCategory)?.elements || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none animate-in fade-in">
      <div className="flex flex-col w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Colección de Elementos y Sellos</h2>
              <p className="text-xs text-slate-400">Inserta formas, sellos o diagramas reutilizables en 1 clic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center space-x-2 px-6 py-2.5 bg-slate-950 border-b border-slate-800 overflow-x-auto text-xs">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition ${
                activeCategory === cat
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Elements Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {currentElements.length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <Folder className="w-10 h-10 mb-2 stroke-[1.5]" />
              <p className="text-xs">No hay elementos guardados en esta categoría.</p>
              <p className="text-[11px] text-slate-600 mt-1">
                Selecciona cualquier trazo con el <strong>Lazo</strong> y pulsa &quot;Guardar como Elemento&quot;.
              </p>
            </div>
          ) : (
            currentElements.map((el) => (
              <button
                key={el.id}
                onClick={() => {
                  onInsertElement(el);
                  onClose();
                }}
                className="group flex flex-col items-center justify-center p-4 rounded-xl border border-slate-800 bg-slate-800/40 hover:border-indigo-500 hover:bg-indigo-500/10 transition cursor-pointer"
              >
                {/* Visual Mini Stroke Preview */}
                <div className="w-16 h-16 flex items-center justify-center mb-2 bg-slate-900 rounded-lg border border-slate-700/50 p-2 shadow-inner group-hover:scale-110 transition">
                  <svg viewBox="0 0 60 60" className="w-full h-full overflow-visible">
                    {el.strokes.map((s, i) => (
                      <polyline
                        key={i}
                        fill="none"
                        stroke={s.color}
                        strokeWidth={s.baseWidth}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        points={s.points.map((p) => `${p.x},${p.y}`).join(' ')}
                      />
                    ))}
                  </svg>
                </div>
                <span className="text-xs font-semibold text-slate-300 group-hover:text-white truncate max-w-[120px]">
                  {el.title}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
