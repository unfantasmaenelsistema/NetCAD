import React, { useState } from 'react';
import { BookOpen, Keyboard, Network, X } from 'lucide-react';
import { CABLE_SPECS, CableCategory } from '../types/cabling';

interface GuideModalProps {
  open: boolean;
  onClose: () => void;
}

type GuideTab = 'tia568' | 'pinout' | 'media';

interface PinDef {
  pin: number;
  pair: string;
  colorName: string;
  stripeHex: string;
  solidHex: string;
}

const T568B_PINS: PinDef[] = [
  { pin: 1, pair: 'Par 2 (TX+)', colorName: 'Blanco / Naranja', stripeHex: '#FFFFFF', solidHex: '#F97316' },
  { pin: 2, pair: 'Par 2 (TX-)', colorName: 'Naranja', stripeHex: '#F97316', solidHex: '#F97316' },
  { pin: 3, pair: 'Par 3 (RX+)', colorName: 'Blanco / Verde', stripeHex: '#FFFFFF', solidHex: '#16A34A' },
  { pin: 4, pair: 'Par 1', colorName: 'Azul', stripeHex: '#2563EB', solidHex: '#2563EB' },
  { pin: 5, pair: 'Par 1', colorName: 'Blanco / Azul', stripeHex: '#FFFFFF', solidHex: '#2563EB' },
  { pin: 6, pair: 'Par 3 (RX-)', colorName: 'Verde', stripeHex: '#16A34A', solidHex: '#16A34A' },
  { pin: 7, pair: 'Par 4', colorName: 'Blanco / Marrón', stripeHex: '#FFFFFF', solidHex: '#92400E' },
  { pin: 8, pair: 'Par 4', colorName: 'Marrón', stripeHex: '#92400E', solidHex: '#92400E' },
];

const T568A_PINS: PinDef[] = [
  { pin: 1, pair: 'Par 3 (TX+)', colorName: 'Blanco / Verde', stripeHex: '#FFFFFF', solidHex: '#16A34A' },
  { pin: 2, pair: 'Par 3 (TX-)', colorName: 'Verde', stripeHex: '#16A34A', solidHex: '#16A34A' },
  { pin: 3, pair: 'Par 2 (RX+)', colorName: 'Blanco / Naranja', stripeHex: '#FFFFFF', solidHex: '#F97316' },
  { pin: 4, pair: 'Par 1', colorName: 'Azul', stripeHex: '#2563EB', solidHex: '#2563EB' },
  { pin: 5, pair: 'Par 1', colorName: 'Blanco / Azul', stripeHex: '#FFFFFF', solidHex: '#2563EB' },
  { pin: 6, pair: 'Par 2 (RX-)', colorName: 'Naranja', stripeHex: '#F97316', solidHex: '#F97316' },
  { pin: 7, pair: 'Par 4', colorName: 'Blanco / Marrón', stripeHex: '#FFFFFF', solidHex: '#92400E' },
  { pin: 8, pair: 'Par 4', colorName: 'Marrón', stripeHex: '#92400E', solidHex: '#92400E' },
];

