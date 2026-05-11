import { useState } from 'react';
import { usePaymentMethods } from '@/hooks/queries/usePaymentMethods';
import { useBankSettings } from '@/hooks/queries/useBankSettings';
import { useCompanySettings } from '@/hooks/queries/useCompanySettings';
import { usePrinters } from '@/hooks/queries/usePrinters';
import { useLabelDesigns } from '@/hooks/queries/useLabelDesigns';
import type { Bank, Printer, LabelDesign } from '@/types/settings';
import type { PaymentMethod } from '@/types/shared';
import { ScrollArea } from '@/components/ui/scroll-area';
import PaymentMethodsSection from '@/components/settings/PaymentMethodsSection';
import BanksSection from '@/components/settings/BanksSection';
import PrintersSection from '@/components/settings/PrintersSection';
import GeneralSection from '@/components/settings/GeneralSection';
import CardSettingsSection from '@/components/settings/CardSettingsSection';
import LabelDesignerSection from '@/components/settings/LabelDesignerSection';
import SampleDataSection from '@/components/settings/SampleDataSection';
import SystemInfoSection from '@/components/settings/SystemInfoSection';

const SECTIONS = [
  { id: 'metodos-pago',  name: 'Métodos de Pago',       icon: '💳' },
  { id: 'bancos',        name: 'Bancos',                 icon: '🏦' },
  { id: 'impresoras',    name: 'Impresoras',             icon: '🖨️' },
  { id: 'general',       name: 'Configuración General',  icon: '⚙️' },
  { id: 'tarjetas',      name: 'Config. Tarjetas',       icon: '💳' },
  { id: 'etiquetas',     name: 'Etiquetas Código',       icon: '🏷️' },
  { id: 'datos-prueba',  name: 'Datos de Prueba',        icon: '📦' },
  { id: 'sistema',       name: 'Info. Sistema',          icon: 'ℹ️' },
];

export default function Settings() {
  // ─── Hooks nuevos (Clean Architecture) ──────────────────────────────────────
  const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } =
    usePaymentMethods();

  const { banks, addBank, updateBank, deleteBank } = useBankSettings();

  const { cardSettings, companyInfo, taxSettings,
          updateCardSettings, updateCompanyInfo, updateTaxSettings } = useCompanySettings();

  const { printers, addPrinter, updatePrinter, deletePrinter, setDefaultPrinter } = usePrinters();
  const { labelDesigns, addLabelDesign, updateLabelDesign, deleteLabelDesign } = useLabelDesigns();

  const [selectedSection, setSelectedSection] = useState('metodos-pago');

  // ─── Adaptadores de firma ───────────────────────────────────────────────────
  const handleAddBank = (bank: Bank) =>
    addBank({ name: bank.name, isActive: bank.isActive, balance: bank.balance ?? 0, icon: bank.icon });

  // PrintersSection pasa Printer completo (con id generado en el componente)
  // El nuevo repositorio genera su propio id — descartamos el del componente
  const handleAddPrinter = ({ id: _id, createdAt: _ca, ...data }: Printer) =>
    addPrinter(data);

  // LabelDesignerSection pasa LabelDesign completo con id y createdAt provisionales
  const handleAddLabelDesign = ({ id: _id, createdAt: _ca, ...data }: LabelDesign) =>
    addLabelDesign(data);

  const handleAddPaymentMethod = (
    name: string,
    type: PaymentMethod['type'],
    bankId?: string,
    commission?: number,
    paymentPeriod?: PaymentMethod['paymentPeriod'],
    paymentDays?: number,
  ) => addPaymentMethod({ name, type, isActive: true, bankId, commission, paymentPeriod, paymentDays });

  return (
    <ScrollArea className="h-screen">
      <div className="p-6 max-w-[1400px] mx-auto">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-sm text-gray-600">Personaliza tu sistema de ventas e inventario</p>
        </div>

        <div className="flex h-[calc(100vh-140px)] gap-4">
          {/* Sidebar */}
          <div className="w-64 border rounded bg-white p-4">
            <h3 className="text-sm font-semibold mb-3 text-gray-700">Secciones</h3>
            <div className="space-y-1">
              {SECTIONS.map(section => (
                <div
                  key={section.id}
                  className={`px-3 py-2 text-sm rounded cursor-pointer ${
                    selectedSection === section.id
                      ? 'bg-blue-100 text-blue-700 font-medium'
                      : 'hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedSection(section.id)}
                >
                  {section.icon} {section.name}
                </div>
              ))}
            </div>
          </div>

          {/* Panel de contenido */}
          <div className="flex-1 border rounded bg-white overflow-auto">
            <div className="p-6">
              {selectedSection === 'metodos-pago' && (
                <PaymentMethodsSection
                  paymentMethods={paymentMethods}
                  banks={banks}
                  onAdd={handleAddPaymentMethod}
                  onUpdate={updatePaymentMethod}
                  onDelete={deletePaymentMethod}
                />
              )}
              {selectedSection === 'bancos' && (
                <BanksSection
                  banks={banks}
                  onAdd={handleAddBank}
                  onUpdate={updateBank}
                  onDelete={deleteBank}
                />
              )}
              {selectedSection === 'impresoras' && (
                <PrintersSection
                  printers={printers}
                  onAdd={handleAddPrinter}
                  onUpdate={updatePrinter}
                  onDelete={deletePrinter}
                  onSetDefault={setDefaultPrinter}
                />
              )}
              {selectedSection === 'general' && (
                <GeneralSection
                  companyInfo={companyInfo}
                  onUpdateCompany={updateCompanyInfo}
                  taxSettings={taxSettings}
                  onUpdateTax={updateTaxSettings}
                />
              )}
              {selectedSection === 'tarjetas' && (
                <CardSettingsSection
                  cardSettings={cardSettings}
                  onUpdate={updateCardSettings}
                />
              )}
              {selectedSection === 'etiquetas' && (
                <LabelDesignerSection
                  labelDesigns={labelDesigns}
                  printers={printers}
                  onAdd={handleAddLabelDesign}
                  onUpdate={updateLabelDesign}
                  onDelete={deleteLabelDesign}
                />
              )}
              {selectedSection === 'datos-prueba' && <SampleDataSection />}
              {selectedSection === 'sistema'      && <SystemInfoSection />}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
