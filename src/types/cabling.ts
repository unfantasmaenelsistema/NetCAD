export const PIXELS_PER_METER = 40; // 1 celda mayor (40 px) = 1.00 m
export const MINOR_GRID_PX = 10; // Subdivisión milimetrada (10 px) = 0.25 m

export type ElementCategory =
  | 'racks'
  | 'workstations'
  | 'distribution'
  | 'architecture';

export type ElementType =
  | 'rack_mdf'
  | 'rack_idf'
  | 'workstation'
  | 'outlet'
  | 'consolidation_point'
  | 'tray'
  | 'wall';

export type ToolMode = 'select' | 'tray_draw' | 'cable' | 'pan';

export type CableCategory = 'Cat5e' | 'Cat6' | 'Cat6a' | 'OM3_OM4';

export type TargetSpeed = '1G' | '10G';

export type ScenarioId =
  | 'demo'
  | 'easy_5pcs'
  | 'ctf_hidden_fault'
  | 'ctf_campus_idf';

export interface Point {
  x: number;
  y: number;
}

export interface CableSpec {
  id: CableCategory;
  label: string;
  shortLabel: string;
  bandwidth: string;
  maxRecommendedM: number;
  maxLimitM: number;
  stroke: string;
  badgeText: string;
  dashed?: boolean;
  isFiber?: boolean;
}

export const CABLE_SPECS: Record<CableCategory, CableSpec> = {
  Cat5e: {
    id: 'Cat5e',
    label: 'Cat5e (1 Gbps)',
    shortLabel: 'Cat5e',
    bandwidth: '1 Gbps · 100 MHz (No soporta 10GBASE-T)',
    maxRecommendedM: 90,
    maxLimitM: 100,
    stroke: '#16A34A',
    badgeText: '#15803D',
  },
  Cat6: {
    id: 'Cat6',
    label: 'Cat6 (10 Gbps hasta 55m)',
    shortLabel: 'Cat6',
    bandwidth: '10 Gbps ≤55m · 1 Gbps ≤100m',
    maxRecommendedM: 55,
    maxLimitM: 90,
    stroke: '#2563EB',
    badgeText: '#1D4ED8',
  },
  Cat6a: {
    id: 'Cat6a',
    label: 'Cat6a (10 Gbps hasta 100m)',
    shortLabel: 'Cat6a',
    bandwidth: '10 Gbps · 500 MHz',
    maxRecommendedM: 90,
    maxLimitM: 100,
    stroke: '#CA8A04',
    badgeText: '#A16207',
  },
  OM3_OM4: {
    id: 'OM3_OM4',
    label: 'Fibra Óptica (OM3/OM4)',
    shortLabel: 'Fibra OM3/OM4',
    bandwidth: '10/40/100 Gbps · Multimodo',
    maxRecommendedM: 300,
    maxLimitM: 400,
    stroke: '#06B6D4',
    badgeText: '#0E7490',
    dashed: true,
    isFiber: true,
  },
};

export interface PaletteItemDef {
  type: ElementType;
  category: ElementCategory;
  label: string;
  shortLabel: string;
  prefix: string;
  subtitle: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultPorts?: number;
  defaultRackUnits?: number;
  canCable: boolean;
  isResizable?: boolean;
  standardNote: string;
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  code: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  ports?: number;
  rackUnits?: number;
  notes?: string;
}

export interface TrayPath {
  id: string;
  code: string;
  name: string;
  points: Point[];
  widthPx: number;
}

export interface CableLink {
  id: string;
  fromId: string;
  toId: string;
  category: CableCategory;
  targetSpeed?: TargetSpeed;
  patchCordWaM?: number; // Latiguillo Área de Trabajo (m)
  patchCordTrM?: number; // Latiguillo Cuarto Telecomunicaciones (m)
  waypoints: Point[];
  snappedToTrayIds?: string[];
}

export const CATEGORY_LABELS: Record<ElementCategory, string> = {
  racks: 'Cuartos de Telecomunicaciones',
  workstations: 'Área de Trabajo (WA)',
  distribution: 'Canalización y Transición',
  architecture: 'Elementos de Planta',
};

