import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Cable,
  Check,
  Crosshair,
  Grid,
  Hand,
  ImageDown,
  Maximize2,
  MousePointer2,
  Redo2,
  Route,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  CABLE_SPECS,
  CableCategory,
  CableLink,
  CanvasElement,
  ElementType,
  getPaletteDef,
  MINOR_GRID_PX,
  PIXELS_PER_METER,
  Point,
  pxToMeters,
  snapValue,
  TargetSpeed,
  ToolMode,
  TrayPath,
} from '../types/cabling';
import {
  computePolylineMetrics,
  constrainOrthogonal,
  ensureOrthogonalPoints,
  evaluateCableTia568,
  findNearestTraySnap,
  getAllTraySegments,
  getCablePolylinePoints,
  getTrayIntermediateCorners,
  TraySnapHit,
} from '../utils/pathing';
import { CanvasElementSymbol } from './CadSymbols';

interface FloorPlanCanvasProps {
  elements: CanvasElement[];
  trayPaths: TrayPath[];
  cables: CableLink[];
  selectedId: string | null;
  selectedTrayId: string | null;
  selectedCableId: string | null;
  toolMode: ToolMode;
  activeCableCategory: CableCategory;
  activeTargetSpeed: TargetSpeed;
  snapEnabled: boolean;
  pan: { x: number; y: number };
  zoom: number;
  onPanChange: (pan: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onToolModeChange: (mode: ToolMode) => void;
  onCableCategoryChange: (cat: CableCategory) => void;
  onTargetSpeedChange: (speed: TargetSpeed) => void;
  onToggleSnap: () => void;
  onSelectElement: (id: string | null) => void;
  onSelectTray: (id: string | null) => void;
  onSelectCable: (id: string | null) => void;
  onDropNewElement: (type: ElementType, x: number, y: number) => void;
  onMoveElement: (id: string, x: number, y: number) => void;
  onResizeElement: (id: string, width: number) => void;
  onCreateTrayPath: (points: Point[]) => void;
  onCreateCable: (
    fromId: string,
    toId: string,
    waypoints: Point[],
    snappedToTrayIds: string[]
  ) => void;
  onResetView: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBeginDragHistory: () => void;
}

type DragInteraction =
  | {
      kind: 'element';
      id: string;
      offsetX: number;
      offsetY: number;
    }
  | {
      kind: 'resize';
      id: string;
      rotation: number;
      startWorldX: number;
      startWorldY: number;
      initialWidth: number;
    }
  | {
      kind: 'pan';
      startClientX: number;
      startClientY: number;
      initialPanX: number;
      initialPanY: number;
    };

interface CableDraftState {
  fromId: string;
  waypoints: Point[];
  snappedTrayIds: string[];
  lastSnap: TraySnapHit | null;
}

export const FloorPlanCanvas: React.FC<FloorPlanCanvasProps> = ({
  elements,
  trayPaths,
  cables,
  selectedId,
  selectedTrayId,
  selectedCableId,
  toolMode,
  activeCableCategory,
  activeTargetSpeed,
  snapEnabled,
  pan,
  zoom,
  onPanChange,
  onZoomChange,
  onToolModeChange,
  onCableCategoryChange,
  onTargetSpeedChange,
  onToggleSnap,
  onSelectElement,
  onSelectTray,
  onSelectCable,
  onDropNewElement,
  onMoveElement,
  onResizeElement,
  onCreateTrayPath,
  onCreateCable,
  onResetView,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBeginDragHistory,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewportSize, setViewportSize] = useState({ width: 900, height: 600 });
  const [cursorRawWorld, setCursorRawWorld] = useState<Point | null>(null);
  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);
  const [dropPreview, setDropPreview] = useState<{
    type: ElementType;
    x: number;
    y: number;
  } | null>(null);
  const [dragState, setDragState] = useState<DragInteraction | null>(null);
  const [draftTrayPoints, setDraftTrayPoints] = useState<Point[]>([]);
  const [cableDraft, setCableDraft] = useState<CableDraftState | null>(null);
  const [hoveredCableId, setHoveredCableId] = useState<string | null>(null);
  const [spacePressed, setSpacePressed] = useState(false);

  // Measure canvas container for architectural rulers
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const elementMap = useMemo(() => {
    const map = new Map<string, CanvasElement>();
    elements.forEach((el) => map.set(el.id, el));
    return map;
  }, [elements]);

  const allTraySegments = useMemo(
    () => getAllTraySegments(trayPaths, elements),
    [trayPaths, elements]
  );

  const activeTraySnap = useMemo(() => {
    if (toolMode !== 'cable' || !cursorRawWorld || allTraySegments.length === 0) {
      return null;
    }
    return findNearestTraySnap(cursorRawWorld, allTraySegments, 24 / Math.max(zoom, 0.35));
  }, [allTraySegments, cursorRawWorld, toolMode, zoom]);

  const finishTrayDraft = useCallback(() => {
    if (draftTrayPoints.length >= 2) {
      onCreateTrayPath(draftTrayPoints);
    }
    setDraftTrayPoints([]);
  }, [draftTrayPoints, onCreateTrayPath]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return;
      }

