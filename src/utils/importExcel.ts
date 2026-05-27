import * as XLSX from 'xlsx';

// ─── TYPES ───────────────────────────────────────────────────────────────────

export type ProductImportRow = {
  reference: string;
  name: string;
  barcode: string;
  description: string;
  cost: number;
  suggestedPrice: number;
  discountPrice: number;
  wholesalePrice: number;
  currentPrice: number;
  stock: number;
  minStock: number;
  hasIva: boolean;
  categoryName: string;
  supplierCode: string;
};

export type PurchaseImportItem = {
  productRef: string;
  productName: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseImportInvoice = {
  supplierCode: string;
  supplierName: string;
  invoiceNumber: string;
  warehouse: string;
  tax: number;
  notes: string;
  items: PurchaseImportItem[];
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function toNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return val;
  // Support Colombian format: dots as thousands separators, comma as decimal
  const s = String(val).trim().replace(/\./g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function toStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  return String(val).trim();
}

function toBool(val: unknown): boolean {
  const s = toStr(val).toLowerCase();
  return s === 'si' || s === 'sí' || s === 'yes' || s === '1' || s === 'true';
}

function setColWidths(ws: XLSX.WorkSheet, widths: number[]) {
  ws['!cols'] = widths.map(wch => ({ wch }));
}

// ─── PRODUCTS TEMPLATE ───────────────────────────────────────────────────────

export function downloadProductsTemplate() {
  const headers = [
    'Referencia*', 'Nombre*', 'Codigo Barras', 'Descripcion',
    'Costo*', 'P.Sugerido*', 'P.Descuento', 'P.Mayorista', 'P.Venta*',
    'Stock', 'Stock Minimo', 'Tiene IVA (SI/NO)', 'Familia', 'Proveedor (codigo)',
  ];

  const sample = [
    ['REF001', 'Gaseosa 2L', '7702098010012', 'Gaseosa botella 2 litros',
      2500, 3500, 3200, 3000, 3500, 100, 10, 'NO', 'Bebidas', '1'],
    ['REF002', 'Agua 500ml', '7702098020001', 'Agua purificada 500ml',
      800, 1200, 1100, 1000, 1200, 200, 20, 'NO', 'Bebidas', '1'],
    ['REF003', 'Aceite 900ml', '7702098030001', 'Aceite vegetal 900ml',
      7000, 9800, 9500, 9000, 9800, 50, 5, 'SI', 'Cocina', '2'],
  ];

  const instructions = [
    ['INSTRUCCIONES DE IMPORTACION'],
    [''],
    ['Las columnas marcadas con * son obligatorias.'],
    [''],
    ['Referencia: Código único del artículo (ej: REF001)'],
    ['Nombre: Nombre del artículo'],
    ['Codigo Barras: Código EAN/UPC (opcional)'],
    ['Descripcion: Descripción detallada (opcional)'],
    ['Costo: Precio de costo sin IVA'],
    ['P.Sugerido: Precio de venta sugerido'],
    ['P.Descuento: Precio con descuento (0 = igual que P.Sugerido)'],
    ['P.Mayorista: Precio por mayor (0 = igual que P.Sugerido)'],
    ['P.Venta: Precio de venta actual'],
    ['Stock: Cantidad inicial en inventario (default 0)'],
    ['Stock Minimo: Cantidad mínima para alerta de bajo stock (default 0)'],
    ['Tiene IVA: SI o NO'],
    ['Familia: Nombre de la categoría/familia (se crea si no existe)'],
    ['Proveedor (codigo): Código numérico del proveedor'],
    [''],
    ['IMPORTANTE: No modifique los encabezados de la primera fila.'],
    ['Los precios deben ser números enteros (sin puntos ni comas como miles).'],
    ['Los artículos con referencia duplicada serán omitidos.'],
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  setColWidths(wsData, [12, 25, 14, 25, 10, 10, 10, 10, 10, 8, 10, 16, 15, 16]);
  XLSX.utils.book_append_sheet(wb, wsData, 'Artículos');

  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  setColWidths(wsInst, [65]);
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  XLSX.writeFile(wb, 'plantilla_articulos.xlsx');
}

// ─── PURCHASES TEMPLATE ──────────────────────────────────────────────────────

export function downloadPurchasesTemplate() {
  const headers = [
    'N Factura Proveedor', 'Codigo Proveedor*', 'Nombre Proveedor',
    'Bodega', 'Ref Producto*', 'Nombre Producto', 'Cantidad*', 'Costo Unitario*',
    'IVA (solo primera linea)', 'Notas',
  ];

  const sample = [
    ['FAC-2024-001', '1', 'Distribuidora ABC', 'Principal', 'REF001', 'Gaseosa 2L', 10, 2500, 0, 'Pedido mensual'],
    ['FAC-2024-001', '1', '', '', 'REF002', 'Agua 500ml', 20, 800, 0, ''],
    ['FAC-2024-001', '1', '', '', 'REF003', 'Aceite 900ml', 5, 7000, 0, ''],
    ['', '2', 'Proveedor XYZ', '', 'REF004', 'Producto D', 8, 15000, 0, ''],
    ['', '2', '', '', 'REF005', 'Producto E', 12, 9000, 0, ''],
  ];

  const instructions = [
    ['INSTRUCCIONES DE IMPORTACION DE FACTURAS DE COMPRA'],
    [''],
    ['Las columnas marcadas con * son obligatorias.'],
    [''],
    ['N Factura Proveedor: Número de factura del proveedor (opcional)'],
    ['Codigo Proveedor: Código numérico del proveedor (obligatorio)'],
    ['Nombre Proveedor: Solo se necesita en la primera línea de cada factura'],
    ['Bodega: Bodega destino (opcional, solo primera línea)'],
    ['Ref Producto: Referencia del producto (debe existir en inventario)'],
    ['Nombre Producto: Nombre de respaldo si el producto no se encuentra'],
    ['Cantidad: Cantidad recibida'],
    ['Costo Unitario: Precio de costo unitario'],
    ['IVA: Valor del IVA para toda la factura (solo en la primera línea)'],
    ['Notas: Notas adicionales (solo primera línea)'],
    [''],
    ['AGRUPACION DE FACTURAS:'],
    ['Varias filas con el mismo Codigo Proveedor + N Factura forman UNA factura.'],
    ['Si N Factura está vacío, las filas consecutivas del mismo proveedor'],
    ['se agrupan en una sola factura.'],
    [''],
    ['IMPORTANTE: No modifique los encabezados de la primera fila.'],
    ['El proveedor debe existir previamente en el sistema.'],
  ];

  const wb = XLSX.utils.book_new();

  const wsData = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  setColWidths(wsData, [18, 16, 18, 12, 12, 18, 8, 14, 18, 20]);
  XLSX.utils.book_append_sheet(wb, wsData, 'Facturas');

  const wsInst = XLSX.utils.aoa_to_sheet(instructions);
  setColWidths(wsInst, [65]);
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instrucciones');

  XLSX.writeFile(wb, 'plantilla_facturas_compra.xlsx');
}

// ─── PARSER: PRODUCTS ────────────────────────────────────────────────────────

export function parseProductsFile(file: File): Promise<ProductImportRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];

        const dataRows = rows.slice(1).filter(r => r.some(c => toStr(c) !== ''));

        const result: ProductImportRow[] = dataRows
          .map(r => ({
            reference:      toStr(r[0]),
            name:           toStr(r[1]),
            barcode:        toStr(r[2]),
            description:    toStr(r[3]),
            cost:           toNum(r[4]),
            suggestedPrice: toNum(r[5]),
            discountPrice:  toNum(r[6]),
            wholesalePrice: toNum(r[7]),
            currentPrice:   toNum(r[8]),
            stock:          toNum(r[9]),
            minStock:       toNum(r[10]),
            hasIva:         toBool(r[11]),
            categoryName:   toStr(r[12]),
            supplierCode:   toStr(r[13]),
          }))
          .filter(r => r.reference && r.name);

        resolve(result);
      } catch (err: unknown) {
        reject(new Error('Error al leer el archivo: ' + (err instanceof Error ? err.message : String(err))));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}

// ─── PARSER: PURCHASES ───────────────────────────────────────────────────────

export function parsePurchasesFile(file: File): Promise<PurchaseImportInvoice[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '' }) as unknown[][];

        // Columns: 0=invoiceNum, 1=supplierCode, 2=supplierName, 3=warehouse,
        //          4=productRef, 5=productName, 6=qty, 7=unitCost, 8=tax, 9=notes
        const dataRows = rows.slice(1).filter(r => r.some(c => toStr(c) !== ''));

        const invoiceMap = new Map<string, PurchaseImportInvoice>();
        const invoiceOrder: string[] = [];

        for (const r of dataRows) {
          const supplierCode = toStr(r[1]);
          const invoiceNum = toStr(r[0]);
          if (!supplierCode) continue;

          // Group key: same supplier + same invoice number (or empty = consecutive rows)
          const key = `${supplierCode}||${invoiceNum}`;

          if (!invoiceMap.has(key)) {
            invoiceMap.set(key, {
              supplierCode,
              supplierName: toStr(r[2]),
              invoiceNumber: invoiceNum,
              warehouse: toStr(r[3]),
              tax: toNum(r[8]),
              notes: toStr(r[9]),
              items: [],
            });
            invoiceOrder.push(key);
          }

          const productRef = toStr(r[4]);
          const qty = toNum(r[6]);
          const unitCost = toNum(r[7]);
          if (productRef && qty > 0) {
            invoiceMap.get(key)!.items.push({
              productRef,
              productName: toStr(r[5]),
              quantity: qty,
              unitCost,
            });
          }
        }

        resolve(
          invoiceOrder
            .map(k => invoiceMap.get(k)!)
            .filter(inv => inv.items.length > 0),
        );
      } catch (err: unknown) {
        reject(new Error('Error al leer el archivo: ' + (err instanceof Error ? err.message : String(err))));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo'));
    reader.readAsArrayBuffer(file);
  });
}
