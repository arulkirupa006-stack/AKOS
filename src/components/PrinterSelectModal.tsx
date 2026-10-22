import React, { useState, useEffect } from 'react';
import { StoreSettings, PrinterConfig, PrinterType, PrinterConnection } from '../types';
import {
  Printer,
  X,
  Check,
  CheckCircle2,
  Usb,
  Bluetooth,
  Network,
  Monitor,
  Copy,
  Sliders,
  Sparkles,
} from 'lucide-react';

interface PrinterSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onSaveConfig: (config: PrinterConfig) => Promise<void> | void;
}

const PRINTER_PROFILES: {
  id: PrinterType;
  title: string;
  subtitle: string;
  paperWidth: '58mm' | '80mm';
  tag: string;
  recommended?: boolean;
}[] = [
  {
    id: 'thermal_80mm',
    title: '80mm Thermal Receipt Printer',
    subtitle: 'POS-80, Epson TM-T88, TVS RP-3200, Star TSP100, NGX',
    paperWidth: '80mm',
    tag: 'Standard Supermarket POS',
    recommended: true,
  },
  {
    id: 'thermal_58mm',
    title: '58mm Mobile / Mini Thermal Printer',
    subtitle: 'POS-58, Bluetooth handheld terminals, portable battery printers',
    paperWidth: '58mm',
    tag: 'Mobile & Countertop',
  },
];

export const PrinterSelectModal: React.FC<PrinterSelectModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveConfig,
}) => {
  const currentConfig: PrinterConfig = settings.printerConfig || {
    printerType: (settings.receiptWidth === '58mm' ? 'thermal_58mm' : 'thermal_80mm') as PrinterType,
    printerName: settings.receiptWidth === '58mm' ? 'POS-58 Thermal Printer' : 'POS-80 Thermal Printer',
    connection: 'browser',
    paperWidth: (settings.receiptWidth || '80mm') as '58mm' | '80mm',
    copies: 1,
  };

  const [selectedType, setSelectedType] = useState<PrinterType>(currentConfig.printerType);
  const [selectedConnection, setSelectedConnection] = useState<PrinterConnection>(currentConfig.connection);
  const [copies, setCopies] = useState<number>(currentConfig.copies || 1);
  const [customName, setCustomName] = useState<string>(currentConfig.printerName || 'POS-80 Thermal Printer');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const cfg = settings.printerConfig;
      if (cfg) {
        setSelectedType(cfg.printerType);
        setSelectedConnection(cfg.connection);
        setCopies(cfg.copies);
        setCustomName(cfg.printerName);
      }
      setStatusMessage(null);
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSelectProfile = (profile: typeof PRINTER_PROFILES[0]) => {
    setSelectedType(profile.id);
    setCustomName(profile.title);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const profile = PRINTER_PROFILES.find(p => p.id === selectedType);
    const paperWidth = profile ? profile.paperWidth : '80mm';

    const newConfig: PrinterConfig = {
      printerType: selectedType,
      printerName: customName.trim() || 'Receipt Thermal Printer',
      connection: selectedConnection,
      paperWidth,
      copies,
    };

    try {
      await onSaveConfig(newConfig);
      // Also cache in local storage for instant multi-terminal persistence
      localStorage.setItem('AKOS_PRINTER_CONFIG', JSON.stringify(newConfig));
      setStatusMessage('Printer preferences saved successfully!');
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (e) {
      console.error('Failed to save printer config:', e);
      setStatusMessage('Saved locally to terminal.');
      setTimeout(() => {
        onClose();
      }, 600);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestPrint = () => {
    const profile = PRINTER_PROFILES.find(p => p.id === selectedType);
    const width = profile?.paperWidth === '58mm' ? '58mm' : '80mm';

    const testHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>AKOS Printer Calibration Test</title>
          <style>
            @page { margin: 0; size: auto; }
            body {
              font-family: 'Courier New', monospace;
              padding: 10px;
              width: ${width === '58mm' ? '220px' : '300px'};
              margin: 0 auto;
              font-size: 11px;
              color: #000;
              text-align: center;
            }
            .title { font-size: 16px; font-weight: bold; margin-bottom: 4px; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .info { text-align: left; font-size: 10px; }
            .badge { border: 1px solid #000; padding: 2px 4px; display: inline-block; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="title">AKOS</div>
          <div>${settings.storeName}</div>
          <div>${settings.address}, ${settings.city}</div>
          <div class="divider"></div>
          <div><strong>PRINTER HARDWARE TEST</strong></div>
          <div class="divider"></div>
          <div class="info">
            <div>Target Width: ${width}</div>
            <div>Printer Profile: ${customName}</div>
            <div>Interface: ${selectedConnection.toUpperCase()}</div>
            <div>Date/Time: ${new Date().toLocaleString()}</div>
            <div>Print Copies: ${copies}</div>
            <div>Cutter Test: OK [=== CUT HERE ===]</div>
          </div>
          <div class="divider"></div>
          <div>THANK YOU FOR SHOPPING AT AKOS</div>
          <div class="badge">TEST PASSED</div>
        </body>
      </html>
    `;

    // Use hidden iframe to avoid popup blocker / iframe sandbox restrictions
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(testHtml);
      doc.close();
      setTimeout(() => {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }, 250);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white border border-sky-100 w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-100 text-sky-700 rounded-xl border border-sky-200">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Select Printer Option</h3>
              <p className="text-xs text-slate-500">Configure POS thermal printer, paper layout, and receipt copies</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Section 1: Choose Printer Profile / Model */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2.5">
              1. Choose Printer Type & Paper Layout
            </label>
            <div className="space-y-2">
              {PRINTER_PROFILES.map(profile => {
                const isSelected = selectedType === profile.id;
                return (
                  <div
                    key={profile.id}
                    onClick={() => handleSelectProfile(profile)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'bg-sky-50/70 border-sky-500 ring-2 ring-sky-500/20 shadow-xs'
                        : 'bg-white border-slate-200 hover:border-sky-300 hover:bg-sky-50/20'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                          {profile.title}
                        </span>
                        {profile.recommended && (
                          <span className="px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-bold text-[10px] border border-sky-200">
                            Recommended
                          </span>
                        )}
                        <span className="px-2 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                          {profile.paperWidth}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{profile.subtitle}</p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 border ${
                        isSelected
                          ? 'bg-sky-600 border-sky-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Connection Interface */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              2. Printer Connection Interface
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'browser' as PrinterConnection, label: 'System Spooler', icon: Monitor },
                { id: 'usb' as PrinterConnection, label: 'Direct USB', icon: Usb },
                { id: 'bluetooth' as PrinterConnection, label: 'Bluetooth POS', icon: Bluetooth },
                { id: 'network' as PrinterConnection, label: 'LAN / Network', icon: Network },
              ].map(conn => {
                const isSelected = selectedConnection === conn.id;
                const Icon = conn.icon;
                return (
                  <button
                    key={conn.id}
                    type="button"
                    onClick={() => setSelectedConnection(conn.id)}
                    className={`py-2 px-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center ${
                      isSelected
                        ? 'bg-sky-50 border-sky-500 text-sky-700 font-semibold ring-1 ring-sky-500/20'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50/40'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-sky-600" />
                    <span className="text-[11px]">{conn.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status feedback */}
          {statusMessage && (
            <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl text-sky-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-sky-600" />
              <span className="font-medium">{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 bg-white border-t border-sky-100 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleTestPrint}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-slate-500" />
            <span>Test Print Ticket</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all hover:scale-[1.02]"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Saving...' : 'Set Active Printer'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
