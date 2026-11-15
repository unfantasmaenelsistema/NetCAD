import {
  CABLE_SPECS,
  CableLink,
  CanvasElement,
  PIXELS_PER_METER,
  Point,
  TargetSpeed,
  TrayPath,
} from '../types/cabling';

export interface PolylineSegment {
  a: Point;
  b: Point;
  mid: Point;
  lengthPx: number;
  lengthM: number;
}

export interface TraySegment {
  a: Point;
  b: Point;
  trayId: string;
  trayCode: string;
  trayPath?: TrayPath;
  segIndex: number;
}

export interface TraySnapHit {
  point: Point;
  distPx: number;
  trayId: string;
  trayCode: string;
  trayPath?: TrayPath;
  segIndex: number;
}

export function constrainOrthogonal(anchor: Point, target: Point): Point {
  const dx = Math.abs(target.x - anchor.x);
  const dy = Math.abs(target.y - anchor.y);
  if (dx >= dy) {
    return { x: target.x, y: anchor.y };
  }
  return { x: anchor.x, y: target.y };
}

export function getAllTraySegments(
  trayPaths: TrayPath[],
  elements: CanvasElement[]
): TraySegment[] {
  const segments: TraySegment[] = [];

  for (const tp of trayPaths) {
    for (let i = 0; i < tp.points.length - 1; i++) {
      segments.push({
        a: tp.points[i],
        b: tp.points[i + 1],
        trayId: tp.id,
        trayCode: tp.code,
        trayPath: tp,
        segIndex: i,
      });
    }
  }

  for (const el of elements) {
    if (el.type !== 'tray') continue;
    const rad = (el.rotation * Math.PI) / 180;
    const hw = el.width / 2;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    segments.push({
      a: { x: Math.round(el.x - hw * cos), y: Math.round(el.y - hw * sin) },
      b: { x: Math.round(el.x + hw * cos), y: Math.round(el.y + hw * sin) },
      trayId: el.id,
      trayCode: el.code,
      segIndex: 0,
    });
  }

  return segments;
}

function closestPointOnSegment(p: Point, a: Point, b: Point): { point: Point; dist: number } {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const lenSq = vx * vx + vy * vy;
  if (lenSq === 0) {
    return { point: { ...a }, dist: Math.hypot(p.x - a.x, p.y - a.y) };
  }
  let t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = {
    x: Math.round(a.x + t * vx),
    y: Math.round(a.y + t * vy),
  };
  return {
    point: proj,
    dist: Math.hypot(p.x - proj.x, p.y - proj.y),
  };
}

export function findNearestTraySnap(
  cursor: Point,
  segments: TraySegment[],
  maxDistPx = 22
): TraySnapHit | null {
  let best: TraySnapHit | null = null;
  for (const seg of segments) {
    const { point, dist } = closestPointOnSegment(cursor, seg.a, seg.b);
    if (dist <= maxDistPx && (!best || dist < best.distPx)) {
      best = {
        point,
        distPx: dist,
        trayId: seg.trayId,
        trayCode: seg.trayCode,
        trayPath: seg.trayPath,
        segIndex: seg.segIndex,
      };
    }
  }
  return best;
}

export function getTrayIntermediateCorners(
  trayPath: TrayPath,
  fromSegIndex: number,
  toSegIndex: number
): Point[] {
  if (fromSegIndex === toSegIndex) return [];
  const corners: Point[] = [];
  if (fromSegIndex < toSegIndex) {
    for (let i = fromSegIndex + 1; i <= toSegIndex; i++) {
      corners.push({ ...trayPath.points[i] });
    }
  } else {
    for (let i = fromSegIndex; i >= toSegIndex + 1; i--) {
      corners.push({ ...trayPath.points[i] });
    }
  }
  return corners;
}

