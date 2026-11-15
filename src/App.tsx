import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Flag } from 'lucide-react';
import { AuditModal } from './components/AuditModal';
import { BomModal } from './components/BomModal';
import { ConfirmModal } from './components/ConfirmModal';
import { FloorPlanCanvas } from './components/FloorPlanCanvas';
import { GuideModal } from './components/GuideModal';
import { HeaderBar } from './components/HeaderBar';
import { PaletteSidebar } from './components/PaletteSidebar';
import { PropertiesPanel } from './components/PropertiesPanel';
import { getScenarioById } from './data/scenarios';
import {
  CableCategory,
  CableLink,
  CanvasElement,
  ElementType,
  getPaletteDef,
  INITIAL_CABLES,
  INITIAL_ELEMENTS,
  INITIAL_TRAY_PATHS,
  Point,
  ScenarioId,
  snapValue,
  TargetSpeed,
  ToolMode,
  TrayPath,
} from './types/cabling';
import {
  BomPriceKey,
  computeBom,
  DEFAULT_UNIT_PRICES,
  UnitPriceCatalog,
} from './utils/bom';
import {
  AuditIssue,
  NetworkAuditReport,
  runNetworkAudit,
} from './utils/pathing';
import {
  readMapFromCurrentUrl,
  syncMapToBrowserUrl,
} from './utils/shareMap';

const STORAGE_KEY = 'netcad_structured_cabling_v4';

interface WorkspaceSnapshot {
  elements: CanvasElement[];
  trayPaths: TrayPath[];
  cables: CableLink[];
}

interface SavedWorkspace extends WorkspaceSnapshot {
  scenarioId: ScenarioId;
}

const MAX_HISTORY = 40;

/**
 * Loads initial workspace from `?map=base64...` URL query parameter if present,
 * falling back to localStorage, and finally to the default demo floor plan.
 */
function loadInitialWorkspace(): SavedWorkspace & {
  initialPan: { x: number; y: number };
  initialZoom: number;
} {
  const fromUrl = readMapFromCurrentUrl();
  if (fromUrl) {
    const sc = getScenarioById(fromUrl.scenarioId ?? 'demo');
    return {
      scenarioId: fromUrl.scenarioId ?? 'demo',
      elements: fromUrl.elements,
      trayPaths: fromUrl.trayPaths,
      cables: fromUrl.cables,
      initialPan: sc.initialPan,
      initialZoom: sc.initialZoom,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SavedWorkspace>;
      if (
        Array.isArray(parsed.elements) &&
        Array.isArray(parsed.trayPaths) &&
        Array.isArray(parsed.cables)
      ) {
        const sc = getScenarioById(parsed.scenarioId ?? 'demo');
        return {
          scenarioId: parsed.scenarioId ?? 'demo',
          elements: parsed.elements,
          trayPaths: parsed.trayPaths,
          cables: parsed.cables,
          initialPan: sc.initialPan,
          initialZoom: sc.initialZoom,
        };
      }
    }
  } catch {
    // Fallback to default architectural demo
  }

  return {
    scenarioId: 'demo',
    elements: INITIAL_ELEMENTS,
    trayPaths: INITIAL_TRAY_PATHS,
    cables: INITIAL_CABLES,
    initialPan: { x: 40, y: 40 },
    initialZoom: 1,
  };
}

function nextElementCode(elements: CanvasElement[], type: ElementType): string {
  const def = getPaletteDef(type);
  const existing = elements.filter((el) => el.type === type);
  let num = existing.length + 1;
  const usedCodes = new Set(elements.map((e) => e.code));
  while (usedCodes.has(`${def.prefix}-${String(num).padStart(2, '0')}`)) {
    num += 1;
  }
  return `${def.prefix}-${String(num).padStart(2, '0')}`;
}

function nextTrayCode(trayPaths: TrayPath[], elements: CanvasElement[]): string {
  const used = new Set([
    ...trayPaths.map((t) => t.code),
    ...elements.map((e) => e.code),
  ]);
  let num = trayPaths.length + 1;
  while (used.has(`CAN-${String(num).padStart(2, '0')}`)) {
    num += 1;
  }
  return `CAN-${String(num).padStart(2, '0')}`;
}

