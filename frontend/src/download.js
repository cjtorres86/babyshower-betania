const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

/** Descarga todas las dedicatorias en CSV, de la más reciente a la más antigua. */
export function downloadDedications(gifts) {
  const rows = gifts
    .filter((g) => g.reserved && g.dedication)
    .sort((a, b) => new Date(b.reservedAt || 0) - new Date(a.reservedAt || 0));

  const lines = [['Fecha', 'De', 'Regalo', 'Dedicatoria'].map(esc).join(',')];
  for (const g of rows) {
    const fecha = g.reservedAt ? new Date(g.reservedAt).toLocaleString('es-CL') : '';
    lines.push([fecha, g.reservedBy, g.name, g.dedication].map(esc).join(','));
  }

  // BOM para que Excel respete tildes y ñ
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'dedicatorias-betania.csv';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
  return rows.length;
}
