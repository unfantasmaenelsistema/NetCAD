import {
  CableCategory,
  CableLink,
  CanvasElement,
  pxToMeters,
  TrayPath,
} from '../types/cabling';
import { computePolylineMetrics, evaluateCableTia568 } from './pathing';

export interface UnitPriceCatalog {
  spoolCat5e305m: number;
  spoolCat6_305m: number;
  spoolCat6a_305m: number;
  fiberOm3PerMeter: number;
  outletRj45: number;
  patchPanel24: number;
  patchPanel48: number;
  trayPerMeter: number;
  patchCordUtp: number;
  patchCordFiber: number;
  consolidationPoint: number;
  rackMdf42u: number;
  rackIdf24u: number;
}

export const DEFAULT_UNIT_PRICES: UnitPriceCatalog = {
  spoolCat5e305m: 85,
  spoolCat6_305m: 120,
  spoolCat6a_305m: 185,
  fiberOm3PerMeter: 2.8,
  outletRj45: 4,
  patchPanel24: 45,
  patchPanel48: 82,
  trayPerMeter: 3,
  patchCordUtp: 3.5,
  patchCordFiber: 12,
  consolidationPoint: 35,
  rackMdf42u: 480,
  rackIdf24u: 260,
};

export type BomPriceKey = keyof UnitPriceCatalog;

export interface BomLineItem {
  id: string;
  priceKey: BomPriceKey;
  category: string;
  description: string;
  detail: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  subtotal: number;
}

export interface BomSummary {
  netCableMeters: number;
  cableMetersWithMargin: number;
  cableMetersByCategory: Record<CableCategory, { netM: number; withMarginM: number }>;
  outletJacksCount: number;
  connectedPortsCount: number;
  patchPanels24Count: number;
  patchPanels48Count: number;
  trayMeters: number;
  patchCordsUtpCount: number;
  patchCordsFiberCount: number;
  items: BomLineItem[];
  subtotalMaterial: number;
  tax21: number;
  totalWithTax: number;
}

