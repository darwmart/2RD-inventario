export const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-CO')}`;
export const fmtNum = (n: number) => Math.round(n).toLocaleString('es-CO');

export const txTypeLabel: Record<string, string> = {
  loan: 'Préstamo',
  return: 'Devolución',
  adjustment: 'Ajuste',
  exchange: 'Cambio',
};

export function printReport(title: string, tableHtml: string, summaryHtml = '') {
  const w = window.open('', '_blank', 'width=900,height=700');
  if (!w) return;
  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    body{font-family:Arial,sans-serif;font-size:12px;margin:20px;color:#111}
    h2{margin-bottom:4px;font-size:16px}
    .sub{color:#555;font-size:11px;margin-bottom:12px}
    .summary{display:flex;gap:24px;margin-bottom:14px}
    .scard{border:1px solid #ddd;border-radius:6px;padding:8px 16px;min-width:120px}
    .scard b{display:block;font-size:18px}
    .scard span{font-size:10px;color:#666}
    table{border-collapse:collapse;width:100%;font-size:11px}
    th{background:#1e293b;color:#fff;padding:6px 8px;text-align:left}
    tr:nth-child(even){background:#f8fafc}
    td{padding:5px 8px;border-bottom:1px solid #e2e8f0}
    @media print{button{display:none}}
  </style></head><body>
  <h2>${title}</h2>
  <p class="sub">Generado el ${new Date().toLocaleString('es-CO')}</p>
  ${summaryHtml}
  ${tableHtml}
  <script>window.onload=()=>{window.print();}<\/script>
  </body></html>`);
  w.document.close();
}

export function inRange(date: Date | string, from: string, to: string) {
  const d = new Date(date).toISOString().slice(0, 10);
  if (from && d < from) return false;
  if (to && d > to) return false;
  return true;
}
