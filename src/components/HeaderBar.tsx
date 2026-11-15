import React, { useRef, useState } from 'react';
import {
  BookOpen,
  Check,
  ClipboardCheck,
  Download,
  ExternalLink,
  Flag,
  PackageCheck,
  Share2,
  Trash2,
  Upload,
} from 'lucide-react';
import { SCENARIOS } from '../data/scenarios';
import { ScenarioId } from '../types/cabling';

interface HeaderBarProps {
  activeScenarioId: ScenarioId;
  onSelectScenario: (id: ScenarioId) => void;
  onClearCanvas: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onShareLink: () => Promise<void>;
  onRunAudit: () => void;
  onOpenBom: () => void;
  onOpenGuide: () => void;
  elementCount: number;
  issueCount: number;
  bomTotalEur: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  activeScenarioId,
  onSelectScenario,
  onClearCanvas,
  onExportJson,
  onImportJson,
  onShareLink,
  onRunAudit,
  onOpenBom,
  onOpenGuide,
  elementCount,
  issueCount,
  bomTotalEur,
}) => {
  const [logoError, setLogoError] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleShareClick = async () => {
    await onShareLink();
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  return (
    <header id="netcad-header" className="h-14 bg-slate-900 border-b border-slate-800 px-4 flex items-center justify-between gap-4 shrink-0 z-20 overflow-x-auto">
      {/* Zone 1: Brand Logo & Author Link */}
      <div className="flex items-center gap-3 min-w-0 shrink-0">
        <a
          href="https://www.unfantasmaenelsistema.com/"
          target="_blank"
          rel="noopener noreferrer"
          title="Visitar Un Fantasma en el Sistema"
          className="flex items-center gap-3 group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 rounded-md"
        >
          <div className="w-9 h-9 rounded-md bg-white flex items-center justify-center p-1 border border-slate-700 shrink-0 overflow-hidden">
            {!logoError ? (
              <img
                src="./assets/logo.png"
                alt="Logo Un Fantasma en el Sistema"
                referrerPolicy="no-referrer"
                onError={() => setLogoError(true)}
                className="w-full h-full object-contain"
              />
            ) : (
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-slate-900"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M7 12h10M12 7v10" />
              </svg>
            )}
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display font-semibold text-sm text-slate-100 tracking-tight whitespace-nowrap">
              NetCAD · Cableado Estructurado
            </span>
            <span className="text-xs text-slate-400 group-hover:text-sky-400 transition-colors flex items-center gap-1 whitespace-nowrap">
              unfantasmaenelsistema.com
              <ExternalLink className="w-3 h-3 shrink-0" />
            </span>
          </div>
        </a>
      </div>

      {/* Zone 2: Scenario / CTF Selector */}
      <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 shrink-0">
        <Flag className="w-3.5 h-3.5 text-sky-400 shrink-0" aria-hidden="true" />
        <label
          htmlFor="scenario-select"
          className="text-xs text-slate-400 whitespace-nowrap"
        >
          Escenario:
        </label>
        <select
          id="scenario-select"
          value={activeScenarioId}
          onChange={(e) => onSelectScenario(e.target.value as ScenarioId)}
          className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none cursor-pointer pr-1"
        >
          {SCENARIOS.map((sc) => (
            <option
              key={sc.id}
              value={sc.id}
              className="bg-slate-900 text-slate-100"
            >
              {sc.shortTitle}
            </option>
          ))}
        </select>
      </div>

      {/* Zone 3: Workspace Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={onOpenGuide}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          title="Abrir Guía Técnica TIA/EIA-568, códigos de color T568A/B y atajos"
        >
          <BookOpen className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span>Guía TIA-568</span>
        </button>

        <button
          type="button"
          onClick={onOpenBom}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          title="Abrir Lista de Materiales (BOM) y Presupuesto"
        >
          <PackageCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>BOM</span>
          <span className="font-mono tabular-nums text-emerald-300">
            · {bomTotalEur.toFixed(0)} €
          </span>
        </button>

        <button
          type="button"
          onClick={onRunAudit}
          className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
            issueCount > 0
              ? 'bg-amber-600/20 hover:bg-amber-600/30 text-amber-200 border-amber-500/60'
              : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-200 border-emerald-500/50'
          }`}
          title="Ejecutar diagnóstico normativo TIA/EIA-568 y verificar CTF"
        >
          <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
          <span>Auditoría</span>
          {issueCount > 0 && (
            <span className="font-mono tabular-nums text-[11px] text-amber-300">
              ({issueCount})
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={handleShareClick}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          title="Codificar el plano actual en la URL (?map=...) y copiar enlace"
        >
          {copiedLink ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-300">Copiado</span>
            </>
          ) : (
            <>
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Compartir</span>
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              onImportJson(file);
              e.target.value = '';
            }
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          title="Importar plano guardado desde archivo JSON"
        >
          <Upload className="w-3.5 h-3.5 text-slate-400" />
          <span>Importar</span>
        </button>

        <button
          type="button"
          onClick={onClearCanvas}
          disabled={elementCount === 0}
          className="px-2.5 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 disabled:opacity-45 disabled:cursor-not-allowed border border-slate-700 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
          title="Vaciar todos los elementos del lienzo"
        >
          <Trash2 className="w-3.5 h-3.5 text-slate-400" />
          <span>Limpiar</span>
        </button>

        <button
          type="button"
          onClick={onExportJson}
          className="px-2.5 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
          title="Descargar topología del plano en JSON"
        >
          <Download className="w-3.5 h-3.5" />
          <span>JSON</span>
        </button>
      </div>
    </header>
  );
};
