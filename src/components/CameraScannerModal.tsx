import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Camera, X, RefreshCw, AlertCircle, Volume2 } from 'lucide-react';

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (decodedText: string) => void;
  title?: string;
  description?: string;
}

// Play a short POS scanner beep on detection
function playBeep() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = 1800; // Crisp retail scanner frequency
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch {
    // ignore audio failure
  }
}

export const CameraScannerModal: React.FC<CameraScannerModalProps> = ({
  isOpen,
  onClose,
  onScanSuccess,
  title = 'Scan Barcode / QR Code',
  description = 'Point your camera at any supermarket product barcode or QR code.',
}) => {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(true);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'akos-barcode-reader';

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsStarting(true);
    setErrorMessage(null);

    const initScanner = async () => {
      try {
        await new Promise(r => setTimeout(r, 100));
        if (!isMounted) return;

        const scanner = new Html5Qrcode(containerId, {
          formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
            Html5QrcodeSupportedFormats.QR_CODE,
          ],
          verbose: false,
        });
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode },
          {
            fps: 15,
            qrbox: { width: 280, height: 180 },
            aspectRatio: 1.333,
          },
          (decodedText) => {
            playBeep();
            stopAndClose(decodedText);
          },
          (_error) => {
            // frame decode error, ignore continuous scanning attempts
          }
        );

        if (isMounted) {
          setIsStarting(false);
        }
      } catch (err: any) {
        console.error('Camera scan error:', err);
        if (isMounted) {
          setIsStarting(false);
          setErrorMessage(
            err?.message ||
              'Unable to access camera. Please check camera permissions in your browser or connect a USB scanner.'
          );
        }
      }
    };

    initScanner();

    return () => {
      isMounted = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(() => {});
      }
    };
  }, [isOpen, facingMode]);

  const stopAndClose = async (scannedCode?: string) => {
    try {
      if (scannerRef.current && scannerRef.current.isScanning) {
        await scannerRef.current.stop();
      }
    } catch (e) {
      console.warn('Error stopping scanner:', e);
    }
    if (scannedCode) {
      onScanSuccess(scannedCode.trim());
    }
    onClose();
  };

  const toggleCameraFacing = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
    }
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-sky-100 w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">{title}</h3>
              <p className="text-xs text-slate-500">{description}</p>
            </div>
          </div>
          <button
            onClick={() => stopAndClose()}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Scanner Viewport */}
        <div className="relative bg-slate-950 flex-1 min-h-[300px] flex items-center justify-center overflow-hidden">
          <div id={containerId} className="w-full h-full min-h-[300px]"></div>

          {/* Laser guideline overlay */}
          {!errorMessage && !isStarting && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className="w-[280px] h-[180px] border-2 border-sky-400 rounded-xl relative overflow-hidden shadow-[0_0_20px_rgba(14,165,233,0.3)]">
                {/* Horizontal scan laser */}
                <div className="w-full h-0.5 bg-sky-400 shadow-[0_0_8px_#38bdf8] absolute top-1/2 -translate-y-1/2 animate-pulse" />
                <span className="absolute bottom-2 inset-x-0 text-center text-[11px] font-medium text-sky-200 bg-slate-950/70 py-0.5">
                  Align barcode inside box
                </span>
              </div>
            </div>
          )}

          {/* Loading spinner */}
          {isStarting && !errorMessage && (
            <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center gap-3">
              <RefreshCw className="w-8 h-8 text-sky-400 animate-spin" />
              <p className="text-xs text-slate-300 font-medium">Starting camera...</p>
            </div>
          )}

          {/* Error display */}
          {errorMessage && (
            <div className="absolute inset-0 bg-slate-950 p-6 flex flex-col items-center justify-center text-center gap-3">
              <AlertCircle className="w-10 h-10 text-rose-500" />
              <h4 className="text-sm font-semibold text-white">Camera Access Error</h4>
              <p className="text-xs text-slate-400 max-w-xs">{errorMessage}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => {
                    setErrorMessage(null);
                    setFacingMode(f => f);
                  }}
                  className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-medium"
                >
                  Retry Camera
                </button>
                <button
                  onClick={() => stopAndClose()}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-5 py-3.5 bg-sky-50/60 border-t border-sky-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-sky-600" />
            <span>Beeps on successful scan</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleCameraFacing}
              className="px-2.5 py-1 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-lg flex items-center gap-1.5 text-xs transition-colors"
              title="Switch between front and back camera"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Switch Camera</span>
            </button>
            <button
              onClick={() => stopAndClose()}
              className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
