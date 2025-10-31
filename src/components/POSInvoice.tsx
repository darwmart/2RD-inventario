import { Sale, CompanyInfo } from '@/types';

interface POSInvoiceProps {
  sale: Sale;
  companyInfo: CompanyInfo;
}

export function POSInvoice({ sale, companyInfo }: POSInvoiceProps) {
  return (
    <div
      id={`pos-invoice-${sale.id}`}
      style={{
        width: '80mm',
        fontFamily: 'monospace',
        fontSize: '12px',
        padding: '10px',
        margin: '0 auto',
      }}
    >
      {/* Encabezado de la empresa */}
      <div style={{ textAlign: 'center', marginBottom: '15px' }}>
        <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
          {companyInfo.name}
        </div>
        <div style={{ fontSize: '11px' }}>NIT: {companyInfo.nit}</div>
        <div style={{ fontSize: '11px' }}>{companyInfo.address}</div>
        <div style={{ fontSize: '11px' }}>Tel: {companyInfo.phone}</div>
        {companyInfo.email && (
          <div style={{ fontSize: '11px' }}>{companyInfo.email}</div>
        )}
      </div>

      {/* Línea divisoria */}
      <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

      {/* Información de la venta */}
      <div style={{ marginBottom: '10px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Factura:</span>
          <span style={{ fontWeight: 'bold' }}>{sale.saleNumber}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Fecha:</span>
          <span>{new Date(sale.createdAt).toLocaleString('es-CO')}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Asesor:</span>
          <span>{sale.advisorName}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Tipo:</span>
          <span>
            {sale.type === 'sale' && 'Venta'}
            {sale.type === 'quote' && 'Cotización'}
            {sale.type === 'reserved' && 'Separado'}
          </span>
        </div>
      </div>

      {/* Información del cliente (si aplica) */}
      {(sale.customerName || sale.customerDocument || sale.customerPhone) && (
        <>
          <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>
          <div style={{ marginBottom: '10px', fontSize: '11px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>CLIENTE</div>
            {sale.customerName && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Nombre:</span>
                <span>{sale.customerName}</span>
              </div>
            )}
            {sale.customerDocument && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Documento:</span>
                <span>{sale.customerDocument}</span>
              </div>
            )}
            {sale.customerPhone && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Teléfono:</span>
                <span>{sale.customerPhone}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Línea divisoria */}
      <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

      {/* Productos */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 'bold',
          fontSize: '11px',
          marginBottom: '5px'
        }}>
          <span style={{ flex: '2' }}>Producto</span>
          <span style={{ flex: '1', textAlign: 'center' }}>Cant</span>
          <span style={{ flex: '1', textAlign: 'right' }}>Precio</span>
          <span style={{ flex: '1', textAlign: 'right' }}>Total</span>
        </div>

        {sale.items.map((item, index) => (
          <div key={index} style={{ marginBottom: '8px', fontSize: '11px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
              {item.productName}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              paddingLeft: '10px'
            }}>
              <span style={{ flex: '2' }}></span>
              <span style={{ flex: '1', textAlign: 'center' }}>{item.quantity}</span>
              <span style={{ flex: '1', textAlign: 'right' }}>
                ${item.unitPrice.toLocaleString('es-CO')}
              </span>
              <span style={{ flex: '1', textAlign: 'right' }}>
                ${item.total.toLocaleString('es-CO')}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Línea divisoria */}
      <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

      {/* Totales */}
      <div style={{ marginBottom: '10px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
          <span>Subtotal:</span>
          <span>${sale.subtotal.toLocaleString('es-CO')}</span>
        </div>

        {sale.discount && sale.discount > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
            <span>Descuento:</span>
            <span>-${sale.discount.toLocaleString('es-CO')}</span>
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          fontWeight: 'bold',
          fontSize: '14px',
          marginTop: '5px',
          paddingTop: '5px',
          borderTop: '1px solid #000'
        }}>
          <span>TOTAL:</span>
          <span>${sale.total.toLocaleString('es-CO')}</span>
        </div>
      </div>

      {/* Información de pago */}
      <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>
      <div style={{ marginBottom: '10px', fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Método de Pago:</span>
          <span style={{ fontWeight: 'bold' }}>{sale.paymentMethod?.name}</span>
        </div>

        {/* Información de separados */}
        {sale.type === 'reserved' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
              <span>Abono:</span>
              <span style={{ color: '#008800', fontWeight: 'bold' }}>
                ${(sale.deposit || 0).toLocaleString('es-CO')}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Saldo Pendiente:</span>
              <span style={{ color: '#880000', fontWeight: 'bold' }}>
                ${Math.max(0, sale.total - (sale.deposit || 0)).toLocaleString('es-CO')}
              </span>
            </div>

            {/* Historial de abonos */}
            {sale.deposits && sale.deposits.length > 0 && (
              <div style={{ marginTop: '10px' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Historial de Abonos:</div>
                {sale.deposits.map((deposit, index) => (
                  <div key={index} style={{ paddingLeft: '10px', marginBottom: '3px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(deposit.createdAt).toLocaleDateString('es-CO')}</span>
                      <span>${deposit.amount.toLocaleString('es-CO')}</span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      {deposit.method?.name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Línea divisoria */}
      <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

      {/* Pie de página */}
      <div style={{ textAlign: 'center', fontSize: '11px', marginTop: '15px' }}>
        <div style={{ marginBottom: '5px' }}>¡Gracias por su compra!</div>
        <div style={{ fontSize: '10px', color: '#666' }}>
          {sale.type === 'quote' && 'Esta es una cotización, no es una factura de venta'}
          {sale.type === 'reserved' && 'Producto reservado - Complete el pago para retirar'}
          {sale.type === 'sale' && 'Documento no válido como factura'}
        </div>
      </div>
    </div>
  );
}
