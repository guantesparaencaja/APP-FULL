import React, { useEffect, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X, Search, Camera } from 'lucide-react';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    let html5QrCode: Html5Qrcode;

    const startScanner = async () => {
      try {
        html5QrCode = new Html5Qrcode('reader');

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 250, height: 150 },
            aspectRatio: 1.0,
          },
          (decodedText) => {
            html5QrCode
              .stop()
              .then(() => {
                onScan(decodedText);
              })
              .catch((err) => console.error('Failed to stop scanner', err));
          },
          (errorMessage) => {
            // Ignore scan errors as they happen constantly when no barcode is in view
          }
        );
        setIsScanning(true);
      } catch (err: any) {
        console.error('Error starting scanner:', err);
        setError('No se pudo acceder a la cámara. Por favor, verifica los permisos.');
      }
    };

    startScanner();

    return () => {
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch((err) => console.error('Failed to stop scanner on unmount', err));
      }
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 w-full max-w-md rounded-2xl overflow-hidden border border-slate-700 shadow-2xl animate-in zoom-in-95">
        <div className="p-4 flex justify-between items-center border-b border-slate-800">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Escanear Código de Barras
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-full hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="relative w-full aspect-square bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
            {!isScanning && !error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                <Camera className="w-8 h-8 mb-2 animate-pulse" />
                <p className="text-sm">Iniciando cámara...</p>
              </div>
            )}
            <div id="reader" className="w-full h-full"></div>
          </div>
          <p className="text-center text-sm text-slate-400 mt-4">
            Apunta la cámara al código de barras del producto.
          </p>
          {error && (
            <p className="text-red-400 text-sm text-center mt-2 bg-red-400/10 p-2 rounded-lg border border-red-400/20">
              {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
