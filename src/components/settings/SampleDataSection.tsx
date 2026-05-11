import { Button } from '@/components/ui/button';
import { Download, Trash2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { importSampleData, clearAllData } from '@/utils/importSampleData';

export default function SampleDataSection() {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Datos de Prueba - FactuSOL</h2>
      <div className="space-y-6">
        <div className="p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Database className="h-5 w-5" />
            Importar Productos de Prueba
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            Importa más de 250 productos reales de FactuSOL para realizar pruebas en el sistema.
            Incluye categorías, precios, códigos de barras y stock inicial.
          </p>
          <div className="flex gap-3">
            <Button
              onClick={() => {
                const result = importSampleData();
                if (result.success) {
                  toast.success(result.message);
                  setTimeout(() => window.location.reload(), 1500);
                } else {
                  toast.error(result.message);
                }
              }}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Importar Datos de Prueba
            </Button>
          </div>
        </div>

        <div className="p-6 bg-yellow-50 rounded-lg border border-yellow-200">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-yellow-800">
            <Trash2 className="h-5 w-5" />
            Zona de Peligro
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            <strong>Advertencia:</strong> Esta acción eliminará TODOS los datos del sistema
            (productos, categorías, ventas, compras, etc.). Esta operación no se puede deshacer.
          </p>
          <Button
            variant="destructive"
            onClick={() => {
              const result = clearAllData();
              if (result.success) {
                toast.success(result.message);
                setTimeout(() => window.location.reload(), 1500);
              } else {
                toast.info(result.message);
              }
            }}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Eliminar Todos los Datos
          </Button>
        </div>

        <div className="p-6 bg-gray-50 rounded-lg border">
          <h3 className="text-lg font-semibold mb-3">Información de los Datos de Prueba</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-600">Total de Productos:</p>
              <p className="text-2xl font-bold text-blue-600">254</p>
            </div>
            <div>
              <p className="font-medium text-gray-600">Categorías:</p>
              <p className="text-2xl font-bold text-green-600">9</p>
            </div>
          </div>
          <div className="mt-4 text-xs text-gray-600">
            <p><strong>Categorías incluidas:</strong></p>
            <p className="mt-1">Ropa y Protección, Luces y Exploradoras, Accesorios, Cascos,
            Electrónica, Guantes, Defensas, Espejos, Servicios</p>
          </div>
        </div>
      </div>
    </div>
  );
}
