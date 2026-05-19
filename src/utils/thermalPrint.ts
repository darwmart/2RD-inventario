// ─── Impresión Térmica ESC/POS ────────────────────────────────
// Compatible con impresoras de 58mm y 80mm vía WebUSB o ventana de impresión.
// Para WebUSB directo requiere Chrome + impresora ESC/POS compatible.
// El método printWindow funciona con cualquier impresora configurada en el SO.

export type PaperWidth = 58 | 80;

interface PrintItem {
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface DepositEntry {
  amount: number;
  method?: string;
  date: string;
}

interface ReceiptData {
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyNit?: string;
  saleNumber: string;
  date: string;
  advisorName: string;
  customerName?: string;
  items: PrintItem[];
  subtotal: number;
  discount?: number;
  iva?: number;
  total: number;
  paymentMethod?: string;
  footer?: string;
  paperWidth?: PaperWidth;
  titleText?: string;
  // Separados / layaway
  saleType?: 'sale' | 'quote' | 'reserved';
  depositTotal?: number;
  deposits?: DepositEntry[];
}

// ─── Generador de HTML para recibo ───────────────────────────
export function generateReceiptHTML(data: ReceiptData, opts?: { noPrint?: boolean }): string {
  const width = data.paperWidth ?? 80;
  const mmWidth = width === 58 ? '56mm' : '78mm';
  const colWidth = width === 58 ? '80px' : '100px';

  const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

  const itemsHTML = data.items.map(item => `
    <tr>
      <td style="padding:1px 0">${item.name}</td>
      <td style="text-align:center;width:30px">${item.quantity}</td>
      <td style="text-align:right;width:${colWidth}">${fmt(item.unitPrice)}</td>
      <td style="text-align:right;width:${colWidth}">${fmt(item.total)}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recibo ${data.saleNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Courier New', monospace;
      font-size: ${width === 58 ? '9px' : '10px'};
      width: ${mmWidth};
      padding: 4px;
      color: #000;
    }
    .center { text-align: center; }
    .bold { font-weight: bold; }
    .large { font-size: ${width === 58 ? '12px' : '14px'}; }
    .separator { border-top: 1px dashed #000; margin: 4px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { font-weight: bold; border-bottom: 1px dashed #000; padding: 2px 0; font-size: ${width === 58 ? '8px' : '9px'}; }
    .totals td { padding: 1px 0; }
    .grand-total { font-size: ${width === 58 ? '12px' : '13px'}; font-weight: bold; }
    @media print {
      body { width: ${mmWidth}; margin: 0; padding: 2px; }
      @page {
        margin: 0mm;
        size: ${mmWidth} auto;
      }
    }
  </style>
</head>
<body>
  <!-- Encabezado -->
  <div class="center bold large">${data.companyName}</div>
  ${data.companyAddress ? `<div class="center">${data.companyAddress}</div>` : ''}
  ${data.companyPhone ? `<div class="center">Tel: ${data.companyPhone}</div>` : ''}
  ${data.companyNit ? `<div class="center">NIT: ${data.companyNit}</div>` : ''}

  <div class="separator"></div>

  <!-- Info del documento -->
  <div class="bold center">${data.titleText ?? 'FACTURA DE VENTA'}</div>
  <div>No: <span class="bold">${data.saleNumber}</span></div>
  <div>Fecha: ${data.date}</div>
  <div>Asesor: ${data.advisorName}</div>
  ${data.customerName ? `<div>Cliente: ${data.customerName}</div>` : ''}

  <div class="separator"></div>

  <!-- Items -->
  <table>
    <thead>
      <tr>
        <th style="text-align:left">Descripción</th>
        <th style="text-align:center;width:30px">Cant</th>
        <th style="text-align:right;width:${colWidth}">Precio</th>
        <th style="text-align:right;width:${colWidth}">Total</th>
      </tr>
    </thead>
    <tbody>${itemsHTML}</tbody>
  </table>

  <div class="separator"></div>

  <!-- Totales -->
  <table class="totals">
    <tr>
      <td>Subtotal:</td>
      <td style="text-align:right">$ ${fmt(data.subtotal)}</td>
    </tr>
    ${data.discount ? `
    <tr>
      <td>Descuento:</td>
      <td style="text-align:right">- $ ${fmt(data.discount)}</td>
    </tr>` : ''}
    ${data.iva ? `
    <tr>
      <td>IVA:</td>
      <td style="text-align:right">$ ${fmt(data.iva)}</td>
    </tr>` : ''}
    <tr class="grand-total">
      <td>TOTAL:</td>
      <td style="text-align:right">$ ${fmt(data.total)}</td>
    </tr>
    ${data.paymentMethod ? `
    <tr>
      <td>Pago:</td>
      <td style="text-align:right">${data.paymentMethod}</td>
    </tr>` : ''}
    ${data.saleType === 'reserved' ? `
    <tr>
      <td>Abonado:</td>
      <td style="text-align:right">$ ${fmt(data.depositTotal ?? 0)}</td>
    </tr>
    <tr class="grand-total">
      <td>SALDO:</td>
      <td style="text-align:right">$ ${fmt(Math.max(0, data.total - (data.depositTotal ?? 0)))}</td>
    </tr>` : ''}
  </table>

  ${data.saleType === 'reserved' && data.deposits && data.deposits.length > 0 ? `
  <div class="separator"></div>
  <div class="bold" style="font-size:${width === 58 ? '8px' : '9px'}">Historial de abonos:</div>
  <table class="totals" style="font-size:${width === 58 ? '8px' : '9px'}">
    ${data.deposits.map(d => `
    <tr>
      <td>${d.date}${d.method ? ' · ' + d.method : ''}</td>
      <td style="text-align:right">$ ${fmt(d.amount)}</td>
    </tr>`).join('')}
  </table>` : ''}

  <div class="separator"></div>

  <!-- Footer -->
  <div class="center" style="margin-top:4px">
    ${data.footer ?? '¡Gracias por su compra!'}
  </div>
  <div class="center" style="margin-top:8px;font-size:8px">
    ${new Date().toLocaleString('es-CO')}
  </div>

  ${opts?.noPrint ? '' : `<script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>`}
</body>
</html>`;
}

// ─── Generador de texto plano para Generic / Text Only ───────
// Usa <pre> con columnas de ancho fijo. No depende de CSS layout.
export function generatePlainTextReceiptHTML(data: ReceiptData): string {
  const W = data.paperWidth === 58 ? 32 : 48;
  const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

  const ctr = (s: string) => {
    const pad = Math.max(0, Math.floor((W - s.length) / 2));
    return ' '.repeat(pad) + s;
  };

  const rjust = (left: string, right: string) => {
    const spaces = Math.max(1, W - left.length - right.length);
    return left + ' '.repeat(spaces) + right;
  };

  const wrap = (text: string, maxLen: number): string[] => {
    const words = text.split(' ');
    const result: string[] = [];
    let line = '';
    for (const w of words) {
      if (!w) continue;
      if ((line ? line + ' ' + w : w).length > maxLen) {
        if (line) result.push(line);
        line = w.length > maxLen ? w.substring(0, maxLen) : w;
      } else {
        line = line ? line + ' ' + w : w;
      }
    }
    if (line) result.push(line);
    return result.length ? result : [''];
  };

  const DIV  = '-'.repeat(W);
  const DIV2 = '='.repeat(W);
  const lines: string[] = [];

  // Encabezado
  lines.push(ctr(data.companyName));
  if (data.companyAddress) lines.push(ctr(data.companyAddress));
  if (data.companyPhone)   lines.push(ctr('Tel: ' + data.companyPhone));
  if (data.companyNit)     lines.push(ctr('NIT: ' + data.companyNit));
  lines.push(DIV2);

  // Info documento
  lines.push(ctr(data.titleText ?? 'FACTURA DE VENTA'));
  lines.push('No: ' + data.saleNumber);
  lines.push('Fecha: ' + data.date);
  if (data.advisorName) lines.push('Asesor: ' + data.advisorName);
  if (data.customerName) lines.push('Cliente: ' + data.customerName);
  lines.push(DIV);

  // Cabecera de ítems
  const descW = W - 14;           // reserva 4 cant + 10 total
  lines.push(
    'Desc'.padEnd(descW) +
    'Cant'.padStart(4) +
    'Total'.padStart(10)
  );
  lines.push(DIV);

  // Ítems
  for (const item of data.items) {
    const nameLines = wrap(item.name, descW);
    const totalStr = fmt(item.total).padStart(10);
    const qtyStr   = String(item.quantity).padStart(4);
    // Primera línea: nombre + cant + total
    lines.push(nameLines[0].padEnd(descW) + qtyStr + totalStr);
    // Líneas adicionales del nombre (si es largo)
    for (let i = 1; i < nameLines.length; i++) {
      lines.push('  ' + nameLines[i]);
    }
  }
  lines.push(DIV);

  // Totales
  lines.push(rjust('Subtotal:', '$ ' + fmt(data.subtotal)));
  if (data.discount) lines.push(rjust('Descuento:', '- $ ' + fmt(data.discount)));
  if (data.iva)      lines.push(rjust('IVA:', '$ ' + fmt(data.iva)));
  lines.push(rjust('TOTAL:', '$ ' + fmt(data.total)));
  if (data.paymentMethod) lines.push(rjust('Pago:', data.paymentMethod));

  // Separados: abono y saldo
  if (data.saleType === 'reserved') {
    const abonado  = data.depositTotal ?? 0;
    const saldo    = Math.max(0, data.total - abonado);
    lines.push(rjust('Abonado:', '$ ' + fmt(abonado)));
    lines.push(rjust('SALDO PENDIENTE:', '$ ' + fmt(saldo)));

    if (data.deposits && data.deposits.length > 0) {
      lines.push(DIV);
      lines.push('Historial de abonos:');
      for (const d of data.deposits) {
        const label = d.date + (d.method ? ' ' + d.method : '');
        lines.push(rjust(label, '$ ' + fmt(d.amount)));
      }
    }
  }

  lines.push(DIV2);

  // Footer con salto de línea correcto
  if (data.footer) {
    for (const l of wrap(data.footer, W)) lines.push(ctr(l));
  }

  // Avance de papel para que el pie de página salga completamente del cabezal
  for (let i = 0; i < 10; i++) lines.push('');

  const ptSize = data.paperWidth === 58 ? '8pt' : '9pt';
  const mmWidth = data.paperWidth === 58 ? '56mm' : '78mm';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Recibo ${data.saleNumber}</title>
  <style>
    * { margin: 0; padding: 0; }
    body { font-family: 'Courier New', monospace; font-size: ${ptSize}; }
    pre { white-space: pre; }
    @media print {
      @page { size: ${mmWidth} auto; margin: 2mm 1mm; }
      body { width: ${mmWidth}; }
    }
  </style>
</head>
<body><pre>${lines.join('\n')}</pre></body>
</html>`;
}

// ─── Imprimir via ventana del navegador ───────────────────────
export function printReceipt(data: ReceiptData): void {
  const html = generateReceiptHTML(data);
  const width = data.paperWidth ?? 80;
  const mmWidth = width === 58 ? 220 : 300;

  const win = window.open(
    '',
    '_blank',
    `width=${mmWidth},height=600,menubar=no,toolbar=no,status=no`,
  );
  if (!win) {
    // Fallback: abrir en iframe oculto
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    iframe.contentDocument?.write(html);
    iframe.contentDocument?.close();
    iframe.contentWindow?.print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
    return;
  }
  win.document.write(html);
  win.document.close();
}

// ─── Imprimir etiqueta de producto ───────────────────────────
interface LabelData {
  productName: string;
  price: number;
  barcode: string;
  reference?: string;
  paperWidth?: PaperWidth;
}

export function printProductLabel(data: LabelData): void {
  const fmt = (n: number) => n.toLocaleString('es-CO', { minimumFractionDigits: 0 });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; font-size: 9px; padding: 4px; }
    .name { font-size: 11px; font-weight: bold; margin-bottom: 2px; }
    .price { font-size: 16px; font-weight: bold; }
    .ref { font-size: 8px; color: #555; }
    #barcode-svg { width: 100%; height: auto; }
    @media print { @page { margin: 0; size: 50mm 30mm; } }
  </style>
</head>
<body>
  <div class="name">${data.productName}</div>
  ${data.reference ? `<div class="ref">Ref: ${data.reference}</div>` : ''}
  <div class="price">$ ${fmt(data.price)}</div>
  <svg id="barcode-svg"></svg>
  <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.12.3/dist/JsBarcode.all.min.js"></script>
  <script>
    JsBarcode("#barcode-svg", "${data.barcode}", {
      format: "CODE128",
      width: 1.5,
      height: 30,
      displayValue: true,
      fontSize: 8,
      margin: 2
    });
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=200,height=200');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
