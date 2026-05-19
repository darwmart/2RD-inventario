import { Sale, CompanyInfo, TitillaConfig } from '@/types';
import { generateReceiptHTML, generatePlainTextReceiptHTML } from './thermalPrint';

// Clave en localStorage para recordar si ya se mostró la guía de impresora
const PRINTER_GUIDE_KEY = 'pos_printer_guide_shown';

export function printPOSInvoice(sale: Sale, companyInfo: CompanyInfo, titillaConfig?: TitillaConfig) {
  const receiptData = titillaConfig ? {
    companyName:    companyInfo.name,
    companyAddress: titillaConfig.showAddress        ? companyInfo.address         : undefined,
    companyPhone:   titillaConfig.showPhone          ? companyInfo.phone           : undefined,
    companyNit:     titillaConfig.showNit            ? companyInfo.nit             : undefined,
    saleNumber:     sale.saleNumber,
    date:           new Date(sale.createdAt).toLocaleString('es-CO'),
    advisorName:    titillaConfig.showAdvisor        ? sale.advisorName            : '',
    customerName:   titillaConfig.showCustomer       ? sale.customerName           : undefined,
    items:          sale.items.map(i => ({ name: i.productName, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
    subtotal:       sale.subtotal,
    discount:       titillaConfig.showDiscount && sale.discount  ? sale.discount   : undefined,
    iva:            titillaConfig.showIva      && sale.ivaTotal  ? sale.ivaTotal   : undefined,
    total:          sale.total,
    paymentMethod:  titillaConfig.showPaymentMethod  ? sale.paymentMethod?.name   : undefined,
    footer:         titillaConfig.footerText,
    paperWidth:     titillaConfig.paperWidth,
    titleText:      titillaConfig.titleText,
    saleType:       sale.type,
    depositTotal:   sale.type === 'reserved' ? (sale.deposits ?? []).reduce((s, d) => s + d.amount, 0) : undefined,
    deposits:       sale.type === 'reserved' && sale.deposits?.length
      ? sale.deposits.map(d => ({
          amount: d.amount,
          method: d.method?.name,
          date:   new Date(d.createdAt).toLocaleDateString('es-CO'),
        }))
      : undefined,
  } : null;

  const isTextOnly = /generic.*text|text.*only/i.test(titillaConfig?.printerName ?? '');

  const html = receiptData
    ? isTextOnly
      ? generatePlainTextReceiptHTML(receiptData)
      : generateReceiptHTML(receiptData, { noPrint: true })
    : generatePOSHTML(sale, companyInfo);

  printWithHiddenIframe(html, titillaConfig?.printerName);
}

/**
 * Imprime usando un iframe oculto dentro de la página actual.
 * El navegador recuerda la impresora seleccionada por origen,
 * por lo que basta con seleccionar la impresora correcta una sola vez.
 */
function printWithHiddenIframe(html: string, printerName?: string): void {
  const guideShown = localStorage.getItem(PRINTER_GUIDE_KEY);
  if (!guideShown && printerName) {
    window.dispatchEvent(new CustomEvent('pos:printer-guide', { detail: { printerName } }));
    localStorage.setItem(PRINTER_GUIDE_KEY, '1');
  }

  const existing = document.getElementById('__pos_print_iframe__');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = '__pos_print_iframe__';
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;opacity:0;pointer-events:none;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? iframe.contentWindow?.document;
  if (!doc) { iframe.remove(); return; }

  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => iframe.remove(), 1500);
  }, 350);
}

/**
 * Genera el HTML completo para la impresión POS
 */
