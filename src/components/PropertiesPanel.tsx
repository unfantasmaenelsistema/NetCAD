import React from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Info,
  PackageCheck,
  Route,
  Trash2,
} from 'lucide-react';
import {
  CABLE_SPECS,
  CableCategory,
  CableLink,
  CanvasElement,
  getPaletteDef,
  metersToPx,
  pxToMeters,
  TargetSpeed,
  TrayPath,
} from '../types/cabling';
import {
  computePolylineMetrics,
  evaluateCableTia568,
  getCablePolylinePoints,
} from '../utils/pathing';
import { PaletteSymbolThumb } from './CadSymbols';

interface PropertiesPanelProps {
  elements: CanvasElement[];
  trayPaths: TrayPath[];
  cables: CableLink[];
  selectedElement: CanvasElement | null;
  selectedTray: TrayPath | null;
  selectedCable: CableLink | null;
  onUpdateElement: (id: string, patch: Partial<CanvasElement>) => void;
  onDuplicateElement: (id: string) => void;
  onDeleteElement: (id: string) => void;
  onUpdateTray: (id: string, patch: Partial<TrayPath>) => void;
  onDeleteTray: (id: string) => void;
  onUpdateCable: (id: string, patch: Partial<CableLink>) => void;
  onDeleteCable: (id: string) => void;
  onRunAudit: () => void;
  onOpenBom: () => void;
  bomTotalEur: number;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  elements,
  trayPaths,
  cables,
  selectedElement,
  selectedTray,
  selectedCable,
  onUpdateElement,
  onDuplicateElement,
  onDeleteElement,
  onUpdateTray,
  onDeleteTray,
  onUpdateCable,
  onDeleteCable,
  onRunAudit,
  onOpenBom,
  bomTotalEur,
}) => {
  const rackCount = elements.filter(
    (e) => e.type === 'rack_mdf' || e.type === 'rack_idf'
  ).length;
  const pcCount = elements.filter((e) => e.type === 'workstation').length;
  const outletCount = elements.filter((e) => e.type === 'outlet').length;
  const trayCount =
    trayPaths.length + elements.filter((e) => e.type === 'tray').length;

  const elementMap = new Map<string, CanvasElement>();
  elements.forEach((e) => elementMap.set(e.id, e));

  let totalCableMeters = 0;
  let errorLinks = 0;
  let warningLinks = 0;
  cables.forEach((cab) => {
    const from = elementMap.get(cab.fromId);
    const to = elementMap.get(cab.toId);
    if (!from || !to) return;
    const evalRes = evaluateCableTia568(cab, from, to);
    totalCableMeters += evalRes.permanentLinkM;
    if (evalRes.status === 'error') errorLinks += 1;
    else if (evalRes.status === 'warning') warningLinks += 1;
  });

  const totalTrayMeters = trayPaths.reduce((acc, tp) => {
    return acc + computePolylineMetrics(tp.points).totalM;
  }, 0);

  const selectedDef = selectedElement ? getPaletteDef(selectedElement.type) : null;

  const connectedCables = selectedElement
    ? cables.filter(
        (c) => c.fromId === selectedElement.id || c.toId === selectedElement.id
      )
    : [];

  return (
    <aside
      aria-label="Propiedades y Métricas"
      className="w-80 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0 z-10"
    >
      {/* Panel Title */}
      <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
        <h2 className="font-display font-semibold text-sm text-slate-100 tracking-tight">
          Propiedades y Métricas
        </h2>
        <span className="text-xs text-slate-400 font-mono tabular-nums">
          {elements.length + trayPaths.length} obj
        </span>
      </div>

      {/* Scrollable Inspector */}
      <div className="flex-1 overflow-y-auto ide-scroll divide-y divide-slate-800">
        {/* Section 1: Inspector */}
        <section className="p-4">
          {selectedElement && selectedDef ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <PaletteSymbolThumb type={selectedElement.type} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-mono text-sky-400 font-medium">
                    {selectedElement.code}
                  </div>
                  <div className="text-sm font-semibold text-slate-100 truncate">
                    {selectedElement.name}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {selectedDef.label}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label
                    htmlFor="prop-name"
                    className="block text-xs text-slate-400 mb-1"
                  >
                    Nombre del elemento
                  </label>
                  <input
                    id="prop-name"
                    type="text"
                    value={selectedElement.name}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { name: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="prop-code"
                    className="block text-xs text-slate-400 mb-1"
                  >
                    ID / Etiqueta
                  </label>
                  <input
                    id="prop-code"
                    type="text"
                    value={selectedElement.code}
                    onChange={(e) =>
                      onUpdateElement(selectedElement.id, { code: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium text-slate-300">
                    Coordenadas en el plano
                  </span>
                  <span className="text-[11px] font-mono tabular-nums text-slate-400">
                    {selectedElement.x}px, {selectedElement.y}px
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="prop-x"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Posición X (m)
                    </label>
                    <input
                      id="prop-x"
                      type="number"
                      step="0.25"
                      value={pxToMeters(selectedElement.x)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          onUpdateElement(selectedElement.id, {
                            x: metersToPx(val),
                          });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="prop-y"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Posición Y (m)
                    </label>
                    <input
                      id="prop-y"
                      type="number"
                      step="0.25"
                      value={pxToMeters(selectedElement.y)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val)) {
                          onUpdateElement(selectedElement.id, {
                            y: metersToPx(val),
                          });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">Orientación</span>
                  <div className="flex items-center gap-1">
                    {[0, 90, 180, 270].map((deg) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() =>
                          onUpdateElement(selectedElement.id, { rotation: deg })
                        }
                        className={`px-2 py-1 text-[11px] font-mono tabular-nums rounded border transition-colors cursor-pointer ${
                          selectedElement.rotation === deg
                            ? 'bg-sky-600 border-sky-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        {deg}°
                      </button>
                    ))}
                  </div>
                </div>

                {selectedDef.isResizable && (
                  <div>
                    <label
                      htmlFor="prop-length"
                      className="block text-[11px] text-slate-400 mb-1"
                    >
                      Longitud del tramo (m)
                    </label>
                    <input
                      id="prop-length"
                      type="number"
                      min="1"
                      step="0.5"
                      value={pxToMeters(selectedElement.width)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val) && val >= 0.5) {
                          onUpdateElement(selectedElement.id, {
                            width: metersToPx(val),
                          });
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Dimensiones físicas</span>
                  <span className="font-mono tabular-nums text-slate-200">
                    {pxToMeters(selectedElement.width).toFixed(2)} m ×{' '}
                    {pxToMeters(selectedElement.height).toFixed(2)} m
                  </span>
                </div>

                {selectedElement.ports !== undefined && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Capacidad de puertos</span>
                      <span className="font-mono tabular-nums text-slate-200">
                        {selectedElement.ports} RJ45
                        {selectedElement.rackUnits
                          ? ` · ${selectedElement.rackUnits}U`
                          : ''}
                      </span>
                    </div>
                    {(selectedElement.type === 'rack_mdf' ||
                      selectedElement.type === 'rack_idf') && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Ocupación actual</span>
                          <span className="font-mono tabular-nums text-sky-400">
                            {connectedCables.length} / {selectedElement.ports} puertos (
                            {Math.min(
                              100,
                              Math.round(
                                (connectedCables.length / selectedElement.ports) * 100
                              )
                            )}
                            %)
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-sky-500 transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.round(
                                  (connectedCables.length / selectedElement.ports) * 100
                                )
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {connectedCables.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80 space-y-1.5">
                  <div className="text-xs font-medium text-slate-300">
                    Enlaces conectados ({connectedCables.length})
                  </div>
                  <ul className="space-y-1">
                    {connectedCables.map((cab) => {
                      const otherId =
                        cab.fromId === selectedElement.id ? cab.toId : cab.fromId;
                      const other = elementMap.get(otherId);
                      const from = elementMap.get(cab.fromId);
                      const to = elementMap.get(cab.toId);
                      if (!other || !from || !to) return null;
                      const evalRes = evaluateCableTia568(cab, from, to);
                      const spec = CABLE_SPECS[cab.category] ?? CABLE_SPECS.Cat6;
                      return (
                        <li
                          key={cab.id}
                          className="flex items-center justify-between text-xs bg-slate-950/80 border border-slate-800 rounded px-2.5 py-1.5"
                        >
                          <span className="text-slate-200 truncate flex items-center gap-1.5">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{
                                backgroundColor:
                                  evalRes.status === 'error' ? '#EF4444' : spec.stroke,
                              }}
                            />
                            {other.code} · {spec.shortLabel}
                          </span>
                          <span
                            className={`font-mono tabular-nums shrink-0 ${
                              evalRes.status === 'error'
                                ? 'text-red-400'
                                : evalRes.status === 'warning'
                                ? 'text-amber-400'
                                : 'text-sky-400'
                            }`}
                          >
                            {evalRes.permanentLinkM.toFixed(1)} m
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <div className="bg-slate-950/90 border border-slate-800 rounded-md p-3 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {selectedDef.standardNote}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => onDuplicateElement(selectedElement.id)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicar</span>
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteElement(selectedElement.id)}
                  className="px-3 py-1.5 text-xs font-medium text-red-200 bg-red-950/60 hover:bg-red-900/70 border border-red-900/70 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eliminar</span>
                </button>
              </div>
            </div>
          ) : selectedTray ? (
            <div className="space-y-4">
              {(() => {
                const metrics = computePolylineMetrics(selectedTray.points);
                return (
                  <>
                    <div className="flex items-start gap-2.5">
                      <div className="w-8 h-8 rounded bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
                        <Route className="w-4 h-4 text-amber-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-mono text-amber-400 font-medium">
                          {selectedTray.code}
                        </div>
                        <div className="text-sm font-semibold text-slate-100 truncate">
                          {selectedTray.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          Canaleta ortogonal (90°)
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label
                          htmlFor="tray-name"
                          className="block text-xs text-slate-400 mb-1"
                        >
                          Nombre de canaleta
                        </label>
                        <input
                          id="tray-name"
                          type="text"
                          value={selectedTray.name}
                          onChange={(e) =>
                            onUpdateTray(selectedTray.id, { name: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="tray-code"
                          className="block text-xs text-slate-400 mb-1"
                        >
                          Código
                        </label>
                        <input
                          id="tray-code"
                          type="text"
                          value={selectedTray.code}
                          onChange={(e) =>
                            onUpdateTray(selectedTray.id, { code: e.target.value })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Longitud total</span>
                        <span className="font-mono tabular-nums font-semibold text-slate-100">
                          {metrics.totalM.toFixed(2)} m
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Cables enrutados</span>
                        <span className="font-mono tabular-nums text-emerald-400">
                          {
                            cables.filter((c) =>
                              c.snappedToTrayIds?.includes(selectedTray.id)
                            ).length
                          }{' '}
                          enlace(s)
                        </span>
                      </div>
                      <div className="border-t border-slate-800 pt-2 space-y-1">
                        <div className="text-[11px] text-slate-400">
                          Desglose por tramos ({metrics.segments.length})
                        </div>
                        {metrics.segments.map((seg, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs font-mono tabular-nums"
                          >
                            <span className="text-slate-400">Tramo {i + 1}</span>
                            <span className="text-slate-200">{seg.lengthM.toFixed(2)} m</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onDeleteTray(selectedTray.id)}
                      className="w-full px-3 py-1.5 text-xs font-medium text-red-200 bg-red-950/60 hover:bg-red-900/70 border border-red-900/70 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Canaleta</span>
                    </button>
                  </>
                );
              })()}
            </div>
          ) : selectedCable ? (
            <div className="space-y-4">
              {(() => {
                const from = elementMap.get(selectedCable.fromId);
                const to = elementMap.get(selectedCable.toId);
                if (!from || !to) return null;
                const polyPoints = getCablePolylinePoints(selectedCable, from, to);
                const metrics = computePolylineMetrics(polyPoints);
                const evalRes = evaluateCableTia568(selectedCable, from, to);
                const spec = CABLE_SPECS[selectedCable.category] ?? CABLE_SPECS.Cat6;
                const channelPct = Math.min(100, Math.round((evalRes.channelM / 100) * 100));

                return (
                  <>
                    <div>
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-sm shrink-0"
                          style={{ backgroundColor: spec.stroke }}
                        />
                        <span className="text-xs font-mono text-slate-300 font-medium">
                          {spec.shortLabel.toUpperCase()} ·{' '}
                          {evalRes.targetSpeed === '10G' ? '10 Gbps' : '1 Gbps'}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-slate-100 mt-1">
                        {from.code} → {to.code}
                      </div>
                      <div className="text-xs text-slate-400">
                        {from.name} hacia {to.name}
                      </div>
                    </div>

                    {/* Media & Target Speed Selectors */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label
                          htmlFor="cable-cat"
                          className="block text-[11px] text-slate-400 mb-1"
                        >
                          Tipo de Medio
                        </label>
                        <select
                          id="cable-cat"
                          value={selectedCable.category}
                          onChange={(e) =>
                            onUpdateCable(selectedCable.id, {
                              category: e.target.value as CableCategory,
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                        >
                          <option value="Cat5e">Cat5e (1G)</option>
                          <option value="Cat6">Cat6 (10G ≤55m)</option>
                          <option value="Cat6a">Cat6a (10G ≤100m)</option>
                          <option value="OM3_OM4">Fibra OM3/OM4</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="cable-speed"
                          className="block text-[11px] text-slate-400 mb-1"
                        >
                          Velocidad de Enlace
                        </label>
                        <select
                          id="cable-speed"
                          value={evalRes.targetSpeed}
                          onChange={(e) =>
                            onUpdateCable(selectedCable.id, {
                              targetSpeed: e.target.value as TargetSpeed,
                            })
                          }
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-sky-500"
                        >
                          <option value="1G">1 Gbps</option>
                          <option value="10G">10 Gbps</option>
                        </select>
                      </div>
                    </div>

                    {/* Full Channel Calculator (Permanent Link + Patch Cords WA & TR) */}
                    <div className="bg-slate-950 border border-slate-800 rounded-md p-3 space-y-2.5">
                      <div className="text-xs font-medium text-slate-200">
                        Cálculo de Canal Completo (TIA-568)
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">Enlace Permanente (máx 90m)</span>
                        <span
                          className={`font-mono tabular-nums font-semibold ${
                            evalRes.isPermanentLinkViolation
                              ? 'text-red-400'
                              : 'text-slate-100'
                          }`}
                        >
                          {evalRes.permanentLinkM.toFixed(2)} m
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <div>
                          <label
                            htmlFor="patch-wa"
                            className="block text-[11px] text-slate-400 mb-1"
                          >
                            Latiguillo WA (m)
                          </label>
                          <input
                            id="patch-wa"
                            type="number"
                            min="0"
                            max="25"
                            step="0.5"
                            value={evalRes.patchCordWaM}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!Number.isNaN(val) && val >= 0) {
                                onUpdateCable(selectedCable.id, {
                                  patchCordWaM: val,
                                });
                              }
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                        <div>
                          <label
                            htmlFor="patch-tr"
                            className="block text-[11px] text-slate-400 mb-1"
                          >
                            Latiguillo Rack (m)
                          </label>
                          <input
                            id="patch-tr"
                            type="number"
                            min="0"
                            max="25"
                            step="0.5"
                            value={evalRes.patchCordTrM}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              if (!Number.isNaN(val) && val >= 0) {
                                onUpdateCable(selectedCable.id, {
                                  patchCordTrM: val,
                                });
                              }
                            }}
                            className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-sky-500"
                          />
                        </div>
                      </div>

                      {/* Total Channel Result + Bar */}
                      <div className="border-t border-slate-800 pt-2 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-medium">
                            Canal Completo (máx 100m)
                          </span>
                          <span
                            className={`font-mono tabular-nums font-semibold ${
                              evalRes.isChannelViolation
                                ? 'text-red-400'
                                : evalRes.status === 'warning'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {evalRes.channelM.toFixed(2)} m
                          </span>
                        </div>

                        {!spec.isFiber && (
                          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                evalRes.isChannelViolation || evalRes.isPermanentLinkViolation
                                  ? 'bg-red-500'
                                  : evalRes.status === 'warning'
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${channelPct}%` }}
                            />
                          </div>
                        )}
                      </div>

                      {selectedCable.snappedToTrayIds &&
                        selectedCable.snappedToTrayIds.length > 0 && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800">
                            <span className="text-slate-400">Enrutado</span>
                            <span className="text-emerald-400 font-medium">
                              Ajustado a canaleta
                            </span>
                          </div>
                        )}

                      <div className="border-t border-slate-800 pt-2 space-y-1">
                        <div className="text-[11px] text-slate-400">
                          Segmentos trazados ({metrics.segments.length})
                        </div>
                        {metrics.segments.map((seg, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-xs font-mono tabular-nums"
                          >
                            <span className="text-slate-400">Seg. {i + 1}</span>
                            <span className="text-slate-200">{seg.lengthM.toFixed(2)} m</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Educational TIA-568 Alerts & Tooltips */}
                    {evalRes.issues.length > 0 ? (
                      <div className="space-y-2">
                        {evalRes.issues.map((issue) => (
                          <div
                            key={issue.id}
                            className={`rounded-md border p-2.5 space-y-1 ${
                              issue.severity === 'error'
                                ? 'bg-red-950/45 border-red-800/80'
                                : 'bg-amber-950/35 border-amber-800/70'
                            }`}
                          >
                            <div
                              className={`text-xs font-semibold flex items-start gap-1.5 ${
                                issue.severity === 'error'
                                  ? 'text-red-300'
                                  : 'text-amber-300'
                              }`}
                            >
                              {issue.severity === 'error' ? (
                                <AlertOctagon className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                              )}
                              <span>{issue.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-300 leading-relaxed">
                              {issue.description}
                            </p>
                            <p className="text-[11px] text-slate-400 leading-relaxed">
                              <span className="text-slate-200 font-medium">Solución: </span>
                              {issue.recommendation}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-emerald-950/30 border border-emerald-800/60 rounded-md p-2.5 flex items-center gap-2 text-xs text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Enlace y canal conformes con TIA/EIA-568.</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteCable(selectedCable.id)}
                      className="w-full px-3 py-1.5 text-xs font-medium text-red-200 bg-red-950/60 hover:bg-red-900/70 border border-red-900/70 rounded flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Eliminar Cable</span>
                    </button>
                  </>
                );
              })()}
            </div>
          ) : (
            <div className="py-4 text-left space-y-2.5">
              <div className="text-xs font-medium text-slate-200">
                Ningún elemento seleccionado
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Haz clic sobre un Rack, Puesto de Trabajo, Canaleta o Cable en el
                plano para inspeccionar su nombre, coordenadas y longitudes por tramo.
              </p>
              <div className="pt-1 text-[11px] text-slate-400 space-y-1">
                <div>• Regla TIA-568: Enlace Perm. ≤ 90 m / Canal ≤ 100 m</div>
                <div>• Tecla T: Dibujar canaleta a 90°</div>
                <div>• Tecla C: Trazar cable con snap a canaleta</div>
              </div>
            </div>
          )}
        </section>

        {/* Section 2: Real-Time Network Metrics */}
        <section className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold text-xs text-slate-200 tracking-tight">
              Métricas del Plano
            </h3>
            <span className="text-[11px] text-slate-400">Tiempo real</span>
          </div>

          <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-md bg-slate-950/70">
            <div className="px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Racks (MDF / IDF)</span>
              <span className="font-mono tabular-nums text-slate-100 font-medium">
                {rackCount}
              </span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Puestos de Trabajo (PC)</span>
              <span className="font-mono tabular-nums text-slate-100 font-medium">
                {pcCount}
              </span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Rosetas / Tomas RJ45</span>
              <span className="font-mono tabular-nums text-slate-100 font-medium">
                {outletCount}
              </span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Canaletas ({trayCount})</span>
              <span className="font-mono tabular-nums text-amber-300 font-medium">
                {totalTrayMeters.toFixed(1)} m
              </span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Cables Trazados</span>
              <span className="font-mono tabular-nums text-slate-100 font-medium">
                {cables.length}
              </span>
            </div>
            <div className="px-3 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-400">Longitud Total Cableada</span>
              <span className="font-mono tabular-nums text-sky-400 font-semibold">
                {totalCableMeters.toFixed(1)} m
              </span>
            </div>
          </div>

          {/* Media Color Legend */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-md p-2.5 grid grid-cols-2 gap-1.5 text-[11px]">
            {(Object.keys(CABLE_SPECS) as CableCategory[]).map((cat) => {
              const spec = CABLE_SPECS[cat];
              return (
                <div key={cat} className="flex items-center gap-1.5 text-slate-300">
                  <span
                    className="w-2.5 h-1.5 rounded-sm shrink-0"
                    style={{ backgroundColor: spec.stroke }}
                  />
                  <span className="truncate">{spec.shortLabel}</span>
                </div>
              );
            })}
          </div>

          {/* TIA-568 Status + Audit Trigger */}
          <button
            type="button"
            onClick={onRunAudit}
            className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md px-3 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer"
          >
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <ClipboardCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Auditoría TIA-568</span>
            </span>
            {errorLinks > 0 ? (
              <span className="text-red-400 font-medium flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                <span>{errorLinks} fallo(s)</span>
              </span>
            ) : warningLinks > 0 ? (
              <span className="text-amber-400 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{warningLinks} aviso(s)</span>
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Conforme</span>
              </span>
            )}
          </button>

          {/* BOM / Budget Trigger */}
          <button
            type="button"
            onClick={onOpenBom}
            className="w-full bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-md px-3 py-2.5 flex items-center justify-between text-xs transition-colors cursor-pointer"
          >
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <PackageCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Lista de Materiales (BOM)</span>
            </span>
            <span className="font-mono tabular-nums text-emerald-400 font-semibold">
              {bomTotalEur.toFixed(2)} €
            </span>
          </button>
        </section>
      </div>
    </aside>
  );
};