      if (e.code === 'Space') {
        setSpacePressed(true);
      } else if (e.key === 'Escape') {
        setDraftTrayPoints([]);
        setCableDraft(null);
      } else if (e.key === 'Enter' && toolMode === 'tray_draw') {
        if (draftTrayPoints.length >= 2) {
          e.preventDefault();
          finishTrayDraft();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [draftTrayPoints.length, finishTrayDraft, toolMode]);

  useEffect(() => {
    if (toolMode !== 'cable') {
      setCableDraft(null);
    }
    if (toolMode !== 'tray_draw') {
      setDraftTrayPoints([]);
    }
  }, [toolMode]);

  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const sx = clientX - rect.left;
      const sy = clientY - rect.top;
      return {
        x: (sx - pan.x) / zoom,
        y: (sy - pan.y) / zoom,
      };
    },
    [pan.x, pan.y, zoom]
  );

  // Ruler ticks in meters (adaptive step at wide zoom-outs)
  const rulerTicks = useMemo(() => {
    const stepMeters = zoom < 0.3 ? 5 : zoom < 0.65 ? 2 : 1;
    const stepPx = stepMeters * PIXELS_PER_METER;

    const minWorldX = -pan.x / zoom;
    const maxWorldX = (viewportSize.width - pan.x) / zoom;
    const startX = Math.floor(minWorldX / stepPx) * stepPx;
    const xTicks: { screen: number; meters: number }[] = [];
    for (let wx = startX; wx <= maxWorldX; wx += stepPx) {
      xTicks.push({
        screen: wx * zoom + pan.x,
        meters: Math.round(wx / PIXELS_PER_METER),
      });
    }

    const minWorldY = -pan.y / zoom;
    const maxWorldY = (viewportSize.height - pan.y) / zoom;
    const startY = Math.floor(minWorldY / stepPx) * stepPx;
    const yTicks: { screen: number; meters: number }[] = [];
    for (let wy = startY; wy <= maxWorldY; wy += stepPx) {
      yTicks.push({
        screen: wy * zoom + pan.y,
        meters: Math.round(wy / PIXELS_PER_METER),
      });
    }

    return { xTicks, yTicks };
  }, [pan.x, pan.y, viewportSize.height, viewportSize.width, zoom]);

  // Drag & Drop from Left Palette
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const rawType =
      (e.dataTransfer.getData('application/x-netcad-element') as ElementType) ||
      (e.dataTransfer.getData('text/plain') as ElementType) ||
      'workstation';

    const world = clientToWorld(e.clientX, e.clientY);
    const sx = snapValue(world.x, snapEnabled);
    const sy = snapValue(world.y, snapEnabled);
    setCursorWorld({ x: sx, y: sy });
    setDropPreview({ type: rawType, x: sx, y: sy });
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setDropPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rawType = (e.dataTransfer.getData('application/x-netcad-element') ||
      e.dataTransfer.getData('text/plain')) as ElementType;
    setDropPreview(null);
    if (!rawType) return;

    const world = clientToWorld(e.clientX, e.clientY);
    const sx = snapValue(world.x, snapEnabled);
    const sy = snapValue(world.y, snapEnabled);
    onDropNewElement(rawType, sx, sy);
  };

  const liveTrayTarget = useMemo(() => {
    if (toolMode !== 'tray_draw' || !cursorWorld) return null;
    if (draftTrayPoints.length === 0) return cursorWorld;
    return constrainOrthogonal(
      draftTrayPoints[draftTrayPoints.length - 1],
      cursorWorld
    );
  }, [cursorWorld, draftTrayPoints, toolMode]);

  const cableStartEl = cableDraft ? elementMap.get(cableDraft.fromId) ?? null : null;

  const liveCablePreviewPoints = useMemo(() => {
    if (toolMode !== 'cable' || !cableDraft || !cableStartEl || !cursorWorld) {
      return null;
    }
    const anchor =
      cableDraft.waypoints.length > 0
        ? cableDraft.waypoints[cableDraft.waypoints.length - 1]
        : { x: cableStartEl.x, y: cableStartEl.y };

    let nextTarget: Point;
    let intermediateCorners: Point[] = [];

    if (activeTraySnap) {
      nextTarget = activeTraySnap.point;
      if (
        cableDraft.lastSnap?.trayPath &&
        activeTraySnap.trayPath &&
        cableDraft.lastSnap.trayId === activeTraySnap.trayId
      ) {
        intermediateCorners = getTrayIntermediateCorners(
          activeTraySnap.trayPath,
          cableDraft.lastSnap.segIndex,
          activeTraySnap.segIndex
        );
      }
    } else {
      nextTarget = constrainOrthogonal(anchor, cursorWorld);
    }

    return ensureOrthogonalPoints([
      { x: cableStartEl.x, y: cableStartEl.y },
      ...cableDraft.waypoints,
      ...intermediateCorners,
      nextTarget,
    ]);
  }, [activeTraySnap, cableDraft, cableStartEl, cursorWorld, toolMode]);

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const isMiddleClick = e.button === 1;
    if (toolMode === 'pan' || spacePressed || isMiddleClick) {
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragState({
        kind: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      });
      return;
    }

    const rawWorld = clientToWorld(e.clientX, e.clientY);
    const snapped = {
      x: snapValue(rawWorld.x, snapEnabled),
      y: snapValue(rawWorld.y, snapEnabled),
    };

    if (toolMode === 'tray_draw' && e.button === 0) {
      if (draftTrayPoints.length === 0) {
        setDraftTrayPoints([snapped]);
      } else {
        const last = draftTrayPoints[draftTrayPoints.length - 1];
        const nextPt = constrainOrthogonal(last, snapped);
        if (nextPt.x !== last.x || nextPt.y !== last.y) {
          setDraftTrayPoints((prev) => [...prev, nextPt]);
        }
      }
      return;
    }

    if (toolMode === 'cable' && cableDraft && e.button === 0) {
      const anchor =
        cableDraft.waypoints.length > 0
          ? cableDraft.waypoints[cableDraft.waypoints.length - 1]
          : cableStartEl
          ? { x: cableStartEl.x, y: cableStartEl.y }
          : snapped;

      const snapHit = findNearestTraySnap(
        rawWorld,
        allTraySegments,
        24 / Math.max(zoom, 0.35)
      );

      let addedPoints: Point[] = [];
      const nextSnappedIds = [...cableDraft.snappedTrayIds];

      if (snapHit) {
        if (!nextSnappedIds.includes(snapHit.trayId)) {
          nextSnappedIds.push(snapHit.trayId);
        }
        if (
          cableDraft.lastSnap?.trayPath &&
          snapHit.trayPath &&
          cableDraft.lastSnap.trayId === snapHit.trayId
        ) {
          addedPoints = [
            ...getTrayIntermediateCorners(
              snapHit.trayPath,
              cableDraft.lastSnap.segIndex,
              snapHit.segIndex
            ),
            snapHit.point,
          ];
        } else {
          if (anchor.x !== snapHit.point.x && anchor.y !== snapHit.point.y) {
            addedPoints = [{ x: snapHit.point.x, y: anchor.y }, snapHit.point];
          } else {
            addedPoints = [snapHit.point];
          }
        }
      } else {
        const nextPt = constrainOrthogonal(anchor, snapped);
        if (nextPt.x !== anchor.x || nextPt.y !== anchor.y) {
          addedPoints = [nextPt];
        }
      }

      if (addedPoints.length > 0) {
        setCableDraft({
          ...cableDraft,
          waypoints: [...cableDraft.waypoints, ...addedPoints],
          snappedTrayIds: nextSnappedIds,
          lastSnap: snapHit,
        });
      }
      return;
    }

    if (
      e.target === e.currentTarget ||
      (e.target as SVGElement | null)?.dataset?.bg === 'true'
    ) {
      onSelectElement(null);
      onSelectTray(null);
      onSelectCable(null);
    }
  };

  const handleSvgDoubleClick = () => {
    if (toolMode === 'tray_draw' && draftTrayPoints.length >= 2) {
      finishTrayDraft();
    }
  };

  const handleElementPointerDown = (
    e: React.PointerEvent<SVGGElement>,
    el: CanvasElement
  ) => {
    e.stopPropagation();

    if (toolMode === 'pan' || spacePressed || e.button === 1) {
      containerRef.current?.querySelector('svg')?.setPointerCapture(e.pointerId);
      setDragState({
        kind: 'pan',
        startClientX: e.clientX,
        startClientY: e.clientY,
        initialPanX: pan.x,
        initialPanY: pan.y,
      });
      return;
    }

    if (toolMode === 'tray_draw') {
      const rawWorld = clientToWorld(e.clientX, e.clientY);
      const snapped = {
        x: snapValue(rawWorld.x, snapEnabled),
        y: snapValue(rawWorld.y, snapEnabled),
      };
      if (draftTrayPoints.length === 0) {
        setDraftTrayPoints([snapped]);
      } else {
        const last = draftTrayPoints[draftTrayPoints.length - 1];
        const nextPt = constrainOrthogonal(last, snapped);
        if (nextPt.x !== last.x || nextPt.y !== last.y) {
          setDraftTrayPoints((prev) => [...prev, nextPt]);
        }
      }
      return;
    }

    if (toolMode === 'cable') {
      const def = getPaletteDef(el.type);
      if (!def.canCable) {
        if (el.type === 'tray' && cableDraft) {
          const rawWorld = clientToWorld(e.clientX, e.clientY);
          const snapHit = findNearestTraySnap(
            rawWorld,
            allTraySegments,
            40 / Math.max(zoom, 0.35)
          );
          if (snapHit) {
            const anchor =
              cableDraft.waypoints.length > 0
                ? cableDraft.waypoints[cableDraft.waypoints.length - 1]
                : cableStartEl
                ? { x: cableStartEl.x, y: cableStartEl.y }
                : snapHit.point;
            const elbow =
              anchor.x !== snapHit.point.x && anchor.y !== snapHit.point.y
                ? [{ x: snapHit.point.x, y: anchor.y }, snapHit.point]
                : [snapHit.point];
            setCableDraft({
              ...cableDraft,
              waypoints: [...cableDraft.waypoints, ...elbow],
              snappedTrayIds: cableDraft.snappedTrayIds.includes(snapHit.trayId)
                ? cableDraft.snappedTrayIds
                : [...cableDraft.snappedTrayIds, snapHit.trayId],
              lastSnap: snapHit,
            });
          }
        }
        return;
      }

      if (!cableDraft) {
        setCableDraft({
          fromId: el.id,
          waypoints: [],
          snappedTrayIds: [],
          lastSnap: null,
        });
        onSelectElement(el.id);
        onSelectTray(null);
        onSelectCable(null);
      } else if (cableDraft.fromId === el.id) {
        setCableDraft(null);
      } else {
        onCreateCable(
          cableDraft.fromId,
          el.id,
          cableDraft.waypoints,
          cableDraft.snappedTrayIds
        );
        setCableDraft(null);
      }
      return;
    }

    onSelectCable(null);
    onSelectTray(null);
    onSelectElement(el.id);
    onBeginDragHistory();
    const world = clientToWorld(e.clientX, e.clientY);
    e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
    setDragState({
      kind: 'element',
      id: el.id,
      offsetX: world.x - el.x,
      offsetY: world.y - el.y,
    });
  };

  const handleResizePointerDown = (
    e: React.PointerEvent<SVGCircleElement>,
    el: CanvasElement
  ) => {
    e.stopPropagation();
    onBeginDragHistory();
    const world = clientToWorld(e.clientX, e.clientY);
    e.currentTarget.ownerSVGElement?.setPointerCapture(e.pointerId);
    setDragState({
      kind: 'resize',
      id: el.id,
      rotation: el.rotation,
      startWorldX: world.x,
      startWorldY: world.y,
      initialWidth: el.width,
    });
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rawWorld = clientToWorld(e.clientX, e.clientY);
    setCursorRawWorld(rawWorld);
    setCursorWorld({
      x: snapValue(rawWorld.x, snapEnabled),
      y: snapValue(rawWorld.y, snapEnabled),
    });

    if (!dragState) return;

    if (dragState.kind === 'pan') {
      const dx = e.clientX - dragState.startClientX;
      const dy = e.clientY - dragState.startClientY;
      onPanChange({
        x: dragState.initialPanX + dx,
        y: dragState.initialPanY + dy,
      });
    } else if (dragState.kind === 'element') {
      const nx = snapValue(rawWorld.x - dragState.offsetX, snapEnabled);
      const ny = snapValue(rawWorld.y - dragState.offsetY, snapEnabled);
      onMoveElement(dragState.id, nx, ny);
    } else if (dragState.kind === 'resize') {
      const rad = (dragState.rotation * Math.PI) / 180;
      const dx = rawWorld.x - dragState.startWorldX;
      const dy = rawWorld.y - dragState.startWorldY;
      const projectedDelta = dx * Math.cos(rad) + dy * Math.sin(rad);
      const nextWidth = Math.max(
        40,
        snapValue(dragState.initialWidth + projectedDelta * 2, snapEnabled)
      );
      onResizeElement(dragState.id, nextWidth);
    }
  };

  const handleSvgPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragState) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if not captured
      }
      setDragState(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const nextZoom = Math.min(2.5, Math.max(0.15, Number((zoom * factor).toFixed(2))));

    const pointerX = e.clientX - rect.left;
    const pointerY = e.clientY - rect.top;
    const worldX = (pointerX - pan.x) / zoom;
    const worldY = (pointerY - pan.y) / zoom;

    onZoomChange(nextZoom);
    onPanChange({
      x: pointerX - worldX * nextZoom,
      y: pointerY - worldY * nextZoom,
    });
  };

  const sortedElements = useMemo(() => {
    const order: Record<ElementType, number> = {
      wall: 0,
      tray: 1,
      consolidation_point: 2,
      outlet: 3,
      rack_mdf: 4,
      rack_idf: 4,
      workstation: 5,
    };
    return [...elements].sort((a, b) => order[a.type] - order[b.type]);
  }, [elements]);

  const cursorStyle =
    dragState?.kind === 'pan' || toolMode === 'pan' || spacePressed
      ? 'cursor-grab active:cursor-grabbing'
      : toolMode === 'cable' || toolMode === 'tray_draw'
      ? 'cursor-crosshair'
      : 'cursor-default';

  const activeSpec = CABLE_SPECS[activeCableCategory];

  const draftTrayMetrics = useMemo(() => {
    if (draftTrayPoints.length === 0) return null;
    const previewPts =
      liveTrayTarget &&
      (liveTrayTarget.x !== draftTrayPoints[draftTrayPoints.length - 1].x ||
        liveTrayTarget.y !== draftTrayPoints[draftTrayPoints.length - 1].y)
        ? [...draftTrayPoints, liveTrayTarget]
        : draftTrayPoints;
    return computePolylineMetrics(previewPts);
  }, [draftTrayPoints, liveTrayTarget]);

  const liveCableMetrics = useMemo(() => {
    if (!liveCablePreviewPoints) return null;
    return computePolylineMetrics(liveCablePreviewPoints);
  }, [liveCablePreviewPoints]);

  // Hovered cable educational tooltip data
  const hoveredCableTooltip = useMemo(() => {
    if (!hoveredCableId) return null;
    const cab = cables.find((c) => c.id === hoveredCableId);
    if (!cab) return null;
    const from = elementMap.get(cab.fromId);
    const to = elementMap.get(cab.toId);
    if (!from || !to) return null;
    const evaluation = evaluateCableTia568(cab, from, to);
    return {
      code: `${from.code} → ${to.code}`,
      evaluation,
    };
  }, [cables, elementMap, hoveredCableId]);

  // Export clean vector blueprint SVG covering current floor plan
  const handleExportSvg = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

    let minX = 0;
    let minY = 0;
    let maxX = 1000;
    let maxY = 640;

    if (elements.length > 0 || trayPaths.length > 0) {
      minX = Infinity;
      minY = Infinity;
      maxX = -Infinity;
      maxY = -Infinity;
      elements.forEach((el) => {
        const halfW = el.width / 2 + 50;
        const halfH = el.height / 2 + 50;
        minX = Math.min(minX, el.x - halfW);
        minY = Math.min(minY, el.y - halfH);
        maxX = Math.max(maxX, el.x + halfW);
        maxY = Math.max(maxY, el.y + halfH);
      });
      trayPaths.forEach((tp) => {
        tp.points.forEach((pt) => {
          minX = Math.min(minX, pt.x - 50);
          minY = Math.min(minY, pt.y - 50);
          maxX = Math.max(maxX, pt.x + 50);
          maxY = Math.max(maxY, pt.y + 50);
        });
      });
    }

    const width = Math.max(400, Math.ceil(maxX - minX));
    const height = Math.max(300, Math.ceil(maxY - minY));
    clone.setAttribute('viewBox', `${Math.floor(minX)} ${Math.floor(minY)} ${width} ${height}`);
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(height));

    // Reset world transform inside clone so exported SVG is at 1:1 world scale
    const worldGroup = clone.querySelector('g[data-world-root="true"]');
    if (worldGroup) {
      worldGroup.removeAttribute('transform');
    }
    clone.querySelectorAll('rect[data-bg="true"]').forEach((bg) => {
      bg.setAttribute('x', String(Math.floor(minX)));
      bg.setAttribute('y', String(Math.floor(minY)));
      bg.setAttribute('width', String(width));
      bg.setAttribute('height', String(height));
    });
    clone.querySelectorAll('pattern').forEach((pat) => {
      pat.removeAttribute('patternTransform');
    });

    const serializer = new XMLSerializer();
    const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${serializer.serializeToString(clone)}`;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plano-cableado-estructurado.svg';
    a.click();
    URL.revokeObjectURL(url);
  }, [elements, trayPaths]);

  return (
    <main id="netcad-canvas" className="flex-1 relative flex flex-col bg-[#F3F5F8] overflow-hidden select-none">
      {/* Top CAD Toolbar */}
      <div id="netcad-toolbar" className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 px-3 py-2 flex items-center justify-between gap-2.5 z-10 shrink-0 overflow-x-auto">
        {/* Tool Mode Switcher */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-md border border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => onToolModeChange('select')}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              toolMode === 'select'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Seleccionar y mover elementos (Tecla V)"
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            <span>Seleccionar</span>
          </button>

          <button
            type="button"
            onClick={() => onToolModeChange('tray_draw')}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              toolMode === 'tray_draw'
                ? 'bg-amber-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Dibujar canaletas ortogonales 90° (Tecla T)"
          >
            <Route className="w-3.5 h-3.5" />
            <span>Canaleta 90°</span>
          </button>

          <button
            type="button"
            onClick={() => onToolModeChange('cable')}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              toolMode === 'cable'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Trazar cable UTP/Fibra con snap a canaletas (Tecla C)"
          >
            <Cable className="w-3.5 h-3.5" />
            <span>Cablear</span>
          </button>

          <button
            type="button"
            onClick={() => onToolModeChange('pan')}
            className={`px-2.5 py-1 text-xs font-medium rounded flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              toolMode === 'pan'
                ? 'bg-sky-600 text-white'
                : 'text-slate-300 hover:text-white hover:bg-slate-800'
            }`}
            title="Desplazar plano (Tecla H o Barra espaciadora)"
          >
            <Hand className="w-3.5 h-3.5" />
            <span>Desplazar</span>
          </button>
        </div>

        {/* Media + Speed Selectors */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 shrink-0">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0 border border-white/20"
              style={{ backgroundColor: activeSpec.stroke }}
              aria-hidden="true"
            />
            <label htmlFor="toolbar-cable-type" className="text-xs text-slate-400 whitespace-nowrap">
              Medio:
            </label>
            <select
              id="toolbar-cable-type"
              value={activeCableCategory}
              onChange={(e) => {
                onCableCategoryChange(e.target.value as CableCategory);
                if (toolMode === 'select') {
                  onToolModeChange('cable');
                }
              }}
              className="bg-transparent text-xs font-medium text-slate-100 focus:outline-none cursor-pointer pr-1"
            >
              <option value="Cat5e" className="bg-slate-900 text-slate-100">
                Cat5e (1 Gbps)
              </option>
              <option value="Cat6" className="bg-slate-900 text-slate-100">
                Cat6 (10 Gbps ≤55m)
              </option>
              <option value="Cat6a" className="bg-slate-900 text-slate-100">
                Cat6a (10 Gbps ≤100m)
              </option>
              <option value="OM3_OM4" className="bg-slate-900 text-slate-100">
                Fibra (OM3/OM4)
              </option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-md px-2 py-1 shrink-0">
            <label htmlFor="toolbar-speed" className="text-xs text-slate-400 whitespace-nowrap">
              Tasa:
            </label>
            <select
              id="toolbar-speed"
              value={activeTargetSpeed}
              onChange={(e) => onTargetSpeedChange(e.target.value as TargetSpeed)}
              className="bg-transparent text-xs font-mono font-medium text-slate-100 focus:outline-none cursor-pointer"
            >
              <option value="1G" className="bg-slate-900 text-slate-100">
                1 Gbps
              </option>
              <option value="10G" className="bg-slate-900 text-slate-100">
                10 Gbps
              </option>
            </select>
          </div>
        </div>

        {/* Active Drawing Controls */}
        {toolMode === 'tray_draw' && draftTrayPoints.length > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            {draftTrayPoints.length >= 2 && (
              <button
                type="button"
                onClick={finishTrayDraft}
                className="px-2.5 py-1 text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white rounded flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Terminar</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setDraftTrayPoints([])}
              className="px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </button>
          </div>
        )}

        {toolMode === 'cable' && cableDraft && (
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setCableDraft(null)}
              className="px-2 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancelar ruta</span>
            </button>
          </div>
        )}

        {/* Grid Snap, History, Zoom & Vector Export Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={onUndo}
              disabled={!canUndo}
              title="Deshacer (Ctrl+Z)"
              aria-label="Deshacer"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={onRedo}
              disabled={!canRedo}
              title="Rehacer (Ctrl+Y)"
              aria-label="Rehacer"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-35 disabled:cursor-not-allowed transition-colors cursor-pointer border-l border-slate-800"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToggleSnap}
            className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
              snapEnabled
                ? 'bg-slate-800 border-sky-500/60 text-sky-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Ajustar coordenadas a la cuadrícula (0.25 m)"
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Rejilla</span>
          </button>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-md overflow-hidden">
            <button
              type="button"
              onClick={() => onZoomChange(Math.max(0.15, Number((zoom - 0.15).toFixed(2))))}
              aria-label="Alejar plano"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 text-xs font-mono tabular-nums text-slate-200 min-w-[3.25rem] text-center">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => onZoomChange(Math.min(2.5, Number((zoom + 0.15).toFixed(2))))}
              aria-label="Acercar plano"
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onResetView}
            title="Encuadrar vista inicial (100%)"
            aria-label="Encuadrar vista inicial"
            className="p-1.5 bg-slate-950 border border-slate-800 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleExportSvg}
            title="Exportar plano vectorial en formato SVG"
            className="px-2 py-1 text-xs font-medium bg-slate-950 border border-slate-800 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-1 whitespace-nowrap cursor-pointer"
          >
            <ImageDown className="w-3.5 h-3.5 text-sky-400" />
            <span>SVG</span>
          </button>
        </div>
      </div>

      {/* Interactive Millimeter Grid Viewport with Rulers */}
      <div
        ref={containerRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onWheel={handleWheel}
        className={`flex-1 relative overflow-hidden ${cursorStyle}`}
      >
        {/* Top Architectural Meter Ruler */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-6 right-0 h-6 bg-slate-200/90 border-b border-slate-300 pointer-events-none z-10 overflow-hidden"
        >
          {rulerTicks.xTicks.map((tick) => (
            <div
              key={`rx-${tick.meters}`}
              style={{ transform: `translateX(${tick.screen - 24}px)` }}
              className="absolute top-0 bottom-0 flex flex-col justify-end"
            >
              <span className="text-[9px] font-mono tabular-nums text-slate-600 pl-1 pb-0.5 leading-none">
                {tick.meters}m
              </span>
              <div className="w-px h-2 bg-slate-400" />
            </div>
          ))}
        </div>

        {/* Left Architectural Meter Ruler */}
        <div
          aria-hidden="true"
          className="absolute top-6 left-0 bottom-0 w-6 bg-slate-200/90 border-r border-slate-300 pointer-events-none z-10 overflow-hidden"
        >
          {rulerTicks.yTicks.map((tick) => (
            <div
              key={`ry-${tick.meters}`}
              style={{ transform: `translateY(${tick.screen - 24}px)` }}
              className="absolute left-0 right-0 flex items-center justify-end"
            >
              <span className="text-[9px] font-mono tabular-nums text-slate-600 pr-1 leading-none">
                {tick.meters}
              </span>
              <div className="h-px w-1.5 bg-slate-400" />
            </div>
          ))}
        </div>

        {/* Ruler Corner Block */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-0 w-6 h-6 bg-slate-300 border-r border-b border-slate-400/70 z-20 flex items-center justify-center text-[9px] font-mono text-slate-700"
        >
          m
        </div>

        {/* Main Interactive SVG Floor Plan */}
        <svg
          ref={svgRef}
          className="w-full h-full block"
          onPointerDown={handleSvgPointerDown}
          onDoubleClick={handleSvgDoubleClick}
          onPointerMove={handleSvgPointerMove}
          onPointerUp={handleSvgPointerUp}
          onPointerCancel={handleSvgPointerUp}
        >
          <defs>
            <pattern
              id="grid-minor"
              width={MINOR_GRID_PX}
              height={MINOR_GRID_PX}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            >
              <path
                d={`M ${MINOR_GRID_PX} 0 L 0 0 0 ${MINOR_GRID_PX}`}
                fill="none"
                stroke="#E2E7EE"
                strokeWidth={0.75 / zoom}
              />
            </pattern>

            <pattern
              id="grid-major"
              width={PIXELS_PER_METER}
              height={PIXELS_PER_METER}
              patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}
            >
              <rect width={PIXELS_PER_METER} height={PIXELS_PER_METER} fill="url(#grid-minor)" />
              <path
                d={`M ${PIXELS_PER_METER} 0 L 0 0 0 ${PIXELS_PER_METER}`}
                fill="none"
                stroke="#C6D0DC"
                strokeWidth={1 / zoom}
              />
            </pattern>
          </defs>

          <rect data-bg="true" x="0" y="0" width="100%" height="100%" fill="#F3F5F8" />
          <rect
            data-bg="true"
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#grid-major)"
          />

          {/* World Coordinate Space */}
          <g data-world-root="true" transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {/* Origin Crosshair */}
            <line x1={-20} y1={0} x2={40} y2={0} stroke="#94A3B8" strokeWidth={1.2} />
            <line x1={0} y1={-20} x2={0} y2={40} stroke="#94A3B8" strokeWidth={1.2} />

            {/* Drawn Orthogonal Canaletas */}
            {trayPaths.map((tp) => {
              const isTraySelected = tp.id === selectedTrayId;
              const pointsStr = tp.points.map((p) => `${p.x},${p.y}`).join(' ');
              const metrics = computePolylineMetrics(tp.points);

              return (
                <g
                  key={tp.id}
                  onClick={(e) => {
                    if (toolMode === 'cable' || toolMode === 'tray_draw') return;
                    e.stopPropagation();
                    onSelectTray(tp.id);
                    onSelectElement(null);
                    onSelectCable(null);
                  }}
                  className={toolMode === 'select' ? 'cursor-pointer' : undefined}
                >
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={isTraySelected ? '#0284C7' : '#64748B'}
                    strokeWidth={tp.widthPx + 4}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#E2E8F0"
                    strokeWidth={tp.widthPx}
                    strokeLinecap="square"
                    strokeLinejoin="miter"
                  />
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                    strokeDasharray="6 6"
                    strokeLinejoin="miter"
                  />

                  {isTraySelected &&
                    tp.points.map((pt, idx) => (
                      <rect
                        key={idx}
                        x={pt.x - 4}
                        y={pt.y - 4}
                        width={8}
                        height={8}
                        fill="#FFFFFF"
                        stroke="#0284C7"
                        strokeWidth={1.5}
                      />
                    ))}

                  {metrics.segments.map((seg, idx) =>
                    seg.lengthM >= 0.75 ? (
                      <g key={idx} transform={`translate(${seg.mid.x}, ${seg.mid.y - 16})`}>
                        <rect
                          x={-24}
                          y={-8}
                          width={48}
                          height={14}
                          rx={2}
                          fill="#1E293B"
                          fillOpacity={0.85}
                        />
                        <text
                          x={0}
                          y={2}
                          textAnchor="middle"
                          fill="#F8FAFC"
                          fontSize="8"
                          fontWeight="500"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {seg.lengthM.toFixed(1)}m
                        </text>
                      </g>
                    ) : null
                  )}
                </g>
              );
            })}

            {/* Walls & Tray Blocks */}
            {sortedElements
              .filter((el) => el.type === 'wall' || el.type === 'tray')
              .map((el) => {
                const isSelected = el.id === selectedId;
                const def = getPaletteDef(el.type);
                const hw = el.width / 2;
                const hh = el.height / 2;

                return (
                  <g
                    key={el.id}
                    transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation})`}
                    onPointerDown={(e) => handleElementPointerDown(e, el)}
                    className={toolMode === 'select' ? 'cursor-move' : undefined}
                  >
                    <CanvasElementSymbol
                      element={el}
                      isSelected={isSelected}
                      isCableSource={false}
                    />
                    {isSelected && (
                      <g pointerEvents="none">
                        <rect
                          x={-hw - 5}
                          y={-hh - 5}
                          width={el.width + 10}
                          height={el.height + 10}
                          fill="none"
                          stroke="#0284C7"
                          strokeWidth={1.25}
                          strokeDasharray="4 2"
                        />
                      </g>
                    )}
                    {isSelected && def.isResizable && (
                      <circle
                        cx={hw + 5}
                        cy={0}
                        r={5}
                        fill="#0284C7"
                        stroke="#FFFFFF"
                        strokeWidth={1.5}
                        className="cursor-ew-resize"
                        onPointerDown={(e) => handleResizePointerDown(e, el)}
                      />
                    )}
                  </g>
                );
              })}

            {/* Structured Cable Links with TIA-568 Validation & Red Violation Blink */}
            {cables.map((cable) => {
              const from = elementMap.get(cable.fromId);
              const to = elementMap.get(cable.toId);
              if (!from || !to) return null;

              const polyPoints = getCablePolylinePoints(cable, from, to);
              const metrics = computePolylineMetrics(polyPoints);
              const evalRes = evaluateCableTia568(cable, from, to);
              const spec = CABLE_SPECS[cable.category] ?? CABLE_SPECS.Cat6;
              const isCableSelected = cable.id === selectedCableId;
              const pointsStr = polyPoints.map((p) => `${p.x},${p.y}`).join(' ');

              const isError = evalRes.status === 'error';
              const isWarning = evalRes.status === 'warning';
              const strokeColor = isError ? '#DC2626' : spec.stroke;

              // Anchor warning badge at longest segment midpoint
              const anchorSeg =
                metrics.segments.reduce(
                  (best, s) => (s.lengthPx > best.lengthPx ? s : best),
                  metrics.segments[0]
                ) ?? null;

              return (
                <g
                  key={cable.id}
                  onMouseEnter={() => setHoveredCableId(cable.id)}
                  onMouseLeave={() =>
                    setHoveredCableId((prev) => (prev === cable.id ? null : prev))
                  }
                  onClick={(e) => {
                    if (toolMode === 'tray_draw' || toolMode === 'cable') return;
                    e.stopPropagation();
                    onSelectCable(cable.id);
                    onSelectElement(null);
                    onSelectTray(null);
                  }}
                  className="cursor-pointer"
                >
                  <title>{evalRes.tooltipSummary}</title>

                  {/* Hit Target */}
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke="transparent"
                    strokeWidth={14}
                  />

                  {/* Selection Halo */}
                  {isCableSelected && (
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke="#0F172A"
                      strokeOpacity={0.25}
                      strokeWidth={7}
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Flashing Red Violation Halo for >90m Permanent Link or Critical Error */}
                  {isError && (
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke="#EF4444"
                      strokeWidth={7}
                      strokeOpacity={0.45}
                      strokeLinejoin="round"
                      className="animate-cable-violation"
                    />
                  )}

                  {/* Actual Cable Trace */}
                  <polyline
                    points={pointsStr}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={isCableSelected ? 3.2 : isError ? 3 : 2.4}
                    strokeDasharray={spec.dashed ? '7 3.5' : undefined}
                    strokeLinejoin="round"
                    className={
                      evalRes.isPermanentLinkViolation
                        ? 'animate-cable-violation'
                        : undefined
                    }
                  />

                  {/* Per-segment distance tags */}
                  {metrics.segments.map((seg, idx) =>
                    seg.lengthM >= 0.4 ? (
                      <g key={idx} transform={`translate(${seg.mid.x}, ${seg.mid.y})`}>
                        <rect
                          x={-23}
                          y={-8}
                          width={46}
                          height={15}
                          rx={3}
                          fill={isError ? '#FEF2F2' : '#FFFFFF'}
                          fillOpacity={0.96}
                          stroke={strokeColor}
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={2.5}
                          textAnchor="middle"
                          fill={isError ? '#B91C1C' : '#0F172A'}
                          fontSize="8.5"
                          fontWeight="600"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {seg.lengthM.toFixed(1)}m
                        </text>
                      </g>
                    ) : null
                  )}

                  {/* Explicit Normative Warning Banner on Canvas */}
                  {evalRes.primaryWarningText && anchorSeg && (
                    <g
                      transform={`translate(${anchorSeg.mid.x}, ${
                        anchorSeg.mid.y - 21
                      })`}
                      className={
                        evalRes.isPermanentLinkViolation
                          ? 'animate-cable-violation'
                          : undefined
                      }
                    >
                      <rect
                        x={-Math.min(145, evalRes.primaryWarningText.length * 3.1 + 16)}
                        y={-9}
                        width={Math.min(290, evalRes.primaryWarningText.length * 6.2 + 32)}
                        height={17}
                        rx={3}
                        fill={isError ? '#DC2626' : '#D97706'}
                        stroke="#FFFFFF"
                        strokeWidth={0.9}
                      />
                      <text
                        x={0}
                        y={2.5}
                        textAnchor="middle"
                        fill="#FFFFFF"
                        fontSize="8.5"
                        fontWeight="600"
                        fontFamily="DM Sans, sans-serif"
                      >
                        {isError ? '⚠ ' : '▲ '}
                        {evalRes.primaryWarningText}
                      </text>
                    </g>
                  )}

                  {/* Amber Warning Halo if non-critical attenuation warning */}
                  {isWarning && !isError && (
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke="#F59E0B"
                      strokeOpacity={0.28}
                      strokeWidth={6}
                      strokeLinejoin="round"
                      pointerEvents="none"
                    />
                  )}
                </g>
              );
            })}

            {/* Live Orthogonal Canaleta Draft Preview */}
            {toolMode === 'tray_draw' && draftTrayMetrics && draftTrayPoints.length > 0 && (
              <g pointerEvents="none">
                {(() => {
                  const previewPts = liveTrayTarget
                    ? [...draftTrayPoints, liveTrayTarget]
                    : draftTrayPoints;
                  const ptsStr = previewPts.map((p) => `${p.x},${p.y}`).join(' ');
                  return (
                    <>
                      <polyline
                        points={ptsStr}
                        fill="none"
                        stroke="#D97706"
                        strokeWidth={22}
                        strokeOpacity={0.22}
                        strokeLinejoin="miter"
                      />
                      <polyline
                        points={ptsStr}
                        fill="none"
                        stroke="#D97706"
                        strokeWidth={2.5}
                        strokeDasharray="6 3"
                        strokeLinejoin="miter"
                      />
                      {previewPts.map((pt, idx) => (
                        <circle
                          key={idx}
                          cx={pt.x}
                          cy={pt.y}
                          r={4}
                          fill="#FFFFFF"
                          stroke="#D97706"
                          strokeWidth={2}
                        />
                      ))}
                      {draftTrayMetrics.segments.map((seg, idx) =>
                        seg.lengthM >= 0.25 ? (
                          <g key={idx} transform={`translate(${seg.mid.x}, ${seg.mid.y - 14})`}>
                            <rect
                              x={-25}
                              y={-9}
                              width={50}
                              height={16}
                              rx={3}
                              fill="#0F172A"
                              stroke="#F59E0B"
                              strokeWidth={1}
                            />
                            <text
                              x={0}
                              y={2}
                              textAnchor="middle"
                              fill="#FDE68A"
                              fontSize="8.5"
                              fontWeight="600"
                              fontFamily="JetBrains Mono, monospace"
                            >
                              {seg.lengthM.toFixed(2)}m
                            </text>
                          </g>
                        ) : null
                      )}
                    </>
                  );
                })()}
              </g>
            )}

            {/* Live Routed Cable Draft Preview */}
            {toolMode === 'cable' &&
              liveCablePreviewPoints &&
              liveCableMetrics && (
                <g pointerEvents="none">
                  <polyline
                    points={liveCablePreviewPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                    fill="none"
                    stroke={
                      !activeSpec.isFiber && liveCableMetrics.totalM > 90
                        ? '#DC2626'
                        : activeSpec.stroke
                    }
                    strokeWidth={2.6}
                    strokeDasharray="6 3"
                    strokeLinejoin="round"
                  />
                  {liveCableMetrics.segments.map((seg, idx) =>
                    seg.lengthM >= 0.25 ? (
                      <g key={idx} transform={`translate(${seg.mid.x}, ${seg.mid.y})`}>
                        <rect
                          x={-24}
                          y={-8}
                          width={48}
                          height={15}
                          rx={3}
                          fill="#0F172A"
                          stroke={activeSpec.stroke}
                          strokeWidth={1}
                        />
                        <text
                          x={0}
                          y={2.5}
                          textAnchor="middle"
                          fill="#F8FAFC"
                          fontSize="8.5"
                          fontWeight="600"
                          fontFamily="JetBrains Mono, monospace"
                        >
                          {seg.lengthM.toFixed(1)}m
                        </text>
                      </g>
                    ) : null
                  )}
                </g>
              )}

            {/* Active Network Elements */}
            {sortedElements
              .filter((el) => el.type !== 'wall' && el.type !== 'tray')
              .map((el) => {
                const isSelected = el.id === selectedId;
                const isCableSource = el.id === cableDraft?.fromId;
                const def = getPaletteDef(el.type);
                const hw = el.width / 2;
                const hh = el.height / 2;

                return (
                  <g
                    key={el.id}
                    transform={`translate(${el.x}, ${el.y}) rotate(${el.rotation})`}
                    onPointerDown={(e) => handleElementPointerDown(e, el)}
                    className={
                      toolMode === 'cable' && def.canCable
                        ? 'cursor-crosshair'
                        : 'cursor-move'
                    }
                  >
                    <CanvasElementSymbol
                      element={el}
                      isSelected={isSelected}
                      isCableSource={isCableSource}
                    />

                    {isSelected && (
                      <g pointerEvents="none">
                        <rect
                          x={-hw - 5}
                          y={-hh - 5}
                          width={el.width + 10}
                          height={el.height + 10}
                          fill="none"
                          stroke="#0284C7"
                          strokeWidth={1.25}
                          strokeDasharray="4 2"
                        />
                        {[
                          [-hw - 5, -hh - 5],
                          [hw + 5, -hh - 5],
                          [-hw - 5, hh + 5],
                          [hw + 5, hh + 5],
                        ].map(([gx, gy], idx) => (
                          <rect
                            key={idx}
                            x={gx - 2.5}
                            y={gy - 2.5}
                            width={5}
                            height={5}
                            fill="#FFFFFF"
                            stroke="#0284C7"
                            strokeWidth={1.25}
                          />
                        ))}
                      </g>
                    )}
                  </g>
                );
              })}

            {/* Magnetic Snap Indicator */}
            {toolMode === 'cable' && activeTraySnap && (
              <g
                transform={`translate(${activeTraySnap.point.x}, ${activeTraySnap.point.y})`}
                pointerEvents="none"
              >
                <circle
                  r={9}
                  fill="#10B981"
                  fillOpacity={0.22}
                  stroke="#059669"
                  strokeWidth={1.75}
                />
                <circle r={3} fill="#059669" />
                <g transform="translate(0, -18)">
                  <rect x={-54} y={-9} width={108} height={16} rx={3} fill="#065F46" />
                  <text
                    x={0}
                    y={2}
                    textAnchor="middle"
                    fill="#ECFDF5"
                    fontSize="8.5"
                    fontWeight="600"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    Snap · {activeTraySnap.trayCode}
                  </text>
                </g>
              </g>
            )}

            {/* Drag-and-Drop Ghost Preview */}
            {dropPreview && (
              <g
                transform={`translate(${dropPreview.x}, ${dropPreview.y})`}
                pointerEvents="none"
                opacity={0.75}
              >
                {(() => {
                  const def = getPaletteDef(dropPreview.type);
                  return (
                    <>
                      <rect
                        x={-def.defaultWidth / 2}
                        y={-def.defaultHeight / 2}
                        width={def.defaultWidth}
                        height={def.defaultHeight}
                        rx={3}
                        fill="#0284C7"
                        fillOpacity={0.14}
                        stroke="#0284C7"
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                      />
                      <text
                        x={0}
                        y={-def.defaultHeight / 2 - 8}
                        textAnchor="middle"
                        fill="#0369A1"
                        fontSize="10"
                        fontWeight="600"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        {def.shortLabel} ({pxToMeters(dropPreview.x).toFixed(2)}m,{' '}
                        {pxToMeters(dropPreview.y).toFixed(2)}m)
                      </text>
                    </>
                  );
                })()}
              </g>
            )}
          </g>
        </svg>

        {/* Empty Canvas Helper Overlay */}
        {elements.length === 0 && trayPaths.length === 0 && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
            <div className="bg-white/95 border border-slate-300 rounded-lg px-6 py-5 max-w-md text-center shadow-sm">
              <h3 className="font-display font-semibold text-sm text-slate-900 mb-1">
                Plano de planta vacío
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Arrastra un <strong>Rack MDF/IDF</strong> y{' '}
                <strong>Puestos de Trabajo</strong> desde la izquierda, dibuja{' '}
                <strong>Canaletas 90°</strong> y traza los cables de red.
              </p>
            </div>
          </div>
        )}

        {/* Educational Hover Tooltip for Cables & TIA-568 Alerts */}
        {hoveredCableTooltip && hoveredCableTooltip.evaluation.issues.length > 0 && (
          <div className="absolute top-9 right-4 max-w-sm bg-slate-900/95 border border-slate-700 rounded-md p-3 shadow-lg pointer-events-none z-20 space-y-1.5">
            <div className="flex items-center justify-between gap-2 text-xs font-mono">
              <span className="text-slate-200 font-semibold">
                {hoveredCableTooltip.code}
              </span>
              <span className="text-slate-400">
                Canal: {hoveredCableTooltip.evaluation.channelM.toFixed(1)} m
              </span>
            </div>
            {hoveredCableTooltip.evaluation.issues.map((issue) => (
              <div key={issue.id} className="space-y-0.5 pt-1 border-t border-slate-800">
                <div
                  className={`text-xs font-semibold flex items-center gap-1.5 ${
                    issue.severity === 'error' ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {issue.severity === 'error' ? (
                    <AlertOctagon className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>{issue.title}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  {issue.description}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Bottom-Left Live Coordinate & Real-Time Path Distance HUD */}
        <div className="absolute bottom-3 left-9 flex items-center gap-2 pointer-events-none">
          <div className="bg-slate-900/92 text-slate-200 border border-slate-700/80 rounded-md px-3 py-1.5 flex items-center gap-2.5 text-xs font-mono tabular-nums shadow-sm">
            <Crosshair className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            {cursorWorld ? (
              <span>
                X: {pxToMeters(cursorWorld.x).toFixed(2)} m · Y:{' '}
                {pxToMeters(cursorWorld.y).toFixed(2)} m
              </span>
            ) : (
              <span className="text-slate-400">1 celda = 1.00 m</span>
            )}
          </div>

          {toolMode === 'tray_draw' && (
            <div className="bg-amber-950/95 text-amber-100 border border-amber-700/80 rounded-md px-3 py-1.5 text-xs font-mono tabular-nums shadow-sm">
              {draftTrayPoints.length === 0
                ? 'Canaleta 90°: Clic para iniciar tramo'
                : `Total canaleta: ${(draftTrayMetrics?.totalM ?? 0).toFixed(2)} m · Doble clic o Enter`}
            </div>
          )}

          {toolMode === 'cable' && (
            <div className="bg-slate-900/95 text-slate-100 border border-slate-700 rounded-md px-3 py-1.5 text-xs font-mono tabular-nums shadow-sm flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: activeSpec.stroke }}
              />
              {liveCableMetrics ? (
                <span
                  className={
                    !activeSpec.isFiber && liveCableMetrics.totalM > 90
                      ? 'text-red-400 font-semibold'
                      : undefined
                  }
                >
                  {activeSpec.shortLabel} ({activeTargetSpeed === '10G' ? '10G' : '1G'}):{' '}
                  {liveCableMetrics.totalM.toFixed(2)} m
                  {!activeSpec.isFiber && liveCableMetrics.totalM > 90
                    ? ' · ¡SUPERA 90m!'
                    : activeTraySnap
                    ? ` · Snap ${activeTraySnap.trayCode}`
                    : ''}
                </span>
              ) : (
                <span>
                  {activeSpec.shortLabel} ({activeTargetSpeed === '10G' ? '10G' : '1G'}): Clic
                  en origen
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};
