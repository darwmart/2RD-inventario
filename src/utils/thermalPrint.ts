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
}

// ─── Generador de HTML para recibo ───────────────────────────
export function generateReceiptHTML(data: ReceiptData): string {
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
      body { width: ${mmWidth}; }
      @page { margin: 0; size: ${mmWidth} auto; }
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
  <div class="bold center">FACTURA DE VENTA</div>
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
  </table>

  <div class="separator"></div>

  <!-- Footer -->
  <div class="center" style="margin-top:4px">
    ${data.footer ?? '¡Gracias por su compra!'}
  </div>
  <div class="center" style="margin-top:8px;font-size:8px">
    ${new Date().toLocaleString('es-CO')}
  </div>

  <script>
    window.onload = function() {
      window.print();
      setTimeout(function() { window.close(); }, 500);
    };
  </script>
</body>
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
