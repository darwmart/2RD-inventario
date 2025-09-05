import { Sale } from "@/types";

type POSInvoiceProps = {
  sale: Sale;
};

export default function POSInvoice({ sale }: POSInvoiceProps) {
  return (
    <div className="w-[320px] mx-auto bg-white p-3 text-sm font-mono border rounded shadow">
      {/* Encabezado empresa */}
      <div className="text-center mb-3">
        <h1 className="font-bold text-lg">MI TIENDA S.A.S</h1>
        <p>NIT: 123456789-0</p>
        <p>Cra 12 #34-56, Bogotá</p>
        <p>Tel: +57 310 000 0000</p>
      </div>

      {/* Info factura */}
      <div className="border-b border-dashed pb-2 mb-2">
        <p><span className="font-semibold">Factura POS:</span> {sale.saleNumber}</p>
        <p>Fecha: {new Date(sale.createdAt).toLocaleString("es-CO")}</p>
        <p>Atendió: {sale.advisorName}</p>
      </div>

      {/* Datos cliente */}
      <div className="border-b border-dashed pb-2 mb-2">
        <p><span className="font-semibold">Cliente:</span> {sale.customerName || "Consumidor Final"}</p>
        <p><span className="font-semibold">C.C/NIT:</span> {sale.customerDocument || "N/A"}</p>
        <p><span className="font-semibold">Tel:</span> {sale.customerPhone || "N/A"}</p>
      </div>

      {/* Detalle */}
      <table className="w-full text-xs mb-2">
        <thead>
          <tr className="border-b border-dashed">
            <th className="text-left">Descripción</th>
            <th className="text-center">Cant</th>
            <th className="text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map(item => (
            <tr key={item.id}>
              <td>{item.name}</td>
              <td className="text-center">{item.quantity}</td>
              <td className="text-right">
                ${(item.total).toLocaleString("es-CO")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totales */}
      <div className="border-t border-dashed pt-2 space-y-1 text-right">
        <p>Subtotal: ${sale.subtotal.toLocaleString("es-CO")}</p>
        {sale.discount > 0 && (
          <p>Desc: -${sale.discount.toLocaleString("es-CO")}</p>
        )}
        <p>IVA (19%): ${(sale.subtotal * 0.19).toLocaleString("es-CO")}</p>
        <p className="font-bold text-base">
          TOTAL: ${sale.total.toLocaleString("es-CO")}
        </p>
        <p className="text-xs">Método: {sale.paymentMethod.name}</p>
      </div>

      {/* Pie de página */}
      <div className="text-center mt-4 border-t border-dashed pt-2 text-xs">
        <p>¡Gracias por su compra!</p>
        <p>Factura POS sin derecho a facturación electrónica</p>
      </div>
    </div>
  );
}