export function ensureOrthogonalPoints(rawPoints: Point[]): Point[] {
  if (rawPoints.length < 2) return rawPoints;
  const result: Point[] = [{ ...rawPoints[0] }];

  for (let i = 1; i < rawPoints.length; i++) {
    const prev = result[result.length - 1];
    const curr = rawPoints[i];
    if (prev.x === curr.x && prev.y === curr.y) continue;

    if (prev.x !== curr.x && prev.y !== curr.y) {
      const next = rawPoints[i + 1];
      const elbow =
        next && next.x === curr.x
          ? { x: curr.x, y: prev.y }
          : { x: prev.x, y: curr.y };
      if (elbow.x !== prev.x || elbow.y !== prev.y) {
        result.push(elbow);
      }
    }
    result.push({ ...curr });
  }
  return result;
}

export function getCablePolylinePoints(
  cable: CableLink,
  from: CanvasElement,
  to: CanvasElement
): Point[] {
  const raw = [
    { x: from.x, y: from.y },
    ...(cable.waypoints ?? []),
    { x: to.x, y: to.y },
  ];
  return ensureOrthogonalPoints(raw);
}

export function computePolylineMetrics(points: Point[]): {
  segments: PolylineSegment[];
  totalPx: number;
  totalM: number;
} {
  const segments: PolylineSegment[] = [];
  let totalPx = 0;

  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const lengthPx = Math.hypot(b.x - a.x, b.y - a.y);
    if (lengthPx < 1) continue;
    totalPx += lengthPx;
    segments.push({
      a,
      b,
      mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      lengthPx,
      lengthM: Number((lengthPx / PIXELS_PER_METER).toFixed(2)),
    });
  }

  return {
    segments,
    totalPx,
    totalM: Number((totalPx / PIXELS_PER_METER).toFixed(2)),
  };
}

export type AuditSeverity = 'error' | 'warning';

export interface AuditIssue {
  id: string;
  targetType: 'cable' | 'element' | 'topology';
  targetId?: string;
  targetLabel: string;
  severity: AuditSeverity;
  ruleCode: string;
  title: string;
  description: string;
  recommendation: string;
}

export interface CableTia568Evaluation {
  permanentLinkM: number;
  patchCordWaM: number;
  patchCordTrM: number;
  totalPatchCordM: number;
  channelM: number;
  targetSpeed: TargetSpeed;
  isPermanentLinkViolation: boolean;
  isChannelViolation: boolean;
  status: 'ok' | 'warning' | 'error';
  primaryWarningText: string | null;
  tooltipSummary: string;
  issues: AuditIssue[];
}