export default function App() {
  const initial = useMemo(() => loadInitialWorkspace(), []);

  const [activeScenarioId, setActiveScenarioId] = useState<ScenarioId>(
    initial.scenarioId
  );
  const [elements, setElements] = useState<CanvasElement[]>(initial.elements);
  const [trayPaths, setTrayPaths] = useState<TrayPath[]>(initial.trayPaths);
  const [cables, setCables] = useState<CableLink[]>(initial.cables);

  const [selectedId, setSelectedId] = useState<string | null>(
    initial.elements.find((e) => e.type === 'rack_mdf')?.id ?? null
  );
  const [selectedTrayId, setSelectedTrayId] = useState<string | null>(null);
  const [selectedCableId, setSelectedCableId] = useState<string | null>(null);

  const [toolMode, setToolMode] = useState<ToolMode>('select');
  const [activeCableCategory, setActiveCableCategory] =
    useState<CableCategory>('Cat6');
  const [activeTargetSpeed, setActiveTargetSpeed] =
    useState<TargetSpeed>('10G');
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [pan, setPan] = useState(initial.initialPan);
  const [zoom, setZoom] = useState(initial.initialZoom);

  const [auditReport, setAuditReport] = useState<NetworkAuditReport | null>(null);
  const [bomOpen, setBomOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [unitPrices, setUnitPrices] = useState<UnitPriceCatalog>(
    DEFAULT_UNIT_PRICES
  );

  // Undo / Redo history stack
  const [historyPast, setHistoryPast] = useState<WorkspaceSnapshot[]>([]);
  const [historyFuture, setHistoryFuture] = useState<WorkspaceSnapshot[]>([]);
  const currentSnapshotRef = useRef<WorkspaceSnapshot>({
    elements: initial.elements,
    trayPaths: initial.trayPaths,
    cables: initial.cables,
  });

  useEffect(() => {
    currentSnapshotRef.current = { elements, trayPaths, cables };
  }, [elements, trayPaths, cables]);

  const pushHistorySnapshot = useCallback(() => {
    const snap = currentSnapshotRef.current;
    setHistoryPast((prev) => [...prev.slice(-(MAX_HISTORY - 1)), snap]);
    setHistoryFuture([]);
  }, []);

  const handleUndo = useCallback(() => {
    setHistoryPast((prev) => {
      if (prev.length === 0) return prev;
      const target = prev[prev.length - 1];
      const current = currentSnapshotRef.current;
      setHistoryFuture((fut) => [current, ...fut.slice(0, MAX_HISTORY - 1)]);
      setElements(target.elements);
      setTrayPaths(target.trayPaths);
      setCables(target.cables);
      setSelectedId(null);
      setSelectedTrayId(null);
      setSelectedCableId(null);
      return prev.slice(0, -1);
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryFuture((fut) => {
      if (fut.length === 0) return fut;
      const [next, ...rest] = fut;
      const current = currentSnapshotRef.current;
      setHistoryPast((prev) => [...prev.slice(-(MAX_HISTORY - 1)), current]);
      setElements(next.elements);
      setTrayPaths(next.trayPaths);
      setCables(next.cables);
      setSelectedId(null);
      setSelectedTrayId(null);
      setSelectedCableId(null);
      return rest;
    });
  }, []);

  // Clean confirmation / notice modal state
  const [confirmState, setConfirmState] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    hideCancel?: boolean;
    variant: 'danger' | 'warning';
    onConfirm: () => void;
  } | null>(null);

  const activeScenario = useMemo(
    () => getScenarioById(activeScenarioId),
    [activeScenarioId]
  );

  // Live audit summary for HeaderBar counter and CTF verification
  const liveAuditSummary = useMemo(
    () => runNetworkAudit(elements, trayPaths, cables),
    [elements, trayPaths, cables]
  );

  // Live Bill of Materials & Budget summary
  const bomSummary = useMemo(
    () => computeBom(elements, trayPaths, cables, unitPrices),
    [elements, trayPaths, cables, unitPrices]
  );

  // Scenario / CTF evaluation when applicable
  const scenarioEvaluation = useMemo(() => {
    if (!activeScenario.evaluate) return null;
    return activeScenario.evaluate(elements, cables, liveAuditSummary, bomSummary);
  }, [activeScenario, bomSummary, cables, elements, liveAuditSummary]);

  // Persist workspace to localStorage and sync ?map=base64... in browser URL
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          scenarioId: activeScenarioId,
          elements,
          trayPaths,
          cables,
        })
      );
    } catch {
      // Ignore storage quota errors
    }

    const timer = window.setTimeout(() => {
      syncMapToBrowserUrl({
        v: 1,
        scenarioId: activeScenarioId,
        elements,
        trayPaths,
        cables,
      });
    }, 350);

    return () => window.clearTimeout(timer);
  }, [activeScenarioId, cables, elements, trayPaths]);

  const applyScenario = useCallback((id: ScenarioId) => {
    const sc = getScenarioById(id);
    setActiveScenarioId(sc.id);
    setElements(sc.elements);
    setTrayPaths(sc.trayPaths);
    setCables(sc.cables);
    setHistoryPast([]);
    setHistoryFuture([]);
    setSelectedId(sc.elements.find((e) => e.type === 'rack_mdf')?.id ?? null);
    setSelectedTrayId(null);
    setSelectedCableId(null);
    setPan(sc.initialPan);
    setZoom(sc.initialZoom);
    setToolMode('select');
  }, []);

  const handleSelectScenario = useCallback(
    (id: ScenarioId) => {
      if (id === activeScenarioId) return;
      const target = getScenarioById(id);
      if (elements.length > 0 || cables.length > 0) {
        setConfirmState({
          title: `Cargar ${target.shortTitle}`,
          message:
            'Al cambiar de escenario se reemplazará el diseño actual del lienzo. Puedes copiar primero tu enlace compartido si deseas conservar el progreso actual.',
          confirmLabel: 'Cargar escenario',
          variant: 'warning',
          onConfirm: () => {
            applyScenario(id);
            setConfirmState(null);
          },
        });
      } else {
        applyScenario(id);
      }
    },
    [activeScenarioId, applyScenario, cables.length, elements.length]
  );

  const createElementAt = useCallback(
    (type: ElementType, x: number, y: number) => {
      pushHistorySnapshot();
      const def = getPaletteDef(type);
      const id = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setElements((prev) => {
        const code = nextElementCode(prev, type);
        const newEl: CanvasElement = {
          id,
          type,
          code,
          name: `${def.shortLabel} ${code.split('-')[1] ?? ''}`.trim(),
          x: snapValue(x, snapEnabled),
          y: snapValue(y, snapEnabled),
          width: def.defaultWidth,
          height: def.defaultHeight,
          rotation: 0,
          ports: def.defaultPorts,
          rackUnits: def.defaultRackUnits,
        };
        return [...prev, newEl];
      });
      setSelectedCableId(null);
      setSelectedTrayId(null);
      setSelectedId(id);
      setToolMode('select');
    },
    [pushHistorySnapshot, snapEnabled]
  );

  const handleQuickAdd = useCallback(
    (type: ElementType) => {
      const offset = (elements.length % 5) * 20;
      const worldCenterX = (420 - pan.x) / zoom + offset;
      const worldCenterY = (280 - pan.y) / zoom + offset;
      createElementAt(type, worldCenterX, worldCenterY);
    },
    [createElementAt, elements.length, pan.x, pan.y, zoom]
  );

  const handleMoveElement = useCallback((id: string, x: number, y: number) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, x, y } : el))
    );
  }, []);

  const handleResizeElement = useCallback((id: string, width: number) => {
    setElements((prev) =>
      prev.map((el) => (el.id === id ? { ...el, width } : el))
    );
  }, []);

  const handleUpdateElement = useCallback(
    (id: string, patch: Partial<CanvasElement>) => {
      pushHistorySnapshot();
      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...patch } : el))
      );
    },
    [pushHistorySnapshot]
  );

  const handleDuplicateElement = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      const newId = `el-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setElements((prev) => {
        const source = prev.find((e) => e.id === id);
        if (!source) return prev;
        const code = nextElementCode(prev, source.type);
        const copy: CanvasElement = {
          ...source,
          id: newId,
          code,
          name: `${source.name} (Copia)`,
          x: source.x + 40,
          y: source.y + 40,
        };
        return [...prev, copy];
      });
      setSelectedId(newId);
      setSelectedTrayId(null);
      setSelectedCableId(null);
    },
    [pushHistorySnapshot]
  );

  const handleDeleteElement = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setElements((prev) => prev.filter((el) => el.id !== id));
      setCables((prev) =>
        prev.filter((cab) => cab.fromId !== id && cab.toId !== id)
      );
      setSelectedId((prev) => (prev === id ? null : prev));
    },
    [pushHistorySnapshot]
  );

  const handleCreateTrayPath = useCallback(
    (points: Point[]) => {
      pushHistorySnapshot();
      const id = `tray-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setTrayPaths((prev) => {
        const code = nextTrayCode(prev, elements);
        const newTray: TrayPath = {
          id,
          code,
          name: `Canaleta ${code.split('-')[1] ?? ''}`.trim(),
          points,
          widthPx: 20,
        };
        return [...prev, newTray];
      });
      setSelectedId(null);
      setSelectedCableId(null);
      setSelectedTrayId(id);
    },
    [elements, pushHistorySnapshot]
  );

  const handleUpdateTray = useCallback(
    (id: string, patch: Partial<TrayPath>) => {
      pushHistorySnapshot();
      setTrayPaths((prev) =>
        prev.map((tp) => (tp.id === id ? { ...tp, ...patch } : tp))
      );
    },
    [pushHistorySnapshot]
  );

  const handleDeleteTray = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setTrayPaths((prev) => prev.filter((tp) => tp.id !== id));
      setSelectedTrayId((prev) => (prev === id ? null : prev));
    },
    [pushHistorySnapshot]
  );

  const handleCreateCable = useCallback(
    (
      fromId: string,
      toId: string,
      waypoints: Point[],
      snappedToTrayIds: string[]
    ) => {
      pushHistorySnapshot();
      const id = `cab-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newLink: CableLink = {
        id,
        fromId,
        toId,
        category: activeCableCategory,
        targetSpeed: activeTargetSpeed,
        patchCordWaM: 3,
        patchCordTrM: 2,
        waypoints,
        snappedToTrayIds,
      };
      setCables((prev) => [...prev, newLink]);
      setSelectedId(null);
      setSelectedTrayId(null);
      setSelectedCableId(id);
    },
    [activeCableCategory, activeTargetSpeed, pushHistorySnapshot]
  );

  const handleUpdateCable = useCallback(
    (id: string, patch: Partial<CableLink>) => {
      pushHistorySnapshot();
      setCables((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...patch } : c))
      );
    },
    [pushHistorySnapshot]
  );

  const handleDeleteCable = useCallback(
    (id: string) => {
      pushHistorySnapshot();
      setCables((prev) => prev.filter((c) => c.id !== id));
      setSelectedCableId((prev) => (prev === id ? null : prev));
    },
    [pushHistorySnapshot]
  );

  const handleRequestClearCanvas = useCallback(() => {
    setConfirmState({
      title: 'Vaciar plano de planta',
      message:
        'Se eliminarán todos los nodos, canaletas y cables del lienzo actual. Esta acción actualizará el proyecto local.',
      confirmLabel: 'Vaciar lienzo',
      variant: 'danger',
      onConfirm: () => {
        pushHistorySnapshot();
        setElements([]);
        setTrayPaths([]);
        setCables([]);
        setSelectedId(null);
        setSelectedTrayId(null);
        setSelectedCableId(null);
        setConfirmState(null);
      },
    });
  }, [pushHistorySnapshot]);

  const handleShareLink = useCallback(async () => {
    const shareUrl = syncMapToBrowserUrl({
      v: 1,
      scenarioId: activeScenarioId,
      elements,
      trayPaths,
      cables,
    });
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Browser URL is still updated even if clipboard permission is blocked
    }
  }, [activeScenarioId, cables, elements, trayPaths]);

  const handleExportJson = useCallback(() => {
    const payload = {
      schema: 'netcad-structured-cabling-v4',
      scenarioId: activeScenarioId,
      exportedAt: new Date().toISOString(),
      scale: '40px = 1m',
      elements,
      trayPaths,
      cables,
      auditSummary: liveAuditSummary,
      bomSummary,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `plano-${activeScenarioId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeScenarioId, bomSummary, cables, elements, liveAuditSummary, trayPaths]);

  const handleImportJson = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text) as Partial<SavedWorkspace>;
        if (
          !parsed ||
          !Array.isArray(parsed.elements) ||
          !Array.isArray(parsed.trayPaths) ||
          !Array.isArray(parsed.cables)
        ) {
          throw new Error('Estructura de archivo no válida');
        }
        pushHistorySnapshot();
        if (parsed.scenarioId) {
          setActiveScenarioId(parsed.scenarioId);
        }
        setElements(parsed.elements);
        setTrayPaths(parsed.trayPaths);
        setCables(parsed.cables);
        setSelectedId(null);
        setSelectedTrayId(null);
        setSelectedCableId(null);
      } catch {
        setConfirmState({
          title: 'Error al importar plano JSON',
          message:
            'El archivo seleccionado no corresponde a un proyecto válido de NetCAD (debe contener listas válidas de elements, trayPaths y cables).',
          confirmLabel: 'Aceptar',
          hideCancel: true,
          variant: 'danger',
          onConfirm: () => setConfirmState(null),
        });
      }
    },
    [pushHistorySnapshot]
  );

  const handleRunAudit = useCallback(() => {
    setAuditReport(runNetworkAudit(elements, trayPaths, cables));
  }, [cables, elements, trayPaths]);

  const handleInspectIssue = useCallback((issue: AuditIssue) => {
    setAuditReport(null);
    setToolMode('select');
    if (issue.targetType === 'cable' && issue.targetId) {
      setSelectedId(null);
      setSelectedTrayId(null);
      setSelectedCableId(issue.targetId);
    } else if (issue.targetType === 'element' && issue.targetId) {
      setSelectedCableId(null);
      setSelectedTrayId(null);
      setSelectedId(issue.targetId);
    }
  }, []);

  // Keyboard Shortcuts for CAD workflow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.tagName === 'SELECT';
      if (isInput) return;

      if (e.key === 'v' || e.key === 'V') {
        setToolMode('select');
      } else if (e.key === 't' || e.key === 'T') {
        setToolMode('tray_draw');
      } else if (e.key === 'c' || e.key === 'C') {
        setToolMode('cable');
      } else if (e.key === 'h' || e.key === 'H') {
        setToolMode('pan');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedId) {
          e.preventDefault();
          handleDeleteElement(selectedId);
        } else if (selectedTrayId) {
          e.preventDefault();
          handleDeleteTray(selectedTrayId);
        } else if (selectedCableId) {
          e.preventDefault();
          handleDeleteCable(selectedCableId);
        }
      } else if (e.key === 'Escape') {
        setConfirmState(null);
        setAuditReport(null);
        setBomOpen(false);
        setGuideOpen(false);
        setSelectedId(null);
        setSelectedTrayId(null);
        setSelectedCableId(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
        if (selectedId) {
          e.preventDefault();
          handleDuplicateElement(selectedId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    handleDeleteCable,
    handleDeleteElement,
    handleDeleteTray,
    handleDuplicateElement,
    handleRedo,
    handleUndo,
    selectedCableId,
    selectedId,
    selectedTrayId,
  ]);

  const selectedElement = useMemo(
    () => elements.find((e) => e.id === selectedId) ?? null,
    [elements, selectedId]
  );

  const selectedTray = useMemo(
    () => trayPaths.find((t) => t.id === selectedTrayId) ?? null,
    [trayPaths, selectedTrayId]
  );

  const selectedCable = useMemo(
    () => cables.find((c) => c.id === selectedCableId) ?? null,
    [cables, selectedCableId]
  );

  return (
    <div id="netcad-app" className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <HeaderBar
        activeScenarioId={activeScenarioId}
        onSelectScenario={handleSelectScenario}
        onClearCanvas={handleRequestClearCanvas}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onShareLink={handleShareLink}
        onRunAudit={handleRunAudit}
        onOpenBom={() => setBomOpen(true)}
        onOpenGuide={() => setGuideOpen(true)}
        elementCount={elements.length + trayPaths.length}
        issueCount={liveAuditSummary.issues.length}
        bomTotalEur={bomSummary.subtotalMaterial}
      />

      {/* Active Challenge / CTF Mission Strip (shown when an Academy Scenario is active) */}
      {activeScenarioId !== 'demo' && (
        <div className="bg-slate-950 border-b border-slate-800 px-4 py-1.5 flex items-center justify-between gap-4 text-xs shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <Flag className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span className="font-semibold text-slate-100 whitespace-nowrap">
              {activeScenario.difficulty}:
            </span>
            <span className="text-slate-300 truncate">{activeScenario.objective}</span>
          </div>
          <button
            type="button"
            onClick={handleRunAudit}
            className={`px-2.5 py-1 text-[11px] font-medium rounded border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              scenarioEvaluation?.passed
                ? 'bg-emerald-600/25 border-emerald-500 text-emerald-200 hover:bg-emerald-600/35'
                : 'bg-sky-600/20 border-sky-500/60 text-sky-200 hover:bg-sky-600/30'
            }`}
          >
            {scenarioEvaluation?.passed
              ? `Flag desbloqueada: ${scenarioEvaluation.flag}`
              : 'Comprobar Reto'}
          </button>
        </div>
      )}

      <div id="netcad-workspace" className="flex-1 flex min-h-0 overflow-hidden">
        <PaletteSidebar onQuickAdd={handleQuickAdd} />

        <FloorPlanCanvas
          elements={elements}
          trayPaths={trayPaths}
          cables={cables}
          selectedId={selectedId}
          selectedTrayId={selectedTrayId}
          selectedCableId={selectedCableId}
          toolMode={toolMode}
          activeCableCategory={activeCableCategory}
          activeTargetSpeed={activeTargetSpeed}
          snapEnabled={snapEnabled}
          pan={pan}
          zoom={zoom}
          onPanChange={setPan}
          onZoomChange={setZoom}
          onToolModeChange={setToolMode}
          onCableCategoryChange={setActiveCableCategory}
          onTargetSpeedChange={setActiveTargetSpeed}
          onToggleSnap={() => setSnapEnabled((s) => !s)}
          onSelectElement={(id) => {
            setSelectedId(id);
            if (id) {
              setSelectedTrayId(null);
              setSelectedCableId(null);
            }
          }}
          onSelectTray={(id) => {
            setSelectedTrayId(id);
            if (id) {
              setSelectedId(null);
              setSelectedCableId(null);
            }
          }}
          onSelectCable={(id) => {
            setSelectedCableId(id);
            if (id) {
              setSelectedId(null);
              setSelectedTrayId(null);
            }
          }}
          onDropNewElement={createElementAt}
          onMoveElement={handleMoveElement}
          onResizeElement={handleResizeElement}
          onCreateTrayPath={handleCreateTrayPath}
          onCreateCable={handleCreateCable}
          onResetView={() => {
            setPan(activeScenario.initialPan);
            setZoom(activeScenario.initialZoom);
          }}
          canUndo={historyPast.length > 0}
          canRedo={historyFuture.length > 0}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onBeginDragHistory={pushHistorySnapshot}
        />

        <PropertiesPanel
          elements={elements}
          trayPaths={trayPaths}
          cables={cables}
          selectedElement={selectedElement}
          selectedTray={selectedTray}
          selectedCable={selectedCable}
          onUpdateElement={handleUpdateElement}
          onDuplicateElement={handleDuplicateElement}
          onDeleteElement={handleDeleteElement}
          onUpdateTray={handleUpdateTray}
          onDeleteTray={handleDeleteTray}
          onUpdateCable={handleUpdateCable}
          onDeleteCable={handleDeleteCable}
          onRunAudit={handleRunAudit}
          onOpenBom={() => setBomOpen(true)}
          bomTotalEur={bomSummary.subtotalMaterial}
        />
      </div>

      <AuditModal
        report={auditReport}
        scenario={activeScenario}
        scenarioEval={scenarioEvaluation}
        onClose={() => setAuditReport(null)}
        onRerun={handleRunAudit}
        onInspectIssue={handleInspectIssue}
      />

      <BomModal
        open={bomOpen}
        summary={bomSummary}
        prices={unitPrices}
        onUpdatePrice={(key: BomPriceKey, val: number) =>
          setUnitPrices((prev) => ({ ...prev, [key]: val }))
        }
        onResetPrices={() => setUnitPrices(DEFAULT_UNIT_PRICES)}
        onClose={() => setBomOpen(false)}
      />

      <GuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />

      <ConfirmModal
        open={confirmState !== null}
        title={confirmState?.title ?? ''}
        message={confirmState?.message ?? ''}
        confirmLabel={confirmState?.confirmLabel}
        hideCancel={confirmState?.hideCancel}
        variant={confirmState?.variant}
        onConfirm={() => confirmState?.onConfirm()}
        onCancel={() => setConfirmState(null)}
      />
    </div>
  );
}