function generatePOSHTML(sale: Sale, companyInfo: CompanyInfo): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${sale.saleNumber}</title>
      <style>
        @page {
          size: 80mm auto;
          margin: 0mm;
        }

        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          width: 80mm;
          padding: 5mm;
          margin: 0 auto;
        }

        .center {
          text-align: center;
        }

        .bold {
          font-weight: bold;
        }

        .company-name {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 5px;
        }

        .company-info {
          font-size: 11px;
          line-height: 1.4;
        }

        .divider {
          border-top: 1px dashed #000;
          margin: 10px 0;
        }

        .row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 3px;
        }

        .item {
          margin-bottom: 8px;
        }

        .item-name {
          font-weight: bold;
          margin-bottom: 2px;
        }

        .item-details {
          display: flex;
          justify-content: space-between;
          padding-left: 10px;
          font-size: 11px;
        }

        .totals {
          margin-top: 10px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
          font-weight: bold;
          font-size: 14px;
          padding-top: 5px;
          border-top: 1px solid #000;
        }

        .footer {
          text-align: center;
          margin-top: 15px;
          font-size: 11px;
        }

        .footer-note {
          font-size: 10px;
          color: #666;
          margin-top: 5px;
        }

        .deposit-history {
          margin-top: 10px;
          font-size: 11px;
        }

        .deposit-item {
          padding-left: 10px;
          margin-bottom: 3px;
        }

        @media print {
          body {
            width: 80mm;
          }
        }
      </style>
    </head>
    <body>
      <!-- Encabezado -->
      <div class="center">
        <div class="company-name">${companyInfo.name}</div>
        <div class="company-info">
          NIT: ${companyInfo.nit}<br>
          ${companyInfo.address}<br>
          Tel: ${companyInfo.phone}
          ${companyInfo.email ? `<br>${companyInfo.email}` : ''}
        </div>
      </div>

      <div class="divider"></div>

      <!-- Información de la venta -->
      <div>
        <div class="row">
          <span>Factura:</span>
          <span class="bold">${sale.saleNumber}</span>
        </div>
        <div class="row">
          <span>Fecha:</span>
          <span>${new Date(sale.createdAt).toLocaleString('es-CO')}</span>
        </div>
        <div class="row">
          <span>Asesor:</span>
          <span>${sale.advisorName}</span>
        </div>
        <div class="row">
          <span>Tipo:</span>
          <span>${
            sale.type === 'sale' ? 'Venta' :
            sale.type === 'quote' ? 'Cotización' :
            'Separado'
          }</span>
        </div>
      </div>

      ${(sale.customerName || sale.customerDocument || sale.customerPhone) ? `
        <div class="divider"></div>
        <div>
          <div class="bold" style="margin-bottom: 5px;">CLIENTE</div>
          ${sale.customerName ? `
            <div class="row">
              <span>Nombre:</span>
              <span>${sale.customerName}</span>
            </div>
          ` : ''}
          ${sale.customerDocument ? `
            <div class="row">
              <span>Documento:</span>
              <span>${sale.customerDocument}</span>
            </div>
          ` : ''}
          ${sale.customerPhone ? `
            <div class="row">
              <span>Teléfono:</span>
              <span>${sale.customerPhone}</span>
            </div>
          ` : ''}
        </div>
      ` : ''}

      <div class="divider"></div>

      <!-- Productos -->
      <div>
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; font-size: 11px;">
          <span style="flex: 2;">Producto</span>
          <span style="flex: 1; text-align: center;">Cant</span>
          <span style="flex: 1; text-align: right;">Precio</span>
          <span style="flex: 1; text-align: right;">Total</span>
        </div>

        ${sale.items.map(item => `
          <div class="item">
            <div class="item-name">${item.productName}</div>
            <div class="item-details">
              <span style="flex: 2;"></span>
              <span style="flex: 1; text-align: center;">${item.quantity}</span>
              <span style="flex: 1; text-align: right;">$${item.unitPrice.toLocaleString('es-CO')}</span>
              <span style="flex: 1; text-align: right;">$${item.total.toLocaleString('es-CO')}</span>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="divider"></div>

      <!-- Totales -->
      <div class="totals">
        <div class="row">
          <span>Subtotal:</span>
          <span>$${sale.subtotal.toLocaleString('es-CO')}</span>
        </div>

        ${sale.ivaTotal && sale.ivaTotal > 0 ? `
          <div class="row" style="font-size: 11px; color: #333;">
            <span>IVA:</span>
            <span>$${sale.ivaTotal.toLocaleString('es-CO')}</span>
          </div>
        ` : ''}

        ${sale.discount && sale.discount > 0 ? `
          <div class="row" style="color: #cc0000;">
            <span>Descuento:</span>
            <span>-$${sale.discount.toLocaleString('es-CO')}</span>
          </div>
        ` : ''}

        <div class="total-row">
          <span>TOTAL A PAGAR:</span>
          <span>$${sale.total.toLocaleString('es-CO')}</span>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Información de pago -->
      <div>
        <div class="row">
          <span>Método de Pago:</span>
          <span class="bold">${sale.paymentMethod?.name}</span>
        </div>

        ${sale.type === 'reserved' ? `
          <div class="row" style="margin-top: 5px;">
            <span>Abono:</span>
            <span class="bold" style="color: #008800;">$${(sale.deposit || 0).toLocaleString('es-CO')}</span>
          </div>
          <div class="row">
            <span>Saldo Pendiente:</span>
            <span class="bold" style="color: #880000;">$${Math.max(0, sale.total - (sale.deposit || 0)).toLocaleString('es-CO')}</span>
          </div>

          ${sale.deposits && sale.deposits.length > 0 ? `
            <div class="deposit-history">
              <div class="bold" style="margin-bottom: 5px;">Historial de Abonos:</div>
              ${sale.deposits.map(deposit => `
                <div class="deposit-item">
                  <div class="row">
                    <span>${new Date(deposit.createdAt).toLocaleDateString('es-CO')}</span>
                    <span>$${deposit.amount.toLocaleString('es-CO')}</span>
                  </div>
                  <div style="font-size: 10px; color: #666;">${deposit.method?.name}</div>
                </div>
              `).join('')}
            </div>
          ` : ''}
        ` : ''}
      </div>

      <div class="divider"></div>

      <!-- Pie de página -->
      <div class="footer">
        <div>¡Gracias por su compra!</div>
        <div class="footer-note">
          ${sale.type === 'quote' ? 'Esta es una cotización, no es una factura de venta' : ''}
          ${sale.type === 'reserved' ? 'Producto reservado - Complete el pago para retirar' : ''}
          ${sale.type === 'sale' ? 'Documento no válido como factura' : ''}
        </div>
      </div>
    </body>
    </html>
  `;
}