export const GuideModal: React.FC<GuideModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState<GuideTab>('tia568');
  const [wiringStandard, setWiringStandard] = useState<'T568B' | 'T568A'>('T568B');

  if (!open) return null;

  const activePins = wiringStandard === 'T568B' ? T568B_PINS : T568A_PINS;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-dialog-title"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-3xl max-h-[88vh] flex flex-col shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <h2
                id="guide-dialog-title"
                className="font-display font-semibold text-base text-slate-100 truncate"
              >
                Guía Técnica TIA/EIA-568 y Referencia CAD
              </h2>
              <p className="text-xs text-slate-400">
                Estándares de cableado estructurado, conectorización RJ45 y atajos
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar guía"
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-5 pt-3 border-b border-slate-800 flex items-center gap-2 bg-slate-950/50">
          <button
            type="button"
            onClick={() => setActiveTab('tia568')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'tia568'
                ? 'border-sky-500 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Enlace Permanente vs Canal
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pinout')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'pinout'
                ? 'border-sky-500 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Código de Colores T568A / T568B
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'media'
                ? 'border-sky-500 text-sky-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Categorías y Atajos CAD
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto ide-scroll p-5 space-y-5">
          {activeTab === 'tia568' && (
            <div className="space-y-4">
              {/* Interactive Architectural Diagram */}
              <div className="bg-slate-950 border border-slate-800 rounded-md p-4">
                <div className="text-xs font-medium text-slate-200 mb-3 flex items-center gap-2">
                  <Network className="w-4 h-4 text-sky-400" />
                  <span>Topología Horizontal Estándar ANSI/TIA-568 (Cobre)</span>
                </div>
                <svg viewBox="0 0 680 170" className="w-full h-auto">
                  {/* TR Box */}
                  <rect x="16" y="34" width="110" height="72" rx="4" fill="#0F172A" stroke="#38BDF8" strokeWidth="1.5" />
                  <text x="71" y="64" textAnchor="middle" fill="#E0F2FE" fontSize="11" fontWeight="600">Rack (TR/ER)</text>
                  <text x="71" y="82" textAnchor="middle" fill="#94A3B8" fontSize="9.5">Switch + Patch Panel</text>

                  {/* Patch Cord TR */}
                  <line x1="126" y1="70" x2="186" y2="70" stroke="#10B981" strokeWidth="2.5" strokeDasharray="4 2" />
                  <text x="156" y="58" textAnchor="middle" fill="#34D399" fontSize="9" fontFamily="JetBrains Mono, monospace">≤ 5 m</text>

                  {/* Patch Panel node */}
                  <rect x="186" y="52" width="60" height="36" rx="3" fill="#1E293B" stroke="#64748B" strokeWidth="1.2" />
                  <text x="216" y="74" textAnchor="middle" fill="#E2E8F0" fontSize="9.5">Panel</text>

                  {/* Horizontal Permanent Link (90m) */}
                  <line x1="246" y1="70" x2="466" y2="70" stroke="#38BDF8" strokeWidth="3" />
                  <text x="356" y="56" textAnchor="middle" fill="#38BDF8" fontSize="10.5" fontWeight="600" fontFamily="JetBrains Mono, monospace">
                    Cableado Horizontal ≤ 90 m
                  </text>

                  {/* Outlet TO */}
                  <rect x="466" y="52" width="66" height="36" rx="3" fill="#1E293B" stroke="#10B981" strokeWidth="1.4" />
                  <text x="499" y="74" textAnchor="middle" fill="#ECFDF5" fontSize="9.5">Roseta TO</text>

                  {/* Patch Cord WA */}
                  <line x1="532" y1="70" x2="590" y2="70" stroke="#10B981" strokeWidth="2.5" strokeDasharray="4 2" />
                  <text x="561" y="58" textAnchor="middle" fill="#34D399" fontSize="9" fontFamily="JetBrains Mono, monospace">≤ 5 m</text>

                  {/* Workstation */}
                  <rect x="590" y="42" width="74" height="56" rx="4" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.4" />
                  <text x="627" y="74" textAnchor="middle" fill="#F8FAFC" fontSize="10" fontWeight="600">PC (WA)</text>

                  {/* Bracket: Permanent Link 90m */}
                  <path d="M 186 105 L 186 115 L 532 115 L 532 105" fill="none" stroke="#38BDF8" strokeWidth="1.3" />
                  <text x="359" y="130" textAnchor="middle" fill="#7DD3FC" fontSize="10" fontFamily="JetBrains Mono, monospace">
                    ENLACE PERMANENTE (Máximo 90.0 m)
                  </text>

                  {/* Bracket: Complete Channel 100m */}
                  <path d="M 126 142 L 126 150 L 590 150 L 590 142" fill="none" stroke="#F59E0B" strokeWidth="1.3" />
                  <text x="358" y="164" textAnchor="middle" fill="#FCD34D" fontSize="10" fontFamily="JetBrains Mono, monospace">
                    CANAL COMPLETO = Enlace + Latiguillos (Máximo 100.0 m)
                  </text>
                </svg>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-950/70 border border-slate-800 rounded-md p-3.5 space-y-1.5">
                  <div className="font-semibold text-slate-100">
                    Regla de los 90 metros (Enlace Permanente)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Incluye únicamente el cable fijo tendido por canaleta/falso techo desde el
                    Patch Panel del Rack hasta la roseta RJ45 (incluyendo un posible Punto de
                    Consolidación a ≥15 m del Rack).
                  </p>
                </div>
                <div className="bg-slate-950/70 border border-slate-800 rounded-md p-3.5 space-y-1.5">
                  <div className="font-semibold text-slate-100">
                    Canal Completo (Máximo 100 metros)
                  </div>
                  <p className="text-slate-300 leading-relaxed">
                    Suma el Enlace Permanente más los dos latiguillos flexibles (Área de
                    Trabajo + Cuarto de Telecomunicaciones). Los latiguillos combinados no
                    deben superar los 10 m en instalaciones estándar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pinout' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-xs text-slate-300">
                  Selecciona el estándar de terminación para inspeccionar la asignación de los 8
                  hilos en el conector RJ45 (8P8C):
                </p>
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded border border-slate-800 shrink-0">
                  {(['T568B', 'T568A'] as const).map((std) => (
                    <button
                      key={std}
                      type="button"
                      onClick={() => setWiringStandard(std)}
                      className={`px-3 py-1 text-xs font-mono font-medium rounded transition-colors cursor-pointer ${
                        wiringStandard === std
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      {std}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border border-slate-800 rounded-md overflow-hidden bg-slate-950/70">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2 px-3 font-medium">Pin</th>
                      <th className="py-2 px-3 font-medium">Cable</th>
                      <th className="py-2 px-3 font-medium">Color TIA-568</th>
                      <th className="py-2 px-3 font-medium">Función / Par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {activePins.map((p) => (
                      <tr key={p.pin} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 font-mono tabular-nums font-semibold text-slate-100">
                          Pin {p.pin}
                        </td>
                        <td className="py-2 px-3">
                          <div
                            className="w-10 h-3 rounded-xs border border-slate-700"
                            style={{
                              background:
                                p.stripeHex === p.solidHex
                                  ? p.solidHex
                                  : `repeating-linear-gradient(90deg, ${p.solidHex} 0px, ${p.solidHex} 5px, ${p.stripeHex} 5px, ${p.stripeHex} 10px)`,
                            }}
                          />
                        </td>
                        <td className="py-2 px-3 text-slate-200">{p.colorName}</td>
                        <td className="py-2 px-3 font-mono text-slate-400">{p.pair}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Nota: En España y Europa la norma más extendida en instalaciones comerciales es{' '}
                <strong className="text-slate-200">T568B</strong>. Lo fundamental es mantener
                exactamente la misma norma en la roseta y en el Patch Panel del Rack.
              </p>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="space-y-5">
              <div className="border border-slate-800 rounded-md overflow-hidden bg-slate-950/70">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                    <tr>
                      <th className="py-2 px-3 font-medium">Categoría</th>
                      <th className="py-2 px-3 font-medium">Capacidad y Ancho de Banda</th>
                      <th className="py-2 px-3 font-medium text-right">Alcance Máx.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {(Object.keys(CABLE_SPECS) as CableCategory[]).map((cat) => {
                      const spec = CABLE_SPECS[cat];
                      return (
                        <tr key={cat}>
                          <td className="py-2.5 px-3 font-medium text-slate-100 flex items-center gap-2">
                            <span
                              className="w-3 h-1.5 rounded-sm shrink-0"
                              style={{ backgroundColor: spec.stroke }}
                            />
                            <span>{spec.shortLabel}</span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">{spec.bandwidth}</td>
                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-sky-400">
                            {spec.maxLimitM} m
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-200 flex items-center gap-1.5">
                  <Keyboard className="w-3.5 h-3.5 text-sky-400" />
                  <span>Atajos de teclado del editor CAD</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {[
                    ['V', 'Seleccionar / Mover'],
                    ['T', 'Canaleta 90°'],
                    ['C', 'Trazar Cable'],
                    ['H / Espacio', 'Desplazar plano'],
                    ['Ctrl + Z', 'Deshacer'],
                    ['Ctrl + Y', 'Rehacer'],
                    ['Ctrl + D', 'Duplicar nodo'],
                    ['Supr / Backspace', 'Eliminar selección'],
                    ['Esc', 'Cancelar trazo / Cerrar'],
                  ].map(([key, desc]) => (
                    <div
                      key={key}
                      className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 flex items-center justify-between gap-2"
                    >
                      <span className="text-slate-300 truncate">{desc}</span>
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-800 text-slate-200 rounded border border-slate-700 shrink-0">
                        {key}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors cursor-pointer"
          >
            Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};
