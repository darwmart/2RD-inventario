import { useState } from 'react';
import { useProducts } from '@/hooks/queries/useProducts';
import { useSalesData } from '@/hooks/queries/useSalesData';
import { useAdvisors } from '@/hooks/queries/useAdvisors';
import { usePaymentMethods } from '@/hooks/queries/usePaymentMethods';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import CreateQuoteDialog, { CreateQuoteFormData } from '@/components/quotes/CreateQuoteDialog';
import QuotesList from '@/components/quotes/QuotesList';
import ReservedList from '@/components/quotes/ReservedList';
import DepositDialog from '@/components/quotes/DepositDialog';

const PAYMENT_TO_BANK: Record<string, string | null> = {
  '1': 'efectivo', '2': 'colpatria', '3': 'colpatria', '4': 'bbva',
  '5': 'nequi', '6': 'daviplata', '7': 'bbva',
  '8': null, '9': null, '10': null,
};

export default function Quotes() {
  const { products } = useProducts();
  const { sales, addSaleAsync, addDeposit, convertToSale, cancelSale } = useSalesData();
  const { advisors } = useAdvisors();
  const { paymentMethods } = usePaymentMethods();
  const { banks, updateBankBalance } = useBankSettings();
  const { companyInfo, taxSettings } = useCompanySettings();

  const [isCreatingQuote, setIsCreatingQuote] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositSaleId, setDepositSaleId] = useState('');

  const quotes = sales.filter(s => s.type === 'quote' && s.status === 'pending');
  const reserved = sales.filter(s => s.type === 'reserved' && s.status === 'pending');
  const selectedSaleForDeposit = sales.find(s => s.id === depositSaleId);

  const applyBankDeposit = (paymentMethodId: string, amount: number) => {
    const pm = paymentMethods.find(p => p.id === paymentMethodId);
    if (!pm) return;
    const bankId = PAYMENT_TO_BANK[pm.id];
    if (bankId && banks.find(b => b.id === bankId)) updateBankBalance(bankId, amount);
  };

  const handleCreate = async (data: CreateQuoteFormData) => {
    if (data.items.length === 0) { toast.error('Agrega productos para crear la cotización'); return; }
    if (!data.advisorId) { toast.error('Selecciona un asesor'); return; }

    if (data.type === 'reserved') {
      if (!data.paymentMethodId) { toast.error('Selecciona un método de pago'); return; }
      if (!paymentMethods.find(p => p.id === data.paymentMethodId)) { toast.error('Método de pago inválido'); return; }
      for (const item of data.items) {
        const product = products.find(p => p.id === item.productId);
        if (!product || product.stock < item.quantity) { toast.error(`Stock insuficiente para ${item.productName}`); return; }
      }
    }

    const method = data.type === 'reserved'
      ? paymentMethods.find(p => p.id === data.paymentMethodId)!
      : { id: 'pending', name: 'Pendiente', type: 'cash' as const, isActive: true };

    try {
      await addSaleAsync({
        advisorId: data.advisorId,
        items: data.items,
        paymentMethod: method,
        type: data.type,
        ivaTotal: data.totalIVA,
        ...(data.type === 'reserved' ? {
          deposit: data.deposit,
          customerName: data.customerName,
          customerDocument: data.customerDocument,
          customerPhone: data.customerPhone,
        } : {}),
      });

      if (data.type === 'reserved' && data.deposit && data.deposit > 0 && data.paymentMethodId) {
        applyBankDeposit(data.paymentMethodId, data.deposit);
      }

      setIsCreatingQuote(false);
    } catch {
      // El error ya es notificado por useSalesData via toast
    }
  };

  const handleConfirmDeposit = (amount: number, paymentMethodId: string) => {
    const sale = sales.find(s => s.id === depositSaleId);
    if (!sale) { toast.error('Separado no encontrado'); return; }
    if (sale.type !== 'reserved' || sale.status !== 'pending') { toast.error('Solo se pueden abonar separados pendientes'); return; }
    if (!paymentMethodId) { toast.error('Selecciona un método de pago'); return; }
    if (amount <= 0) { toast.error('Ingresa un monto válido'); return; }
    const remaining = Math.max(0, sale.total - (sale.deposit ?? 0));
    if (amount > remaining) { toast.error('El abono no puede superar el saldo pendiente'); return; }

    const method = paymentMethods.find(p => p.id === paymentMethodId);
    if (!method) { toast.error('Método de pago no encontrado'); return; }

    addDeposit(depositSaleId, amount, method);
    applyBankDeposit(paymentMethodId, amount);
    setDepositDialogOpen(false);
    setDepositSaleId('');
  };

  return (
    <ScrollArea className="h-[51rem] p-6">
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Cotizaciones y Separados</h1>
            <p className="mt-2 text-gray-600">Gestiona cotizaciones y productos separados</p>
          </div>
          <Button onClick={() => setIsCreatingQuote(true)}>
            <Plus className="h-4 w-4 mr-2" />Nueva Cotización
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <QuotesList
            quotes={quotes}
            companyInfo={companyInfo}
            onConvert={convertToSale}
            onCancel={cancelSale}
          />
          <ReservedList
            reserved={reserved}
            companyInfo={companyInfo}
            onDeposit={id => { setDepositSaleId(id); setDepositDialogOpen(true); }}
            onConvert={convertToSale}
            onCancel={cancelSale}
          />
        </div>

        <CreateQuoteDialog
          open={isCreatingQuote}
          products={products}
          advisors={advisors}
          paymentMethods={paymentMethods}
          taxSettings={taxSettings}
          onClose={() => setIsCreatingQuote(false)}
          onSave={handleCreate}
        />

        <DepositDialog
          open={depositDialogOpen}
          sale={selectedSaleForDeposit}
          paymentMethods={paymentMethods}
          onClose={() => { setDepositDialogOpen(false); setDepositSaleId(''); }}
          onConfirm={handleConfirmDeposit}
        />
      </div>
    </ScrollArea>
  );
}
