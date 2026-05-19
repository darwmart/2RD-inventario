import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, ShoppingCart, Printer } from 'lucide-react';
import { usePrintPOS } from '@/hooks/usePrintPOS';

interface CompanyInfo {
  name: string;
  [key: string]: unknown;
}

interface SaleItem {
  productName: string;
  quantity: number;
}

interface Quote {
  id: string;
  saleNumber: string;
  advisorName: string;
  createdAt: string | Date;
  total: number;
  items: SaleItem[];
  type?: string;
}

interface Props {
  quotes: Quote[];
  companyInfo: CompanyInfo;
  onConvert: (id: string) => void;
  onCancel: (id: string) => void;
}

export default function QuotesList({ quotes, companyInfo, onConvert, onCancel }: Props) {
  const printPOS = usePrintPOS();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Cotizaciones ({quotes.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {quotes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No hay cotizaciones pendientes</p>
          ) : (
            quotes.map(quote => (
              <div key={quote.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium">{quote.saleNumber}</h4>
                    <p className="text-sm text-gray-600">Asesor: {quote.advisorName}</p>
                    <p className="text-sm text-gray-500">{new Date(quote.createdAt).toLocaleDateString('es-CO')}</p>
                  </div>
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    Pendiente
                  </Badge>
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {quote.items.length} productos - Total: ${quote.total.toLocaleString('es-CO')}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => printPOS({ ...quote, type: 'quote' } as never, companyInfo as never)}>
                    <Printer className="h-4 w-4 mr-1" />Imprimir
                  </Button>
                  <Button size="sm" onClick={() => onConvert(quote.id)} className="flex-1">
                    <ShoppingCart className="h-4 w-4 mr-1" />Convertir a Venta
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onCancel(quote.id)}>Cancelar</Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