export const PALETTE_ITEMS: PaletteItemDef[] = [
  {
    type: 'rack_mdf',
    category: 'racks',
    label: 'Rack MDF (Principal)',
    shortLabel: 'Rack MDF',
    prefix: 'MDF',
    subtitle: '42U · Cuarto de Equipos (ER)',
    defaultWidth: 68,
    defaultHeight: 68,
    defaultPorts: 48,
    defaultRackUnits: 42,
    canCable: true,
    standardNote:
      'Distribuidor Principal (Main Distribution Frame). Punto de acometida ISP y núcleo de conmutación según TIA/EIA-569.',
  },
  {
    type: 'rack_idf',
    category: 'racks',
    label: 'Rack IDF (Intermedio)',
    shortLabel: 'Rack IDF',
    prefix: 'IDF',
    subtitle: '24U · Cuarto Telecom (TR)',
    defaultWidth: 56,
    defaultHeight: 56,
    defaultPorts: 24,
    defaultRackUnits: 24,
    canCable: true,
    standardNote:
      'Distribuidor Intermedio de planta. Interconectado al MDF mediante enlace troncal (Backbone) en estrella jerárquica.',
  },
  {
    type: 'workstation',
    category: 'workstations',
    label: 'Puesto de Trabajo (PC)',
    shortLabel: 'Puesto PC',
    prefix: 'PC',
    subtitle: 'Estación Gigabit · Patch Cord',
    defaultWidth: 56,
    defaultHeight: 46,
    defaultPorts: 1,
    canCable: true,
    standardNote:
      'Equipo terminal en Área de Trabajo (WA). Conectado a la roseta RJ45 mediante latiguillo flexible de hasta 5 m (TIA-568).',
  },
  {
    type: 'outlet',
    category: 'workstations',
    label: 'Roseta / Toma RJ45',
    shortLabel: 'Roseta RJ45',
    prefix: 'TO',
    subtitle: 'Toma Doble · 2× RJ45 Cat6',
    defaultWidth: 34,
    defaultHeight: 34,
    defaultPorts: 2,
    canCable: true,
    standardNote:
      'Toma de Telecomunicaciones (TO). Terminación del cableado horizontal en pared o suelo técnico con conectorización T568A/B.',
  },
  {
    type: 'consolidation_point',
    category: 'distribution',
    label: 'Punto de Consolidación (CP)',
    shortLabel: 'Punto CP',
    prefix: 'CP',
    subtitle: 'Caja transición · 12 puertos',
    defaultWidth: 42,
    defaultHeight: 42,
    defaultPorts: 12,
    canCable: true,
    standardNote:
      'Punto de interconexión en oficinas abiertas modulares. Debe situarse al menos a 15 m del cuarto de telecomunicaciones (TR).',
  },
  {
    type: 'tray',
    category: 'distribution',
    label: 'Canaleta (Bloque)',
    shortLabel: 'Canaleta',
    prefix: 'CAN',
    subtitle: 'Tramo recto · Redimensionable',
    defaultWidth: 200,
    defaultHeight: 22,
    canCable: false,
    isResizable: true,
    standardNote:
      'Canalización horizontal para proteger mazos UTP/Fibra. Factor de llenado máximo recomendado: 40% inicial (50% final).',
  },
  {
    type: 'wall',
    category: 'architecture',
    label: 'Muro / Tabique',
    shortLabel: 'Muro',
    prefix: 'MUR',
    subtitle: 'Referencia estructural · Plano',
    defaultWidth: 240,
    defaultHeight: 14,
    canCable: false,
    isResizable: true,
    standardNote:
      'Elemento arquitectónico de planta para delimitar cuartos de telecomunicaciones (ER/TR), pasillos y áreas de trabajo.',
  },
];

export function getPaletteDef(type: ElementType): PaletteItemDef {
  return PALETTE_ITEMS.find((item) => item.type === type) ?? PALETTE_ITEMS[0];
}

export function pxToMeters(px: number): number {
  return Number((px / PIXELS_PER_METER).toFixed(2));
}

export function metersToPx(meters: number): number {
  return Math.round(meters * PIXELS_PER_METER);
}

