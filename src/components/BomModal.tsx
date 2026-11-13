import React from 'react';
import {
  FileSpreadsheet,
  PackageCheck,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  BomPriceKey,
  BomSummary,
  generateBomCsv,
  UnitPriceCatalog,
} from '../utils/bom';

interface BomModalProps {
  open: boolean;
  summary: BomSummary;
  prices: UnitPriceCatalog;
  onUpdatePrice: (key: BomPriceKey, value: number) => void;
  onResetPrices: () => void;
  onClose: () => void;
}

function formatEur(amount: number): string {
  return `${amount.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

export const BomModal: React.FC<BomModalProps> = ({
  open,
  summary,
  onUpdatePrice,
  onResetPrices,
  onClose,
}) => {
  if (!open) return null;

  const handleExportCsv = () => {
    const csvContent = generateBomCsv(summary);
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'presupuesto-cableado-bom.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bom-dialog-title"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-4xl max-h-[88vh] flex flex-col shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
              <PackageCheck className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h2
                id="bom-dialog-title"
                className="font-display font-semibold text-base text-slate-100 truncate"
              >
                Lista de Materiales (BOM) y Presupuesto
              </h2>
              <p className="text-xs text-slate-400">
                Cálculo logístico automático con +10% de margen de desperdicio y caídas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onResetPrices}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
              title="Restablecer precios unitarios base"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              <span>Precios base</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar CSV</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar presupuesto"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 4-Column Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/60">
          <div className="px-4 py-3">
            <div className="text-[11px] text-slate-400">Cable requerido (+10%)</div>
            <div className="text-base font-mono tabular-nums font-semibold text-slate-100 mt-0.5">
              {summary.cableMetersWithMargin.toFixed(1)} m
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-400">
              {summary.netCableMeters.toFixed(1)} m netos en plano
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="text-[11px] text-slate-400">Tomas RJ45 · Patch Panels</div>
            <div className="text-base font-mono tabular-nums font-semibold text-slate-100 mt-0.5">
              {summary.outletJacksCount} RJ45 ·{' '}
              {summary.patchPanels24Count + summary.patchPanels48Count} PP
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-400">
              {summary.patchPanels48Count}×48p / {summary.patchPanels24Count}×24p
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="text-[11px] text-slate-400">Canaleta · Latiguillos</div>
            <div className="text-base font-mono tabular-nums font-semibold text-slate-100 mt-0.5">
              {summary.trayMeters.toFixed(1)} m ·{' '}
              {summary.patchCordsUtpCount + summary.patchCordsFiberCount} uds
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-400">
              WA + Cuarto Telecom (TR)
            </div>
          </div>

          <div className="px-4 py-3">
            <div className="text-[11px] text-slate-400">Base Imponible Material</div>
            <div className="text-base font-mono tabular-nums font-semibold text-sky-400 mt-0.5">
              {formatEur(summary.subtotalMaterial)}
            </div>
            <div className="text-[11px] font-mono tabular-nums text-slate-400">
              Con IVA (21%): {formatEur(summary.totalWithTax)}
            </div>
          </div>
        </div>

        {/* Dynamic BOM Table */}
        <div className="flex-1 overflow-auto ide-scroll">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-[11px] text-slate-400">
              <tr>
                <th className="py-2.5 px-4 font-medium">Categoría</th>
                <th className="py-2.5 px-4 font-medium">Partida / Material</th>
                <th className="py-2.5 px-4 font-medium text-right">Cantidad</th>
                <th className="py-2.5 px-3 font-medium">Ud.</th>
                <th className="py-2.5 px-4 font-medium text-right">Precio Unit. (€)</th>
                <th className="py-2.5 px-4 font-medium text-right">Subtotal (€)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {summary.items.map((item) => (
                <tr
                  key={item.id}
                  className="hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-2.5 px-4 text-slate-400 whitespace-nowrap">
                    {item.category}
                  </td>
                  <td className="py-2.5 px-4">
                    <div className="font-medium text-slate-100">
                      {item.description}
                    </div>
                    <div className="text-[11px] text-slate-400">{item.detail}</div>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-100">
                    {item.quantity}
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {item.unit}
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      aria-label={`Precio unitario de ${item.description}`}
                      value={item.unitPrice}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        if (!Number.isNaN(val) && val >= 0) {
                          onUpdatePrice(item.priceKey, val);
                        }
                      }}
                      className="w-20 bg-slate-950 border border-slate-800 rounded px-2 py-1 text-right text-xs font-mono tabular-nums text-slate-100 focus:outline-none focus:border-sky-500"
                    />
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-100 whitespace-nowrap">
                    {formatEur(item.subtotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Budget Totals Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            Precios unitarios editables en tabla · Exportación CSV compatible con Excel
          </div>

          <div className="flex items-center gap-6 text-xs font-mono tabular-nums">
            <div>
              <span className="text-slate-400 mr-2">Base:</span>
              <span className="text-slate-200 font-medium">
                {formatEur(summary.subtotalMaterial)}
              </span>
            </div>
            <div>
              <span className="text-slate-400 mr-2">IVA 21%:</span>
              <span className="text-slate-200 font-medium">
                {formatEur(summary.tax21)}
              </span>
            </div>
            <div>
              <span className="text-slate-300 mr-2 font-sans font-medium">
                Total Proyecto:
              </span>
              <span className="text-emerald-400 text-sm font-semibold">
                {formatEur(summary.totalWithTax)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
