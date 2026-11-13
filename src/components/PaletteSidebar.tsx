import React, { useMemo, useState } from 'react';
import { GripVertical, Plus, Search } from 'lucide-react';
import {
  CATEGORY_LABELS,
  ElementCategory,
  ElementType,
  PALETTE_ITEMS,
  PaletteItemDef,
} from '../types/cabling';
import { PaletteSymbolThumb } from './CadSymbols';

interface PaletteSidebarProps {
  onQuickAdd: (type: ElementType) => void;
}

const CATEGORY_ORDER: ElementCategory[] = [
  'racks',
  'workstations',
  'distribution',
  'architecture',
];

export const PaletteSidebar: React.FC<PaletteSidebarProps> = ({ onQuickAdd }) => {
  const [query, setQuery] = useState('');

  const filteredByCategory = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORY_ORDER.map((category) => {
      const items = PALETTE_ITEMS.filter(
        (item) =>
          item.category === category &&
          (!q ||
            item.label.toLowerCase().includes(q) ||
            item.subtitle.toLowerCase().includes(q) ||
            item.prefix.toLowerCase().includes(q))
      );
      return { category, items };
    }).filter((group) => group.items.length > 0);
  }, [query]);

  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    item: PaletteItemDef
  ) => {
    e.dataTransfer.setData('application/x-netcad-element', item.type);
    e.dataTransfer.setData('text/plain', item.type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <aside
      aria-label="Paleta de Elementos"
      className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0 select-none z-10"
    >
      {/* Panel Header */}
      <div className="px-4 pt-4 pb-3 border-b border-slate-800">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="font-display font-semibold text-sm text-slate-100 tracking-tight">
            Paleta de Elementos
          </h2>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            {PALETTE_ITEMS.length} tipos
          </span>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filtrar componentes..."
            aria-label="Filtrar componentes de la paleta"
            className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500 transition-colors"
          />
        </div>
      </div>

      {/* Scrollable Palette Catalog */}
      <div className="flex-1 overflow-y-auto ide-scroll px-3 py-3 space-y-5">
        {filteredByCategory.length === 0 ? (
          <div className="py-8 px-3 text-center">
            <p className="text-xs text-slate-400">
              No hay elementos que coincidan con "{query}".
            </p>
          </div>
        ) : (
          filteredByCategory.map(({ category, items }) => (
            <section key={category} aria-label={CATEGORY_LABELS[category]}>
              <h3 className="px-1.5 mb-2 text-xs font-medium text-slate-400">
                {CATEGORY_LABELS[category]}
              </h3>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <div
                    key={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    className="group bg-slate-950/70 hover:bg-slate-800/80 border border-slate-800/90 hover:border-sky-500/60 rounded-md p-2 flex items-center gap-2.5 cursor-grab active:cursor-grabbing transition-colors"
                    title={`Arrastra "${item.label}" al plano o pulsa + para insertar`}
                  >
                    <GripVertical className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 shrink-0" />
                    <PaletteSymbolThumb type={item.type} />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-slate-100 truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.subtitle}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAdd(item.type);
                      }}
                      aria-label={`Insertar ${item.label} en el centro del plano`}
                      title="Insertar en el centro del plano"
                      className="w-7 h-7 rounded bg-slate-800/80 hover:bg-sky-600 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>

      {/* Instructional Footer */}
      <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/60 text-[11px] text-slate-400 leading-relaxed">
        Arrastra un elemento hacia el plano milimetrado o usa{' '}
        <span className="text-slate-200 font-medium">+</span> para insertarlo en el
        centro de la vista.
      </div>
    </aside>
  );
};
