import { supabase } from '@/lib/supabase';
import type { SalaryPayment, LoanPayment } from '@/types/shared';

type Row = Record<string, unknown>;

// ── SalaryPayment ──────────────────────────────────────────────────────────

function toSalary(row: Row): SalaryPayment {
  return {
    id:                   row.id as string,
    advisorId:            row.advisor_id as string,
    advisorName:          row.advisor_name as string,
    advisorDocument:      (row.advisor_document as string) ?? undefined,
    period:               row.period as string,
    fromDate:             row.from_date as string,
    toDate:               row.to_date as string,
    daysWorked:           Number(row.days_worked),
    baseSalaryMonthly:    Number(row.base_salary_monthly),
    baseSalary:           Number(row.base_salary),
    commissions:          Number(row.commissions),
    transportAllowance:   Number(row.transport_allowance),
    healthDeduction:      Number(row.health_deduction),
    pensionDeduction:     Number(row.pension_deduction),
    loanDeductions:       (row.loan_deductions as SalaryPayment['loanDeductions']) ?? [],
    otherDeductions:      Number(row.other_deductions),
    otherDeductionDesc:   (row.other_deduction_desc as string) ?? '',
    grossPay:             Number(row.gross_pay),
    totalDeductions:      Number(row.total_deductions),
    netPay:               Number(row.net_pay),
    bankId:               (row.bank_id as string) ?? undefined,
    bankName:             (row.bank_name as string) ?? undefined,
    notes:                (row.notes as string) ?? undefined,
    createdAt:            row.created_at as string,
  };
}

function toSalaryRow(data: Omit<SalaryPayment, 'id' | 'createdAt'>): Row {
  return {
    advisor_id:           data.advisorId,
    advisor_name:         data.advisorName,
    advisor_document:     data.advisorDocument ?? null,
    period:               data.period,
    from_date:            data.fromDate,
    to_date:              data.toDate,
    days_worked:          data.daysWorked,
    base_salary_monthly:  data.baseSalaryMonthly,
    base_salary:          data.baseSalary,
    commissions:          data.commissions,
    transport_allowance:  data.transportAllowance,
    health_deduction:     data.healthDeduction,
    pension_deduction:    data.pensionDeduction,
    loan_deductions:      data.loanDeductions ?? [],
    other_deductions:     data.otherDeductions,
    other_deduction_desc: data.otherDeductionDesc,
    gross_pay:            data.grossPay,
    total_deductions:     data.totalDeductions,
    net_pay:              data.netPay,
    bank_id:              data.bankId ?? null,
    bank_name:            data.bankName ?? null,
    notes:                data.notes ?? null,
  };
}

export class SupabaseSalaryRepository {
  private readonly table = 'salary_payments';

  async findAll(): Promise<SalaryPayment[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toSalary(r as Row));
  }

  async findByAdvisor(advisorId: string): Promise<SalaryPayment[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('advisor_id', advisorId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toSalary(r as Row));
  }

  async create(data: Omit<SalaryPayment, 'id' | 'createdAt'>): Promise<SalaryPayment> {
    const { data: inserted, error } = await supabase
      .from(this.table).insert(toSalaryRow(data)).select().single();
    if (error) throw new Error(error.message);
    return toSalary(inserted as Row);
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from(this.table).delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
}

// ── LoanPayment ────────────────────────────────────────────────────────────

function toLoan(row: Row): LoanPayment {
  return {
    id:              row.id as string,
    loanId:          row.loan_id as string,
    advisorId:       row.advisor_id as string,
    advisorName:     row.advisor_name as string,
    amount:          Number(row.amount),
    salaryPaymentId: (row.salary_payment_id as string) ?? undefined,
    date:            row.date as string,
    notes:           (row.notes as string) ?? '',
  };
}

export class SupabaseLoanPaymentRepository {
  private readonly table = 'loan_payments';

  async findAll(): Promise<LoanPayment[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toLoan(r as Row));
  }

  async findByAdvisor(advisorId: string): Promise<LoanPayment[]> {
    const { data, error } = await supabase
      .from(this.table).select('*').eq('advisor_id', advisorId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toLoan(r as Row));
  }

  async create(data: Omit<LoanPayment, 'id'>): Promise<LoanPayment> {
    const { data: inserted, error } = await supabase
      .from(this.table).insert({
        loan_id:           data.loanId,
        advisor_id:        data.advisorId,
        advisor_name:      data.advisorName,
        amount:            data.amount,
        salary_payment_id: data.salaryPaymentId ?? null,
        date:              data.date,
        notes:             data.notes ?? '',
      }).select().single();
    if (error) throw new Error(error.message);
    return toLoan(inserted as Row);
  }

  async createMany(items: Omit<LoanPayment, 'id'>[]): Promise<LoanPayment[]> {
    if (!items.length) return [];
    const rows = items.map(d => ({
      loan_id:           d.loanId,
      advisor_id:        d.advisorId,
      advisor_name:      d.advisorName,
      amount:            d.amount,
      salary_payment_id: d.salaryPaymentId ?? null,
      date:              d.date,
      notes:             d.notes ?? '',
    }));
    const { data, error } = await supabase
      .from(this.table).insert(rows).select();
    if (error) throw new Error(error.message);
    return (data ?? []).map(r => toLoan(r as Row));
  }

  async getTotalPaid(loanId: string): Promise<number> {
    const { data, error } = await supabase
      .from(this.table).select('amount').eq('loan_id', loanId);
    if (error) throw new Error(error.message);
    return (data ?? []).reduce((s, r) => s + Number(r.amount), 0);
  }
}