export function snapValue(px: number, enabled: boolean): number {
  if (!enabled) return Math.round(px);
  return Math.round(px / MINOR_GRID_PX) * MINOR_GRID_PX;
}

export const INITIAL_ELEMENTS: CanvasElement[] = [
  {
    id: 'el-wall-top',
    type: 'wall',
    code: 'MUR-01',
    name: 'Muro Norte',
    x: 420,
    y: 100,
    width: 600,
    height: 14,
    rotation: 0,
  },
  {
    id: 'el-wall-bottom',
    type: 'wall',
    code: 'MUR-02',
    name: 'Muro Sur',
    x: 420,
    y: 480,
    width: 600,
    height: 14,
    rotation: 0,
  },
  {
    id: 'el-wall-left',
    type: 'wall',
    code: 'MUR-03',
    name: 'Muro Oeste',
    x: 120,
    y: 290,
    width: 394,
    height: 14,
    rotation: 90,
  },
  {
    id: 'el-wall-right',
    type: 'wall',
    code: 'MUR-04',
    name: 'Muro Este',
    x: 720,
    y: 290,
    width: 394,
    height: 14,
    rotation: 90,
  },
  {
    id: 'el-wall-er',
    type: 'wall',
    code: 'MUR-05',
    name: 'Tabique Cuarto ER',
    x: 270,
    y: 190,
    width: 170,
    height: 12,
    rotation: 90,
  },
  {
    id: 'el-mdf-01',
    type: 'rack_mdf',
    code: 'MDF-01',
    name: 'Rack MDF Principal',
    x: 190,
    y: 170,
    width: 68,
    height: 68,
    rotation: 0,
    ports: 48,
    rackUnits: 42,
    notes: 'Cabecera de red corporativa · Switch Core + Patch Panel Cat6',
  },
  {
    id: 'el-cp-01',
    type: 'consolidation_point',
    code: 'CP-01',
    name: 'Punto Consolidación Zona A',
    x: 460,
    y: 240,
    width: 42,
    height: 42,
    rotation: 0,
    ports: 12,
  },
  {
    id: 'el-to-01',
    type: 'outlet',
    code: 'TO-01',
    name: 'Roseta Puesto 1',
    x: 460,
    y: 350,
    width: 34,
    height: 34,
    rotation: 0,
    ports: 2,
  },
  {
    id: 'el-pc-01',
    type: 'workstation',
    code: 'PC-01',
    name: 'Puesto Ingeniería 01',
    x: 460,
    y: 410,
    width: 56,
    height: 46,
    rotation: 0,
    ports: 1,
  },
  {
    id: 'el-pc-02',
    type: 'workstation',
    code: 'PC-02',
    name: 'Puesto Ingeniería 02',
    x: 610,
    y: 410,
    width: 56,
    height: 46,
    rotation: 0,
    ports: 1,
  },
];

export const INITIAL_TRAY_PATHS: TrayPath[] = [
  {
    id: 'tray-01',
    code: 'CAN-01',
    name: 'Canaleta Troncal Pasillo',
    widthPx: 20,
    points: [
      { x: 190, y: 240 },
      { x: 610, y: 240 },
      { x: 610, y: 340 },
    ],
  },
];

export const INITIAL_CABLES: CableLink[] = [
  {
    id: 'cab-01',
    fromId: 'el-mdf-01',
    toId: 'el-cp-01',
    category: 'Cat6a',
    targetSpeed: '10G',
    patchCordWaM: 3,
    patchCordTrM: 2,
    waypoints: [{ x: 190, y: 240 }],
    snappedToTrayIds: ['tray-01'],
  },
  {
    id: 'cab-02',
    fromId: 'el-cp-01',
    toId: 'el-to-01',
    category: 'Cat6',
    targetSpeed: '10G',
    patchCordWaM: 3,
    patchCordTrM: 2,
    waypoints: [],
  },
  {
    id: 'cab-03',
    fromId: 'el-to-01',
    toId: 'el-pc-01',
    category: 'Cat6',
    targetSpeed: '1G',
    patchCordWaM: 2,
    patchCordTrM: 0,
    waypoints: [],
  },
];