export function computeBom(
  elements: CanvasElement[],
  trayPaths: TrayPath[],
  cables: CableLink[],
  prices: UnitPriceCatalog = DEFAULT_UNIT_PRICES
): BomSummary {
  const elementMap = new Map<string, CanvasElement>();
  elements.forEach((e) => elementMap.set(e.id, e));

  const rawMetersByCat: Record<CableCategory, number> = {
    Cat5e: 0,
    Cat6: 0,
    Cat6a: 0,
    OM3_OM4: 0,
  };

  let patchCordsUtpCount = 0;
  let patchCordsFiberCount = 0;
  let rackTerminations = 0;

  for (const cab of cables) {
    const from = elementMap.get(cab.fromId);
    const to = elementMap.get(cab.toId);
    if (!from || !to) continue;

    const evalRes = evaluateCableTia568(cab, from, to);
    rawMetersByCat[cab.category] =
      (rawMetersByCat[cab.category] ?? 0) + evalRes.permanentLinkM;

    const cordsForLink =
      (evalRes.patchCordWaM > 0 ? 1 : 0) + (evalRes.patchCordTrM > 0 ? 1 : 0);

    if (cab.category === 'OM3_OM4') {
      patchCordsFiberCount += cordsForLink;
    } else {
      patchCordsUtpCount += cordsForLink;
    }

    const involvesRack =
      from.type === 'rack_mdf' ||
      from.type === 'rack_idf' ||
      to.type === 'rack_mdf' ||
      to.type === 'rack_idf';
    if (involvesRack) {
      rackTerminations += 1;
    }
  }

  const netCableMeters = Number(
    (
      rawMetersByCat.Cat5e +
      rawMetersByCat.Cat6 +
      rawMetersByCat.Cat6a +
      rawMetersByCat.OM3_OM4
    ).toFixed(2)
  );

  // Add 10% margin for waste, service loops, and vertical drops
  const withMargin = (m: number) => Number((m * 1.1).toFixed(2));
  const cableMetersByCategory: Record<
    CableCategory,
    { netM: number; withMarginM: number }
  > = {
    Cat5e: {
      netM: Number(rawMetersByCat.Cat5e.toFixed(2)),
      withMarginM: withMargin(rawMetersByCat.Cat5e),
    },
    Cat6: {
      netM: Number(rawMetersByCat.Cat6.toFixed(2)),
      withMarginM: withMargin(rawMetersByCat.Cat6),
    },
    Cat6a: {
      netM: Number(rawMetersByCat.Cat6a.toFixed(2)),
      withMarginM: withMargin(rawMetersByCat.Cat6a),
    },
    OM3_OM4: {
      netM: Number(rawMetersByCat.OM3_OM4.toFixed(2)),
      withMarginM: withMargin(rawMetersByCat.OM3_OM4),
    },
  };
  const cableMetersWithMargin = withMargin(netCableMeters);

  // Outlets / Rosetas RJ45 female jacks
  const outlets = elements.filter((e) => e.type === 'outlet');
  const outletJacksCount = outlets.reduce((sum, o) => sum + (o.ports ?? 2), 0);

  // Patch Panels (24p or 48p) sized by connected outlets / rack terminations
  const connectedPortsCount = Math.max(outletJacksCount, rackTerminations);
  let patchPanels48Count = 0;
  let patchPanels24Count = 0;
  if (connectedPortsCount > 0) {
    if (connectedPortsCount <= 24) {
      patchPanels24Count = 1;
    } else {
      patchPanels48Count = Math.floor(connectedPortsCount / 48);
      const rem = connectedPortsCount % 48;
      if (rem > 24) {
        patchPanels48Count += 1;
      } else if (rem > 0) {
        patchPanels24Count += 1;
      }
    }
  }

  // Tray meters (drawn TrayPaths + tray elements)
  const drawnTrayM = trayPaths.reduce(
    (sum, tp) => sum + computePolylineMetrics(tp.points).totalM,
    0
  );
  const blockTrayM = elements
    .filter((e) => e.type === 'tray')
    .reduce((sum, el) => sum + pxToMeters(el.width), 0);
  const trayMeters = Number((drawnTrayM + blockTrayM).toFixed(2));

  const mdfCount = elements.filter((e) => e.type === 'rack_mdf').length;
  const idfCount = elements.filter((e) => e.type === 'rack_idf').length;
  const cpCount = elements.filter((e) => e.type === 'consolidation_point').length;

  const items: BomLineItem[] = [];

  const pushSpoolRow = (
    id: string,
    priceKey: BomPriceKey,
    label: string,
    catData: { netM: number; withMarginM: number },
    unitPrice: number
  ) => {
    if (catData.netM <= 0) return;
    const spools = Math.ceil(catData.withMarginM / 305);
    items.push({
      id,
      priceKey,
      category: 'Cableado',
      description: `Bobina ${label} (305 m)`,
      detail: `${catData.netM.toFixed(1)} m netos + 10% margen = ${catData.withMarginM.toFixed(
        1
      )} m req.`,
      quantity: spools,
      unit: 'bobina',
      unitPrice,
      subtotal: Number((spools * unitPrice).toFixed(2)),
    });
  };

  pushSpoolRow(
    'bom-cat5e',
    'spoolCat5e305m',
    'UTP Cat5e',
    cableMetersByCategory.Cat5e,
    prices.spoolCat5e305m
  );
  pushSpoolRow(
    'bom-cat6',
    'spoolCat6_305m',
    'UTP Cat6',
    cableMetersByCategory.Cat6,
    prices.spoolCat6_305m
  );
  pushSpoolRow(
    'bom-cat6a',
    'spoolCat6a_305m',
    'F/UTP Cat6a',
    cableMetersByCategory.Cat6a,
    prices.spoolCat6a_305m
  );

  if (cableMetersByCategory.OM3_OM4.netM > 0) {
    const qty = Math.ceil(cableMetersByCategory.OM3_OM4.withMarginM);
    items.push({
      id: 'bom-fiber',
      priceKey: 'fiberOm3PerMeter',
      category: 'Cableado',
      description: 'Cable Fibra Óptica OM3/OM4',
      detail: `${cableMetersByCategory.OM3_OM4.netM.toFixed(
        1
      )} m netos + 10% margen = ${cableMetersByCategory.OM3_OM4.withMarginM.toFixed(
        1
      )} m`,
      quantity: qty,
      unit: 'm',
      unitPrice: prices.fiberOm3PerMeter,
      subtotal: Number((qty * prices.fiberOm3PerMeter).toFixed(2)),
    });
  }

  // Always show key structured cabling hardware lines (even if 0 or >0 for transparency)
  items.push({
    id: 'bom-outlets',
    priceKey: 'outletRj45',
    category: 'Área de Trabajo',
    description: 'Toma / Roseta RJ45 Hembra',
    detail: `${outlets.length} caja(s) de roseta en plano`,
    quantity: outletJacksCount,
    unit: 'ud',
    unitPrice: prices.outletRj45,
    subtotal: Number((outletJacksCount * prices.outletRj45).toFixed(2)),
  });

  if (patchPanels48Count > 0) {
    items.push({
      id: 'bom-pp48',
      priceKey: 'patchPanel48',
      category: 'Rack / Electrónica',
      description: 'Patch Panel 48 Puertos RJ45',
      detail: `Dimensionado para ${connectedPortsCount} tomas/enlaces`,
      quantity: patchPanels48Count,
      unit: 'ud',
      unitPrice: prices.patchPanel48,
      subtotal: Number((patchPanels48Count * prices.patchPanel48).toFixed(2)),
    });
  }

  items.push({
    id: 'bom-pp24',
    priceKey: 'patchPanel24',
    category: 'Rack / Electrónica',
    description: 'Patch Panel 24 Puertos RJ45',
    detail: `Dimensionado para ${connectedPortsCount} tomas/enlaces`,
    quantity: patchPanels24Count,
    unit: 'ud',
    unitPrice: prices.patchPanel24,
    subtotal: Number((patchPanels24Count * prices.patchPanel24).toFixed(2)),
  });

  items.push({
    id: 'bom-tray',
    priceKey: 'trayPerMeter',
    category: 'Canalización',
    description: 'Canaleta / Bandeja Portacables',
    detail: `Suma de tramos trazados en planta`,
    quantity: Math.ceil(trayMeters),
    unit: 'm',
    unitPrice: prices.trayPerMeter,
    subtotal: Number((Math.ceil(trayMeters) * prices.trayPerMeter).toFixed(2)),
  });

  items.push({
    id: 'bom-patch-utp',
    priceKey: 'patchCordUtp',
    category: 'Latiguillos',
    description: 'Latiguillo Patch Cord UTP (WA/TR)',
    detail: 'Área de trabajo + Cuarto de telecomunicaciones',
    quantity: patchCordsUtpCount,
    unit: 'ud',
    unitPrice: prices.patchCordUtp,
    subtotal: Number((patchCordsUtpCount * prices.patchCordUtp).toFixed(2)),
  });

  if (patchCordsFiberCount > 0) {
    items.push({
      id: 'bom-patch-fiber',
      priceKey: 'patchCordFiber',
      category: 'Latiguillos',
      description: 'Latiguillo Fibra Óptica LC-LC OM3',
      detail: 'Conexión óptica en extremos',
      quantity: patchCordsFiberCount,
      unit: 'ud',
      unitPrice: prices.patchCordFiber,
      subtotal: Number((patchCordsFiberCount * prices.patchCordFiber).toFixed(2)),
    });
  }

  if (cpCount > 0) {
    items.push({
      id: 'bom-cp',
      priceKey: 'consolidationPoint',
      category: 'Canalización',
      description: 'Punto de Consolidación (CP 12p)',
      detail: `${cpCount} caja(s) de transición horizontal`,
      quantity: cpCount,
      unit: 'ud',
      unitPrice: prices.consolidationPoint,
      subtotal: Number((cpCount * prices.consolidationPoint).toFixed(2)),
    });
  }

  if (mdfCount > 0) {
    items.push({
      id: 'bom-mdf',
      priceKey: 'rackMdf42u',
      category: 'Rack / Electrónica',
      description: 'Armario Rack MDF 42U (19")',
      detail: 'Distribuidor principal de planta',
      quantity: mdfCount,
      unit: 'ud',
      unitPrice: prices.rackMdf42u,
      subtotal: Number((mdfCount * prices.rackMdf42u).toFixed(2)),
    });
  }

  if (idfCount > 0) {
    items.push({
      id: 'bom-idf',
      priceKey: 'rackIdf24u',
      category: 'Rack / Electrónica',
      description: 'Armario Rack IDF 24U (19")',
      detail: 'Distribuidor intermedio de zona',
      quantity: idfCount,
      unit: 'ud',
      unitPrice: prices.rackIdf24u,
      subtotal: Number((idfCount * prices.rackIdf24u).toFixed(2)),
    });
  }

  const subtotalMaterial = Number(
    items.reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)
  );
  const tax21 = Number((subtotalMaterial * 0.21).toFixed(2));
  const totalWithTax = Number((subtotalMaterial + tax21).toFixed(2));

  return {
    netCableMeters,
    cableMetersWithMargin,
    cableMetersByCategory,
    outletJacksCount,
    connectedPortsCount,
    patchPanels24Count,
    patchPanels48Count,
    trayMeters,
    patchCordsUtpCount,
    patchCordsFiberCount,
    items,
    subtotalMaterial,
    tax21,
    totalWithTax,
  };
}

