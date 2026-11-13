import {
  CableLink,
  CanvasElement,
  INITIAL_CABLES,
  INITIAL_ELEMENTS,
  INITIAL_TRAY_PATHS,
  ScenarioId,
  TrayPath,
} from '../types/cabling';
import { BomSummary } from '../utils/bom';
import { NetworkAuditReport } from '../utils/pathing';

export interface ScenarioEvaluation {
  passed: boolean;
  flag: string | null;
  checklist: { label: string; ok: boolean }[];
}

export interface ScenarioDefinition {
  id: ScenarioId;
  shortTitle: string;
  title: string;
  difficulty: 'Libre' | 'Fácil' | 'CTF' | 'Avanzado CTF';
  objective: string;
  initialZoom: number;
  initialPan: { x: number; y: number };
  elements: CanvasElement[];
  trayPaths: TrayPath[];
  cables: CableLink[];
  evaluate?: (
    elements: CanvasElement[],
    cables: CableLink[],
    audit: NetworkAuditReport,
    bom: BomSummary
  ) => ScenarioEvaluation;
}

export const SCENARIOS: ScenarioDefinition[] = [
  {
    id: 'demo',
    shortTitle: 'Plano Libre (Demo)',
    title: 'Plano Base de Laboratorio',
    difficulty: 'Libre',
    objective:
      'Modo abierto para diseñar libremente topologías, canaletas y validar presupuestos BOM.',
    initialZoom: 1,
    initialPan: { x: 40, y: 40 },
    elements: INITIAL_ELEMENTS,
    trayPaths: INITIAL_TRAY_PATHS,
    cables: INITIAL_CABLES,
  },
  {
    id: 'easy_5pcs',
    shortTitle: 'Escenario 1 (Fácil): 5 PCs',
    title: 'Escenario 1 (Fácil) · Oficina 5 Puestos y Presupuesto',
    difficulty: 'Fácil',
    objective:
      'Conecta los 5 Puestos de Trabajo (PC-01 a PC-05) al Rack MDF-01 usando la canaleta central, sin errores TIA-568 y manteniendo la base imponible ≤ 1.000 €.',
    initialZoom: 0.95,
    initialPan: { x: 40, y: 30 },
    elements: [
      { id: 's1-w1', type: 'wall', code: 'MUR-01', name: 'Muro Norte', x: 440, y: 90, width: 680, height: 14, rotation: 0 },
      { id: 's1-w2', type: 'wall', code: 'MUR-02', name: 'Muro Sur', x: 440, y: 480, width: 680, height: 14, rotation: 0 },
      { id: 's1-w3', type: 'wall', code: 'MUR-03', name: 'Muro Oeste', x: 100, y: 285, width: 404, height: 14, rotation: 90 },
      { id: 's1-w4', type: 'wall', code: 'MUR-04', name: 'Muro Este', x: 780, y: 285, width: 404, height: 14, rotation: 90 },
      { id: 's1-w5', type: 'wall', code: 'MUR-05', name: 'Tabique Rack', x: 240, y: 185, width: 180, height: 12, rotation: 90 },
      {
        id: 's1-mdf',
        type: 'rack_mdf',
        code: 'MDF-01',
        name: 'Rack MDF Oficina',
        x: 170,
        y: 170,
        width: 68,
        height: 68,
        rotation: 0,
        ports: 48,
        rackUnits: 42,
      },
      {
        id: 's1-pc1',
        type: 'workstation',
        code: 'PC-01',
        name: 'Puesto 01',
        x: 340,
        y: 410,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
      {
        id: 's1-pc2',
        type: 'workstation',
        code: 'PC-02',
        name: 'Puesto 02',
        x: 440,
        y: 410,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
      {
        id: 's1-pc3',
        type: 'workstation',
        code: 'PC-03',
        name: 'Puesto 03',
        x: 540,
        y: 410,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
      {
        id: 's1-pc4',
        type: 'workstation',
        code: 'PC-04',
        name: 'Puesto 04',
        x: 640,
        y: 410,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
      {
        id: 's1-pc5',
        type: 'workstation',
        code: 'PC-05',
        name: 'Puesto 05',
        x: 710,
        y: 200,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
    ],
    trayPaths: [
      {
        id: 's1-tray',
        code: 'CAN-01',
        name: 'Canaleta Principal Oficina',
        widthPx: 20,
        points: [
          { x: 170, y: 260 },
          { x: 640, y: 260 },
        ],
      },
    ],
    cables: [],
    evaluate: (elements, cables, audit, bom) => {
      const pcs = elements.filter((e) => e.type === 'workstation');
      const connectedPcs = pcs.filter((pc) =>
        cables.some((c) => c.fromId === pc.id || c.toId === pc.id)
      ).length;
      const hasEnoughPcs = connectedPcs >= 5;
      const noErrors = audit.errorCount === 0 && audit.warningCount === 0;
      const underBudget = bom.subtotalMaterial <= 1000;
      const passed = hasEnoughPcs && noErrors && underBudget;
      return {
        passed,
        flag: passed ? 'CTF{5PC_BUDG3T_0K}' : null,
        checklist: [
          { label: `5 puestos conectados (${connectedPcs}/5)`, ok: hasEnoughPcs },
          { label: '0 fallos ni advertencias TIA-568', ok: noErrors },
          {
            label: `Presupuesto base ≤ 1.000 € (${bom.subtotalMaterial.toFixed(0)} €)`,
            ok: underBudget,
          },
        ],
      };
    },
  },
  {
    id: 'ctf_hidden_fault',
    shortTitle: 'Escenario 2 (CTF): Error Oculto',
    title: 'Escenario 2 (CTF) · Auditoría Forense de Cableado',
    difficulty: 'CTF',
    objective:
      'Este plano pre-dibujado esconde un enlace que supera los 90m por un desvío perimetral y un cuello de botella de categoría (Cat5e a 10 Gbps). Localiza y corrige ambos fallos para obtener la Flag.',
    initialZoom: 0.72,
    initialPan: { x: 40, y: 40 },
    elements: [
      { id: 's2-w1', type: 'wall', code: 'MUR-01', name: 'Muro Norte', x: 520, y: 120, width: 840, height: 14, rotation: 0 },
      { id: 's2-w2', type: 'wall', code: 'MUR-02', name: 'Muro Sur', x: 520, y: 520, width: 840, height: 14, rotation: 0 },
      { id: 's2-w3', type: 'wall', code: 'MUR-03', name: 'Muro Oeste', x: 100, y: 320, width: 414, height: 14, rotation: 90 },
      { id: 's2-w4', type: 'wall', code: 'MUR-04', name: 'Muro Este', x: 940, y: 320, width: 414, height: 14, rotation: 90 },
      {
        id: 's2-mdf',
        type: 'rack_mdf',
        code: 'MDF-01',
        name: 'Rack Principal ER',
        x: 180,
        y: 200,
        width: 68,
        height: 68,
        rotation: 0,
        ports: 48,
        rackUnits: 42,
      },
      {
        id: 's2-to1',
        type: 'outlet',
        code: 'TO-01',
        name: 'Roseta 01',
        x: 380,
        y: 340,
        width: 34,
        height: 34,
        rotation: 0,
        ports: 2,
      },
      {
        id: 's2-to2',
        type: 'outlet',
        code: 'TO-02',
        name: 'Roseta 02 (10G)',
        x: 560,
        y: 340,
        width: 34,
        height: 34,
        rotation: 0,
        ports: 2,
      },
      {
        id: 's2-to3',
        type: 'outlet',
        code: 'TO-03',
        name: 'Roseta 03',
        x: 780,
        y: 340,
        width: 34,
        height: 34,
        rotation: 0,
        ports: 2,
      },
      {
        id: 's2-pc1',
        type: 'workstation',
        code: 'PC-01',
        name: 'PC Administración',
        x: 380,
        y: 430,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
      {
        id: 's2-pc2',
        type: 'workstation',
        code: 'PC-02',
        name: 'PC Edición CAD 10G',
        x: 560,
        y: 430,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
      {
        id: 's2-pc3',
        type: 'workstation',
        code: 'PC-03',
        name: 'PC Servidor Local',
        x: 780,
        y: 430,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
    ],
    trayPaths: [
      {
        id: 's2-tray-main',
        code: 'CAN-01',
        name: 'Canaleta Central',
        widthPx: 20,
        points: [
          { x: 180, y: 280 },
          { x: 780, y: 280 },
        ],
      },
    ],
    cables: [
      {
        id: 's2-c1',
        fromId: 's2-mdf',
        toId: 's2-to1',
        category: 'Cat6',
        targetSpeed: '1G',
        patchCordWaM: 3,
        patchCordTrM: 2,
        waypoints: [{ x: 180, y: 280 }, { x: 380, y: 280 }],
        snappedToTrayIds: ['s2-tray-main'],
      },
      // Trap 1: Cat5e trying to carry 10 Gbps
      {
        id: 's2-c2',
        fromId: 's2-mdf',
        toId: 's2-to2',
        category: 'Cat5e',
        targetSpeed: '10G',
        patchCordWaM: 3,
        patchCordTrM: 2,
        waypoints: [{ x: 180, y: 280 }, { x: 560, y: 280 }],
        snappedToTrayIds: ['s2-tray-main'],
      },
      // Trap 2: Hidden 96m detour loop around perimeter (> 90m Permanent Link!)
      {
        id: 's2-c3',
        fromId: 's2-mdf',
        toId: 's2-to3',
        category: 'Cat6a',
        targetSpeed: '10G',
        patchCordWaM: 3,
        patchCordTrM: 2,
        waypoints: [
          { x: 180, y: 40 },
          { x: 1900, y: 40 },
          { x: 1900, y: 340 },
        ],
      },
      {
        id: 's2-p1',
        fromId: 's2-to1',
        toId: 's2-pc1',
        category: 'Cat6',
        targetSpeed: '1G',
        patchCordWaM: 2,
        patchCordTrM: 0,
        waypoints: [],
      },
      {
        id: 's2-p2',
        fromId: 's2-to2',
        toId: 's2-pc2',
        category: 'Cat6a',
        targetSpeed: '10G',
        patchCordWaM: 2,
        patchCordTrM: 0,
        waypoints: [],
      },
      {
        id: 's2-p3',
        fromId: 's2-to3',
        toId: 's2-pc3',
        category: 'Cat6a',
        targetSpeed: '10G',
        patchCordWaM: 2,
        patchCordTrM: 0,
        waypoints: [],
      },
    ],
    evaluate: (elements, cables, audit) => {
      const pcs = elements.filter((e) => e.type === 'workstation');
      const allPcsConnected =
        pcs.length >= 3 &&
        pcs.every((pc) =>
          cables.some((c) => c.fromId === pc.id || c.toId === pc.id)
        );
      const noErrors = audit.errorCount === 0;
      const noWarnings = audit.warningCount === 0;
      const passed = allPcsConnected && noErrors && noWarnings;
      return {
        passed,
        flag: passed ? 'CTF{TIA568_RUL3S}' : null,
        checklist: [
          { label: 'Corregir enlace > 90 m (Enlace Permanente)', ok: noErrors },
          { label: 'Resolver incompatibilidad Cat5e a 10 Gbps', ok: noErrors && noWarnings },
          { label: 'Todos los puestos operativos', ok: allPcsConnected },
        ],
      };
    },
  },
  {
    id: 'ctf_campus_idf',
    shortTitle: 'Escenario 3 (CTF): Backbone IDF',
    title: 'Escenario 3 (Avanzado CTF) · Ala Este con Rack IDF y Fibra',
    difficulty: 'Avanzado CTF',
    objective:
      'El puesto remoto PC-03 está a más de 100m del MDF-01. Instala un Rack IDF intermedio en el Ala Este, enlázalo al MDF-01 con Fibra Óptica OM3/OM4 y conecta los puestos remotos sin errores normativos.',
    initialZoom: 0.28,
    initialPan: { x: 40, y: 110 },
    elements: [
      { id: 's3-w1', type: 'wall', code: 'MUR-01', name: 'Fachada Norte', x: 2250, y: 80, width: 4300, height: 18, rotation: 0 },
      { id: 's3-w2', type: 'wall', code: 'MUR-02', name: 'Fachada Sur', x: 2250, y: 520, width: 4300, height: 18, rotation: 0 },
      { id: 's3-w3', type: 'wall', code: 'MUR-03', name: 'Muro Oeste', x: 100, y: 300, width: 458, height: 18, rotation: 90 },
      { id: 's3-w4', type: 'wall', code: 'MUR-04', name: 'Muro Este', x: 4400, y: 300, width: 458, height: 18, rotation: 90 },
      {
        id: 's3-mdf',
        type: 'rack_mdf',
        code: 'MDF-01',
        name: 'Rack MDF Central',
        x: 200,
        y: 220,
        width: 68,
        height: 68,
        rotation: 0,
        ports: 48,
        rackUnits: 42,
      },
      {
        id: 's3-pc1',
        type: 'workstation',
        code: 'PC-01',
        name: 'PC Ala Oeste 01',
        x: 520,
        y: 410,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
      {
        id: 's3-pc2',
        type: 'workstation',
        code: 'PC-02',
        name: 'PC Ala Oeste 02',
        x: 760,
        y: 410,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
      {
        id: 's3-pc3',
        type: 'workstation',
        code: 'PC-03',
        name: 'PC Ala Este 03',
        x: 4080,
        y: 410,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
      {
        id: 's3-pc4',
        type: 'workstation',
        code: 'PC-04',
        name: 'PC Ala Este 04',
        x: 4260,
        y: 410,
        width: 56,
        height: 46,
        rotation: 0,
        ports: 1,
      },
    ],
    trayPaths: [
      {
        id: 's3-tray',
        code: 'CAN-01',
        name: 'Galería Troncal Campus',
        widthPx: 24,
        points: [
          { x: 200, y: 280 },
          { x: 4260, y: 280 },
        ],
      },
    ],
    cables: [
      {
        id: 's3-c1',
        fromId: 's3-mdf',
        toId: 's3-pc1',
        category: 'Cat6',
        targetSpeed: '10G',
        patchCordWaM: 3,
        patchCordTrM: 2,
        waypoints: [{ x: 200, y: 280 }, { x: 520, y: 280 }],
        snappedToTrayIds: ['s3-tray'],
      },
      {
        id: 's3-c2',
        fromId: 's3-mdf',
        toId: 's3-pc2',
        category: 'Cat6',
        targetSpeed: '10G',
        patchCordWaM: 3,
        patchCordTrM: 2,
        waypoints: [{ x: 200, y: 280 }, { x: 760, y: 280 }],
        snappedToTrayIds: ['s3-tray'],
      },
      // Over-length horizontal copper run (> 100m!)
      {
        id: 's3-c3',
        fromId: 's3-mdf',
        toId: 's3-pc3',
        category: 'Cat6',
        targetSpeed: '10G',
        patchCordWaM: 3,
        patchCordTrM: 2,
        waypoints: [{ x: 200, y: 280 }, { x: 4080, y: 280 }],
        snappedToTrayIds: ['s3-tray'],
      },
    ],
    evaluate: (elements, cables, audit) => {
      const hasIdf = elements.some((e) => e.type === 'rack_idf');
      const hasFiberBackbone = cables.some((c) => c.category === 'OM3_OM4');
      const pcs = elements.filter((e) => e.type === 'workstation');
      const allPcsWired =
        pcs.length >= 4 &&
        pcs.every((pc) =>
          cables.some((c) => c.fromId === pc.id || c.toId === pc.id)
        );
      const noErrors = audit.errorCount === 0 && audit.warningCount === 0;
      const passed = hasIdf && hasFiberBackbone && allPcsWired && noErrors;
      return {
        passed,
        flag: passed ? 'CTF{IDF_B4CKB0N3_10G}' : null,
        checklist: [
          { label: 'Instalar un Rack IDF en Ala Este', ok: hasIdf },
          { label: 'Enlace troncal en Fibra Óptica (OM3/OM4)', ok: hasFiberBackbone },
          { label: 'Conectar todos los puestos (4/4)', ok: allPcsWired },
          { label: '0 fallos ni advertencias TIA-568', ok: noErrors },
        ],
      };
    },
  },
];

export function getScenarioById(id: ScenarioId): ScenarioDefinition {
  return SCENARIOS.find((s) => s.id === id) ?? SCENARIOS[0];
}