export function evaluateCableTia568(
  cable: CableLink,
  from: CanvasElement,
  to: CanvasElement
): CableTia568Evaluation {
  const pts = getCablePolylinePoints(cable, from, to);
  const { totalM: permanentLinkM } = computePolylineMetrics(pts);
  const patchCordWaM = Math.max(0, cable.patchCordWaM ?? 3);
  const patchCordTrM = Math.max(0, cable.patchCordTrM ?? 2);
  const totalPatchCordM = Number((patchCordWaM + patchCordTrM).toFixed(2));
  const channelM = Number((permanentLinkM + totalPatchCordM).toFixed(2));
  const targetSpeed: TargetSpeed =
    cable.targetSpeed ?? (cable.category === 'Cat5e' ? '1G' : '10G');

  const spec = CABLE_SPECS[cable.category] ?? CABLE_SPECS.Cat6;
  const label = `${from.code} → ${to.code}`;
  const issues: AuditIssue[] = [];

  let isPermanentLinkViolation = false;
  let isChannelViolation = false;

  if (!spec.isFiber) {
    // 1. Regla de los 90 metros (Enlace Permanente TIA/EIA-568)
    if (permanentLinkM > 90) {
      isPermanentLinkViolation = true;
      issues.push({
        id: `${cable.id}-perm-90`,
        targetType: 'cable',
        targetId: cable.id,
        targetLabel: label,
        severity: 'error',
        ruleCode: 'TIA-568-PERM-90',
        title: '¡Violación de Norma: Enlace Permanente > 90m!',
        description: `El cableado horizontal trazado mide ${permanentLinkM.toFixed(
          2
        )} m y excede el límite estricto de 90.00 m del Enlace Permanente.`,
        recommendation:
          'Instala un Rack IDF intermedio más cercano al área de trabajo o migra el enlace a Fibra Óptica OM3/OM4.',
      });
    }

    // 2. Cálculo de Canal Completo (<= 100 metros)
    if (channelM > 100) {
      isChannelViolation = true;
      issues.push({
        id: `${cable.id}-chan-100`,
        targetType: 'cable',
        targetId: cable.id,
        targetLabel: label,
        severity: 'error',
        ruleCode: 'TIA-568-CHAN-100',
        title: '¡Violación de Canal Completo (> 100m)!',
        description: `La suma del Enlace Permanente (${permanentLinkM.toFixed(
          2
        )} m) + Latiguillos (${totalPatchCordM.toFixed(
          2
        )} m) alcanza ${channelM.toFixed(2)} m, superando los 100.00 m permitidos.`,
        recommendation:
          'Reduce la longitud de los latiguillos (WA/TR) o acorta la ruta horizontal hacia el Rack.',
      });
    }

    // 2b. Límite combinado de latiguillos (> 10 m)
    if (totalPatchCordM > 10) {
      issues.push({
        id: `${cable.id}-patch-10`,
        targetType: 'cable',
        targetId: cable.id,
        targetLabel: label,
        severity: 'warning',
        ruleCode: 'TIA-568-PATCH-10',
        title: 'Latiguillos exceden 10 m combinados',
        description: `Los patch cords suman ${totalPatchCordM.toFixed(
          1
        )} m (WA: ${patchCordWaM}m + TR: ${patchCordTrM}m). TIA-568 recomienda máximo 10 m combinados para evitar pérdidas por inserción.`,
        recommendation:
          'Reubica la roseta RJ45 más cerca del puesto de trabajo y usa latiguillos de 1–5 m.',
      });
    }

    // 3. Error educativo: 10 Gbps sobre Cat5e
    if (cable.category === 'Cat5e' && targetSpeed === '10G') {
      issues.push({
        id: `${cable.id}-cat5e-10g`,
        targetType: 'cable',
        targetId: cable.id,
        targetLabel: label,
        severity: 'error',
        ruleCode: 'IEEE-802.3an-CAT5E',
        title: 'Cat5e no soporta 10GBASE-T',
        description:
          'Intentar transmitir a 10 Gbps sobre cableado Cat5e (100 MHz) infringe IEEE 802.3an por diafonía (NEXT/FEXT) y ancho de banda insuficiente.',
        recommendation:
          'Actualiza el medio a Cat6 (hasta 55 m), Cat6a (hasta 100 m) o reduce la velocidad objetivo a 1 Gbps.',
      });
    }

    // 4. Alerta de atenuación: Cat6 para 10 Gbps > 55 m
    if (
      cable.category === 'Cat6' &&
      targetSpeed === '10G' &&
      (permanentLinkM > 55 || channelM > 55)
    ) {
      issues.push({
        id: `${cable.id}-cat6-55m`,
        targetType: 'cable',
        targetId: cable.id,
        targetLabel: label,
        severity: 'warning',
        ruleCode: 'TIA-TSB155-CAT6-55',
        title: 'Alerta de atenuación: Cat6 a 10G > 55 m',
        description: `El enlace (${permanentLinkM.toFixed(
          1
        )} m perm. / ${channelM.toFixed(
          1
        )} m canal) supera los 55 m recomendados para 10GBASE-T sobre Cat6 por diafonía exógena (ANEXT) y atenuación a 500 MHz.`,
        recommendation:
          'Migra a cableado apantallado o UTP Cat6a (soporta 10 Gbps hasta 100 m completos) o limita el enlace a 1 Gbps.',
      });
    }
  } else {
    // Regla Fibra OM3/OM4
    if (channelM > 300) {
      issues.push({
        id: `${cable.id}-om3-300`,
        targetType: 'cable',
        targetId: cable.id,
        targetLabel: label,
        severity: 'warning',
        ruleCode: 'IEEE-10GBASE-SR',
        title: 'Distancia superior a límite estándar OM3 (300 m)',
        description: `El tendido mide ${channelM.toFixed(
          1
        )} m. A 10GBASE-SR la fibra OM3 alcanza 300 m (OM4 hasta 400 m).`,
        recommendation:
          'Verifica el presupuesto de pérdida óptica o emplea fibra OM4 / Monomodo OS2.',
      });
    }
  }

  const hasError = issues.some((i) => i.severity === 'error');
  const hasWarning = issues.some((i) => i.severity === 'warning');
  const status: 'ok' | 'warning' | 'error' = hasError
    ? 'error'
    : hasWarning
    ? 'warning'
    : 'ok';

  // Prioritized concise callout for canvas visualization
  const primaryIssue =
    issues.find((i) => i.ruleCode === 'TIA-568-PERM-90') ??
    issues.find((i) => i.severity === 'error') ??
    issues[0] ??
    null;

  return {
    permanentLinkM,
    patchCordWaM,
    patchCordTrM,
    totalPatchCordM,
    channelM,
    targetSpeed,
    isPermanentLinkViolation,
    isChannelViolation,
    status,
    primaryWarningText: primaryIssue ? primaryIssue.title : null,
    tooltipSummary: primaryIssue
      ? `${primaryIssue.title} — ${primaryIssue.description}`
      : `${spec.shortLabel} · ${targetSpeed === '10G' ? '10 Gbps' : '1 Gbps'} · Canal ${channelM.toFixed(
          1
        )} m conforme con TIA/EIA-568`,
    issues,
  };
}

