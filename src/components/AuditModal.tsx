import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  Flag,
  RefreshCw,
  X,
} from 'lucide-react';
import { ScenarioDefinition, ScenarioEvaluation } from '../data/scenarios';
import { AuditIssue, NetworkAuditReport } from '../utils/pathing';

interface AuditModalProps {
  report: NetworkAuditReport | null;
  scenario: ScenarioDefinition;
  scenarioEval: ScenarioEvaluation | null;
  onClose: () => void;
  onRerun: () => void;
  onInspectIssue: (issue: AuditIssue) => void;
}

export const AuditModal: React.FC<AuditModalProps> = ({
  report,
  scenario,
  scenarioEval,
  onClose,
  onRerun,
  onInspectIssue,
}) => {
  const [flagCopied, setFlagCopied] = useState(false);

  if (!report) return null;

  const isHealthy = report.errorCount === 0 && report.warningCount === 0;

  const handleCopyFlag = async (flagText: string) => {
    try {
      await navigator.clipboard.writeText(flagText);
      setFlagCopied(true);
      setTimeout(() => setFlagCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-dialog-title"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-2xl max-h-[86vh] flex flex-col shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-md bg-slate-950 border border-slate-800 flex items-center justify-center shrink-0">
              <ClipboardCheck className="w-5 h-5 text-sky-400" />
            </div>
            <div className="min-w-0">
              <h2
                id="audit-dialog-title"
                className="font-display font-semibold text-base text-slate-100 truncate"
              >
                Informe de Auditoría de Red · TIA/EIA-568
              </h2>
              <p className="text-xs text-slate-400 truncate">
                {scenario.title} · {report.timestamp}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onRerun}
              className="px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reanalizar</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar informe"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Metrics Row */}
        <div className="grid grid-cols-4 divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/60">
          <div className="px-4 py-3">
            <div className="text-[11px] text-slate-400">Enlaces analizados</div>
            <div className="text-lg font-mono tabular-nums font-semibold text-slate-100 mt-0.5">
              {report.totalCables}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[11px] text-slate-400">Conformes</div>
            <div className="text-lg font-mono tabular-nums font-semibold text-emerald-400 mt-0.5">
              {report.compliantCables}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[11px] text-slate-400">Fallos críticos</div>
            <div
              className={`text-lg font-mono tabular-nums font-semibold mt-0.5 ${
                report.errorCount > 0 ? 'text-red-400' : 'text-slate-200'
              }`}
            >
              {report.errorCount}
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-[11px] text-slate-400">Advertencias</div>
            <div
              className={`text-lg font-mono tabular-nums font-semibold mt-0.5 ${
                report.warningCount > 0 ? 'text-amber-400' : 'text-slate-200'
              }`}
            >
              {report.warningCount}
            </div>
          </div>
        </div>

        {/* Findings & Scenario CTF Body */}
        <div className="flex-1 overflow-y-auto ide-scroll p-5 space-y-4">
          {/* Scenario / CTF Verification Banner */}
          {scenarioEval && (
            <div
              className={`rounded-md border p-4 space-y-3 ${
                scenarioEval.passed
                  ? 'bg-emerald-950/40 border-emerald-700/70'
                  : 'bg-slate-950/80 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="text-xs font-mono text-sky-400 font-medium flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5" />
                    <span>VERIFICACIÓN DE ESCENARIO ({scenario.difficulty})</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {scenario.objective}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {scenarioEval.checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className={`text-xs flex items-center gap-2 px-2.5 py-1.5 rounded border ${
                      item.ok
                        ? 'bg-emerald-950/50 border-emerald-800/60 text-emerald-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400'
                    }`}
                  >
                    {item.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                    <span className="truncate">{item.label}</span>
                  </div>
                ))}
              </div>

              {scenarioEval.passed && scenarioEval.flag && (
                <div className="bg-slate-950 border border-emerald-600/70 rounded-md px-3.5 py-2.5 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] text-emerald-400 font-medium">
                      Reto superado · Flag desbloqueada
                    </div>
                    <div className="font-mono text-sm font-semibold text-white tracking-wide mt-0.5">
                      {scenarioEval.flag}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyFlag(scenarioEval.flag!)}
                    className="px-3 py-1.5 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {flagCopied ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copiada</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copiar Flag</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Normative Audit Findings */}
          {isHealthy ? (
            <div className="bg-emerald-950/35 border border-emerald-800/70 rounded-md p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-emerald-200">
                  Diseño 100% conforme con la normativa TIA/EIA-568
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Todos los enlaces permanentes son iguales o inferiores a 90 m, los
                  canales completos (incluyendo latiguillos) no exceden los 100 m y las
                  categorías de cable son compatibles con las velocidades objetivo.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {report.issues.map((issue) => {
                const isError = issue.severity === 'error';
                return (
                  <div
                    key={issue.id}
                    className={`rounded-md border p-3.5 space-y-2 ${
                      isError
                        ? 'bg-red-950/30 border-red-900/70'
                        : 'bg-amber-950/25 border-amber-900/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {isError ? (
                          <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 text-[11px] font-mono">
                            <span
                              className={
                                isError
                                  ? 'text-red-400 font-semibold'
                                  : 'text-amber-400 font-semibold'
                              }
                            >
                              {isError ? 'CRÍTICO' : 'ADVERTENCIA'}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-300">{issue.targetLabel}</span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-400">{issue.ruleCode}</span>
                          </div>
                          <h3 className="text-xs font-semibold text-slate-100 mt-0.5">
                            {issue.title}
                          </h3>
                        </div>
                      </div>

                      {issue.targetId && (
                        <button
                          type="button"
                          onClick={() => onInspectIssue(issue)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-800 hover:bg-sky-600 hover:text-white border border-slate-700 rounded flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                        >
                          <span>Inspeccionar</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed pl-6">
                      {issue.description}
                    </p>
                    <div className="text-[11px] text-slate-400 pl-6">
                      <span className="text-slate-200 font-medium">Recomendación: </span>
                      {issue.recommendation}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/70 flex items-center justify-between text-xs text-slate-400">
          <span className="font-mono tabular-nums">
            Total canaletas: {report.totalTrayMeters.toFixed(1)} m · Total cableado:{' '}
            {report.totalCableMeters.toFixed(1)} m
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-white bg-sky-600 hover:bg-sky-500 rounded transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};
