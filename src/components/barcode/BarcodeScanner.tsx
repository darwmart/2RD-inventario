import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, CameraOff } from 'lucide-react';

interface Props {
  open: boolean;
  onDetected: (code: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ open, onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    BrowserMultiFormatReader.listVideoInputDevices()
      .then(devices => {
        setCameras(devices);
        if (devices.length > 0) setSelectedCamera(devices[0].deviceId);
      })
      .catch(() => setError('No se pudo acceder a la lista de cámaras'));
    return () => stopScanner();
  }, [open]);

  useEffect(() => {
    if (!open || !selectedCamera) return;
    startScanner(selectedCamera);
    return () => stopScanner();
  }, [open, selectedCamera]);

  const startScanner = (deviceId: string) => {
    if (!videoRef.current) return;
    stopScanner();
    const reader = new BrowserMultiFormatReader();
    readerRef.current = reader;
    setScanning(true);
    reader.decodeFromVideoDevice(deviceId, videoRef.current, (result, err) => {
      if (result) {
        onDetected(result.getText());
        stopScanner();
        onClose();
      }
      if (err && (err as Error).name !== 'NotFoundException') {
        setError('Error al leer el código. Intenta de nuevo.');
      }
    }).catch(() => {
      setError('No se pudo iniciar la cámara. Verifica los permisos.');
      setScanning(false);
    });
  };

  const stopScanner = () => {
    if (readerRef.current) {
      try { BrowserMultiFormatReader.releaseAllStreams(); } catch { /* ignore */ }
      readerRef.current = null;
    }
    setScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" />Escanear código de barras
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {cameras.length > 1 && (
            <Select value={selectedCamera} onValueChange={setSelectedCamera}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Seleccionar cámara..." />
              </SelectTrigger>
              <SelectContent>
                {cameras.map(c => (
                  <SelectItem key={c.deviceId} value={c.deviceId} className="text-xs">
                    {c.label || `Cámara ${c.deviceId.slice(0, 8)}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
            <video ref={videoRef} className="w-full h-full object-cover" />
            {scanning && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-2 border-green-400 rounded w-48 h-20 opacity-80" />
              </div>
            )}
            {!scanning && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <CameraOff className="h-10 w-10 text-white/40" />
              </div>
            )}
          </div>

          {error && <p className="text-xs text-red-500 text-center">{error}</p>}
          {scanning && <p className="text-xs text-gray-500 text-center">Apunta la cámara al código de barras...</p>}

          <Button variant="outline" className="w-full" onClick={handleClose}>Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
