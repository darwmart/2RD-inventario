import { SalaryPayment } from '@/types';

interface CompanyInfo {
  name: string;
  nit: string;
  address: string;
  phone: string;
}

const MONTHS = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

function periodLabel(period: string): string {
  const [y, m] = period.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} de ${y}`;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function printSalaryVoucher(payment: SalaryPayment, company: CompanyInfo) {
  const loanRows = payment.loanDeductions
    .map(d => `<tr><td class="concept">Abono préstamo — ${d.description}</td><td class="amount red">${fmt(d.amount)}</td></tr>`)
    .join('');

  const daysInfo = payment.daysWorked
    ? `${payment.daysWorked} días (de 30) · ${fmtDate(payment.fromDate)} al ${fmtDate(payment.toDate)}`
    : periodLabel(payment.period);

  const baseSalaryLabel = payment.daysWorked && payment.baseSalaryMonthly
    ? `Salario básico (${payment.daysWorked}/30 días)`
    : 'Salario básico';

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<title>Comprobante de Pago — ${payment.advisorName}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11pt; color: #111; padding: 20px; }
  .voucher { max-width: 680px; margin: 0 auto; border: 2px solid #333; padding: 24px; }
  .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 16px; }
  .header h1 { font-size: 15pt; text-transform: uppercase; }
  .header h2 { font-size: 11pt; font-weight: normal; margin-top: 4px; }
  .header p { font-size: 9pt; color: #555; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 16px; font-size: 10pt; }
  .info-grid .label { color: #555; font-size: 9pt; }
  .info-grid .value { font-weight: bold; }
  .section-title { background: #333; color: #fff; padding: 4px 8px; font-size: 10pt; font-weight: bold;
    text-transform: uppercase; margin-bottom: 4px; margin-top: 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 10pt; }
  td, th { padding: 5px 8px; border: 1px solid #ccc; }
  th { background: #f0f0f0; font-weight: bold; text-align: left; }
  td.amount { text-align: right; font-family: monospace; white-space: nowrap; }
  td.red { color: #c00; }
  td.green { color: #060; font-weight: bold; }
  td.concept { }
  .totals-table td { font-weight: bold; background: #f9f9f9; }
  .net-row td { background: #333; color: #fff; font-size: 12pt; }
  .net-row td.amount { color: #fff; }
  .legal { font-size: 8pt; color: #777; margin-top: 16px; border-top: 1px solid #ccc; padding-top: 8px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 40px; }
  .sig-box { border-top: 1px solid #333; padding-top: 6px; text-align: center; font-size: 9pt; }
  .period-badge { display: inline-block; background: #eee; border: 1px solid #ccc;
    padding: 2px 10px; border-radius: 4px; font-size: 9pt; margin-top: 4px; }
  @media print {
    body { padding: 0; }
    .voucher { border: none; max-width: 100%; }
    @page { margin: 15mm; }
  }
</style>
</head>
<body>
<div class="voucher">
  <div class="header">
    <h1>${company.name}</h1>
    <h2>COMPROBANTE DE PAGO DE SALARIO</h2>
    ${company.nit ? `<p>NIT: ${company.nit}</p>` : ''}
    ${company.address ? `<p>${company.address}${company.phone ? ' | Tel: ' + company.phone : ''}</p>` : ''}
    <div class="period-badge">Período: ${daysInfo}</div>
  </div>

  <div class="info-grid">
    <div>
      <div class="label">Empleado / Asesor</div>
      <div class="value">${payment.advisorName}</div>
    </div>
    <div>
      <div class="label">Cédula</div>
      <div class="value">${payment.advisorDocument || '—'}</div>
    </div>
    <div>
      <div class="label">Cargo</div>
      <div class="value">Asesor de Ventas</div>
    </div>
    <div>
      <div class="label">Fecha de pago</div>
      <div class="value">${new Date(payment.paymentDate).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
    </div>
    <div>
      <div class="label">Método de pago</div>
      <div class="value">${payment.paymentMethod}</div>
    </div>
    <div>
      <div class="label">No. Comprobante</div>
      <div class="value">${payment.id.slice(0, 8).toUpperCase()}</div>
    </div>
  </div>

  <div class="section-title">Devengados</div>
  <table>
    <thead><tr><th>Concepto</th><th style="text-align:right;width:160px">Valor</th></tr></thead>
    <tbody>
      <tr>
        <td class="concept">
          ${baseSalaryLabel}
          ${payment.daysWorked && payment.baseSalaryMonthly ? `<span style="font-size:9pt;color:#666"> · Base mensual: ${fmt(payment.baseSalaryMonthly)}</span>` : ''}
        </td>
        <td class="amount">${fmt(payment.baseSalary)}</td>
      </tr>
      ${payment.commissions > 0 ? `<tr><td class="concept">Comisiones por ventas</td><td class="amount">${fmt(payment.commissions)}</td></tr>` : ''}
      ${payment.transportAllowance > 0 ? `<tr><td class="concept">Auxilio de transporte</td><td class="amount">${fmt(payment.transportAllowance)}</td></tr>` : ''}
    </tbody>
    <tfoot class="totals-table">
      <tr><td><strong>Total Devengado</strong></td><td class="amount green">${fmt(payment.grossPay)}</td></tr>
    </tfoot>
  </table>

  <div class="section-title">Deducciones</div>
  <table>
    <thead><tr><th>Concepto</th><th style="text-align:right;width:160px">Valor</th></tr></thead>
    <tbody>
      ${payment.healthDeduction > 0 ? `<tr><td class="concept">Salud (4% — aporte empleado)</td><td class="amount red">${fmt(payment.healthDeduction)}</td></tr>` : ''}
      ${payment.pensionDeduction > 0 ? `<tr><td class="concept">Pensión (4% — aporte empleado)</td><td class="amount red">${fmt(payment.pensionDeduction)}</td></tr>` : ''}
      ${loanRows}
      ${payment.otherDeductions > 0 ? `<tr><td class="concept">${payment.otherDeductionDesc || 'Otras deducciones'}</td><td class="amount red">${fmt(payment.otherDeductions)}</td></tr>` : ''}
      ${payment.totalDeductions === 0 ? '<tr><td colspan="2" style="text-align:center;color:#999">Sin deducciones</td></tr>' : ''}
    </tbody>
    <tfoot class="totals-table">
      <tr><td><strong>Total Deducciones</strong></td><td class="amount red">${fmt(payment.totalDeductions)}</td></tr>
    </tfoot>
  </table>

  <table style="margin-top:12px">
    <tbody>
      <tr class="net-row">
        <td style="font-size:13pt;font-weight:bold">NETO A PAGAR</td>
        <td class="amount" style="font-size:13pt;font-weight:bold;color:#fff">${fmt(payment.netPay)}</td>
      </tr>
    </tbody>
  </table>

  ${payment.notes ? `<p style="margin-top:10px;font-size:9pt;color:#555"><strong>Notas:</strong> ${payment.notes}</p>` : ''}

  <p class="legal">
    Este comprobante de pago de salario se expide de conformidad con el Código Sustantivo del Trabajo
    de Colombia (Art. 55 y ss.) y el Decreto Único Reglamentario del Sector Trabajo (Decreto 1072 de 2015).
    El trabajador certifica con su firma haber recibido a satisfacción los valores indicados.
  </p>

  <div class="signatures">
    <div class="sig-box">
      <div style="margin-bottom:36px"></div>
      ${payment.advisorName}<br/>
      CC: ${payment.advisorDocument || '____________'}<br/>
      <strong>Firma Trabajador</strong>
    </div>
    <div class="sig-box">
      <div style="margin-bottom:36px"></div>
      ${company.name}<br/>
      NIT: ${company.nit || '____________'}<br/>
      <strong>Firma Empleador</strong>
    </div>
  </div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=780,height=900');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