export function generateBomCsv(summary: BomSummary): string {
  const escapeCsv = (val: string | number) => {
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headers = [
    'Categoria',
    'Partida',
    'Criterio / Detalle',
    'Cantidad',
    'Unidad',
    'Precio Unitario (EUR)',
    'Subtotal (EUR)',
  ];

  const rows = summary.items.map((item) => [
    item.category,
    item.description,
    item.detail,
    item.quantity,
    item.unit,
    item.unitPrice.toFixed(2),
    item.subtotal.toFixed(2),
  ]);

  rows.push([]);
  rows.push([
    'RESUMEN',
    'Metros netos de cable trazado',
    '',
    summary.netCableMeters.toFixed(2),
    'm',
    '',
    '',
  ]);
  rows.push([
    'RESUMEN',
    'Metros totales requeridos (+10% margen)',
    '',
    summary.cableMetersWithMargin.toFixed(2),
    'm',
    '',
    '',
  ]);
  rows.push([
    'TOTAL',
    'Base Imponible Material',
    '',
    '',
    '',
    '',
    summary.subtotalMaterial.toFixed(2),
  ]);
  rows.push([
    'TOTAL',
    'IVA (21%)',
    '',
    '',
    '',
    '',
    summary.tax21.toFixed(2),
  ]);
  rows.push([
    'TOTAL',
    'Total Presupuesto Proyecto',
    '',
    '',
    '',
    '',
    summary.totalWithTax.toFixed(2),
  ]);

  const lines = [headers, ...rows].map((row) =>
    row.map((cell) => escapeCsv(cell)).join(',')
  );

  // UTF-8 BOM for clean Excel opening
  return '\uFEFF' + lines.join('\r\n');
}