export interface NetworkAuditReport {
  timestamp: string;
  totalCables: number;
  compliantCables: number;
  errorCount: number;
  warningCount: number;
  totalTrayMeters: number;
  totalCableMeters: number;
  issues: AuditIssue[];
}

export function runNetworkAudit(
  elements: CanvasElement[],
  trayPaths: TrayPath[],
  cables: CableLink[]
): NetworkAuditReport {
  const elementMap = new Map<string, CanvasElement>();
  elements.forEach((el) => elementMap.set(el.id, el));

  const issues: AuditIssue[] = [];
  let compliantCables = 0;
  let totalCableMeters = 0;

  for (const cable of cables) {
    const from = elementMap.get(cable.fromId);
    const to = elementMap.get(cable.toId);
    if (!from || !to) continue;

    const evalRes = evaluateCableTia568(cable, from, to);
    totalCableMeters += evalRes.permanentLinkM;
    if (evalRes.issues.length === 0) {
      compliantCables += 1;
    } else {
      issues.push(...evalRes.issues);
    }
  }

  // Enlaces horizontales con Punto de Consolidación (CP): TIA-568 limita a 90 m el enlace
  // permanente completo (TR → CP → TO), no cada tramo por separado, y pide el CP a ≥ 15 m del TR.
  const isRack = (e?: CanvasElement) => e?.type === 'rack_mdf' || e?.type === 'rack_idf';
  const permanentLengthOf = (c: CableLink): number => {
    const from = elementMap.get(c.fromId);
    const to = elementMap.get(c.toId);
    return from && to ? evaluateCableTia568(c, from, to).permanentLinkM : 0;
  };
  for (const cp of elements.filter((e) => e.type === 'consolidation_point')) {
    const copper = cables.filter(
      (c) => (c.fromId === cp.id || c.toId === cp.id) && !(CABLE_SPECS[c.category]?.isFiber)
    );
    const otherEnd = (c: CableLink) => elementMap.get(c.fromId === cp.id ? c.toId : c.fromId);
    const feeds = copper.filter((c) => isRack(otherEnd(c)));
    const drops = copper.filter((c) => {
      const end = otherEnd(c);
      return end && !isRack(end) && end.type !== 'consolidation_point';
    });

    for (const feed of feeds) {
      const rack = otherEnd(feed)!;
      const feedM = permanentLengthOf(feed);

      if (feedM < 15) {
        issues.push({
          id: `${feed.id}-cp-15`,
          targetType: 'cable',
          targetId: feed.id,
          targetLabel: `${rack.code} → ${cp.code}`,
          severity: 'warning',
          ruleCode: 'TIA-568-CP-15',
          title: 'Punto de Consolidación a menos de 15 m del cuarto de telecomunicaciones',
          description: `El tramo ${rack.code} → ${cp.code} mide ${feedM.toFixed(
            2
          )} m. TIA-568 sitúa el CP al menos a 15 m del TR para limitar la diafonía y las pérdidas de retorno de conexiones muy próximas.`,
          recommendation: `Aleja ${cp.code} del rack o termina los puestos directamente en el patch panel de ${rack.code}.`,
        });
      }

      for (const drop of drops) {
        const end = otherEnd(drop)!;
        const totalM = Number((feedM + permanentLengthOf(drop)).toFixed(2));
        if (totalM > 90) {
          issues.push({
            id: `${feed.id}-${drop.id}-cp-perm-90`,
            targetType: 'cable',
            targetId: drop.id,
            targetLabel: `${rack.code} → ${cp.code} → ${end.code}`,
            severity: 'error',
            ruleCode: 'TIA-568-PERM-90',
            title: '¡Violación de Norma: Enlace Permanente > 90m!',
            description: `El enlace horizontal ${rack.code} → ${cp.code} → ${end.code} suma ${totalM.toFixed(
              2
            )} m (${feedM.toFixed(2)} m hasta el CP + ${(totalM - feedM).toFixed(
              2
            )} m hasta la toma). El Punto de Consolidación forma parte del enlace permanente: el límite de 90 m se aplica al total.`,
            recommendation:
              'Acorta la ruta, acerca el CP a la zona de trabajo o instala un Rack IDF más próximo a los puestos.',
          });
        }
      }
    }
  }

  // Topological checks
  const racks = elements.filter(
    (e) => e.type === 'rack_mdf' || e.type === 'rack_idf'
  );
  if (racks.length === 0 && elements.length > 0) {
    issues.push({
      id: 'topo-no-rack',
      targetType: 'topology',
      targetLabel: 'Infraestructura Central',
      severity: 'error',
      ruleCode: 'TIA-569-NO-RACK',
      title: 'Sin Rack de Telecomunicaciones (MDF/IDF)',
      description:
        'El plano no contiene ningún Distribuidor Principal (MDF) o Intermedio (IDF) donde terminar el cableado horizontal.',
      recommendation:
        'Arrastra al menos un Rack MDF desde la paleta izquierda hacia el cuarto de equipos.',
    });
  }

  const pcs = elements.filter((e) => e.type === 'workstation');
  for (const pc of pcs) {
    const hasLink = cables.some((c) => c.fromId === pc.id || c.toId === pc.id);
    if (!hasLink) {
      issues.push({
        id: `topo-unwired-${pc.id}`,
        targetType: 'element',
        targetId: pc.id,
        targetLabel: `${pc.code} (${pc.name})`,
        severity: 'warning',
        ruleCode: 'TOPO-UNWIRED-WA',
        title: 'Puesto de trabajo sin enlace de red',
        description: `La estación ${pc.code} no está conectada a ninguna roseta RJ45 ni distribuidor.`,
        recommendation:
          'Usa la herramienta Cablear (C) para enlazar este puesto a una toma RJ45 o Rack.',
      });
    }
  }

  const totalTrayMeters = trayPaths.reduce(
    (sum, tp) => sum + computePolylineMetrics(tp.points).totalM,
    0
  );

  return {
    timestamp: new Date().toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
    totalCables: cables.length,
    compliantCables,
    errorCount: issues.filter((i) => i.severity === 'error').length,
    warningCount: issues.filter((i) => i.severity === 'warning').length,
    totalTrayMeters: Number(totalTrayMeters.toFixed(2)),
    totalCableMeters: Number(totalCableMeters.toFixed(2)),
    issues,
  };
}
