import { useState } from 'react';
import { useSales } from '@/hooks/useSales';
import { useSettings } from '@/hooks/useSettings';
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
  { id: 'metodos-pago', name: 'Métodos de Pago', icon: '💳' },
  { id: 'bancos', name: 'Bancos', icon: '🏦' },
  { id: 'impresoras', name: 'Impresoras', icon: '🖨️' },
  { id: 'general', name: 'Configuración General', icon: '⚙️' },
  { id: 'tarjetas', name: 'Config. Tarjetas', icon: '💳' },
  { id: 'etiquetas', name: 'Etiquetas Código', icon: '🏷️' },
  { id: 'datos-prueba', name: 'Datos de Prueba', icon: '📦' },
  { id: 'sistema', name: 'Info. Sistema', icon: 'ℹ️' },
];

export default function Settings() {
  const { paymentMethods, addPaymentMethod, updatePaymentMethod, deletePaymentMethod } = useSales();
  const {
    cardSettings, updateCardSettings,
    companyInfo, updateCompanyInfo,
    taxSettings, updateTaxSettings,
    banks, addBank, updateBank, deleteBank,
    printers, addPrinter, updatePrinter, deletePrinter, setDefaultPrinter,
    labelDesigns, addLabelDesign, updateLabelDesign, deleteLabelDesign,
  } = useSettings();

  const [selectedSection, setSelectedSection] = useState('metodos-pago');

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

          {/* Content panel */}
          <div className="flex-1 border rounded bg-white overflow-auto">
            <div className="p-6">
              {selectedSection === 'metodos-pago' && (
                <PaymentMethodsSection
                  paymentMethods={paymentMethods}
                  banks={banks}
                  onAdd={addPaymentMethod}
                  onUpdate={updatePaymentMethod}
                  onDelete={deletePaymentMethod}
                />
              )}
              {selectedSection === 'bancos' && (
                <BanksSection
                  banks={banks}
                  onAdd={addBank}
                  onUpdate={updateBank}
                  onDelete={deleteBank}
                />
              )}
              {selectedSection === 'impresoras' && (
                <PrintersSection
                  printers={printers}
                  onAdd={addPrinter}
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
                  onAdd={addLabelDesign}
                  onUpdate={updateLabelDesign}
                  onDelete={deleteLabelDesign}
                />
              )}
              {selectedSection === 'datos-prueba' && <SampleDataSection />}
              {selectedSection === 'sistema' && <SystemInfoSection />}
            </div>
          </div>
        </div>
      </div>
    </ScrollArea>
  );
}
