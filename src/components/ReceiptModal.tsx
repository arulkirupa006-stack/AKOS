import React, { useState, useEffect } from 'react';
import { Sale, StoreSettings, PrinterConfig } from '../types';
import { Printer, X, HelpCircle, CheckCircle2, Sliders, ChevronDown } from 'lucide-react';
import { PrinterSelectModal } from './PrinterSelectModal';
import { updateStoreSettings } from '../services/db';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  settings: StoreSettings;
  onSettingsUpdate?: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  isOpen,
  onClose,
  sale,
  settings,
  onSettingsUpdate,
}) => {
  const [paperWidth, setPaperWidth] = useState<'58mm' | '80mm'>(
    (settings.printerConfig?.paperWidth || settings.receiptWidth || '80mm') as '58mm' | '80mm'
  );
  const [showPrintHelp, setShowPrintHelp] = useState(false);
  const [showPrinterSelect, setShowPrinterSelect] = useState(false);
  const [activePrinterName, setActivePrinterName] = useState<string>(
    settings.printerConfig?.printerName || 'POS-80 Thermal Printer'
  );

  useEffect(() => {
    if (settings.printerConfig) {
      setPaperWidth(settings.printerConfig.paperWidth);
      setActivePrinterName(settings.printerConfig.printerName);
    } else if (settings.receiptWidth) {
      setPaperWidth(settings.receiptWidth);
      setActivePrinterName(settings.receiptWidth === '58mm' ? 'POS-58 Thermal Printer' : 'POS-80 Thermal Printer');
    }
  }, [settings]);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSavePrinterConfig = async (newConfig: PrinterConfig) => {
    setPaperWidth(newConfig.paperWidth);
    setActivePrinterName(newConfig.printerName);
    try {
      await updateStoreSettings({
        printerConfig: newConfig,
        receiptWidth: newConfig.paperWidth === '58mm' ? '58mm' : '80mm',
      });
      if (onSettingsUpdate) onSettingsUpdate();
    } catch (e) {
      console.error('Error saving printer settings:', e);
    }
  };

  const currency = settings.currencySymbol || '₹';
  const totalMrp = sale.items.reduce((sum, i) => sum + i.mrp * i.quantity, 0);
  const totalSavings = Math.max(0, totalMrp - sale.grandTotal);
  const printMerchantCopy = false;

  const renderSingleReceipt = (copyTitle: string) => (
    <div className="text-slate-900 font-mono text-[11px] leading-relaxed">
      {/* Header / Logo / Store info */}
      <div className="text-center pb-3 border-b border-dashed border-slate-400">
        <div className="text-xl font-extrabold tracking-wider text-slate-950">AKOS</div>
        <div className="text-xs font-bold text-slate-800 uppercase tracking-wide">
          {settings.storeName}
        </div>
        <div className="text-[11px] text-slate-600 mt-0.5">{settings.address}</div>
        <div className="text-[11px] text-slate-600">
          {settings.city}
        </div>
        {copyTitle && (
          <div className="mt-1 inline-block px-2 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-300">
            {copyTitle}
          </div>
        )}
      </div>

      {/* Bill details */}
      <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-0.5">
        <div className="flex justify-between">
          <span className="text-slate-600">Bill No:</span>
          <span className="font-bold text-slate-900">{sale.billNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-600">Date & Time:</span>
          <span>{new Date(sale.createdAt).toLocaleString()}</span>
        </div>
        {sale.cashierName !== 'Store Administrator' && (
          <div className="flex justify-between">
            <span className="text-slate-600">Cashier:</span>
            <span className="font-medium">{sale.cashierName}</span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-slate-600">Payment:</span>
          <span className="font-bold uppercase text-slate-900">{sale.paymentMethod}</span>
        </div>
        {sale.paymentReference && (
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Ref No:</span>
            <span className="font-mono">{sale.paymentReference}</span>
          </div>
        )}
      </div>

      {/* Items Table */}
      <div className="py-2.5 border-b border-dashed border-slate-400">
        <div className="flex justify-between text-[11px] font-bold text-slate-800 pb-1 border-b border-slate-300">
          <span>ITEM</span>
          <span>QTY x RATE</span>
          <span className="text-right">AMT</span>
        </div>

        <div className="divide-y divide-slate-100 mt-1 space-y-1">
          {sale.items.map((item, idx) => (
            <div key={idx} className="pt-1 text-[11px]">
              <div className="font-medium text-slate-950 truncate">{item.name}</div>
              <div className="flex justify-between text-slate-600 tabular-nums">
                <span>
                  {item.quantity} x {currency}{item.sellingPrice.toFixed(2)}
                  {item.mrp > item.sellingPrice && (
                    <span className="line-through text-slate-400 ml-1 text-[10px]">
                      {currency}{item.mrp.toFixed(2)}
                    </span>
                  )}
                </span>
                <span className="font-bold text-slate-950">
                  {currency}{item.total.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Financial Summary */}
      <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1 tabular-nums">
        <div className="flex justify-between">
          <span className="text-slate-600">Items Subtotal:</span>
          <span>{currency}{sale.subtotal.toFixed(2)}</span>
        </div>

        {sale.discount > 0 && (
          <div className="flex justify-between text-sky-700 font-medium">
            <span>Bill Discount:</span>
            <span>-{currency}{sale.discount.toFixed(2)}</span>
          </div>
        )}

        <div className="flex justify-between text-base font-extrabold text-slate-950 pt-1.5 border-t border-slate-400">
          <span>GRAND TOTAL:</span>
          <span>{currency}{sale.grandTotal.toFixed(2)}</span>
        </div>

        {/* Removed Cash Tendered/Change Due block as requested */}
        {sale.paymentMethod === 'cash' && (
          <div className="pt-1.5 border-t border-dotted border-slate-300">
            <div className="flex justify-between font-bold text-slate-950">
              <span>Method:</span>
              <span>{sale.paymentMethod.toUpperCase()}</span>
            </div>
          </div>
        )}

        {totalSavings > 0 && (
          <div className="mt-2 p-1.5 bg-sky-50 text-sky-800 text-center font-bold rounded text-[10px] border border-sky-100">
            *** You saved {currency}{totalSavings.toFixed(2)} today! ***
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="pt-3 text-center text-[10px] text-slate-600 space-y-1">
        <p className="font-medium">{settings.receiptFooter}</p>
        <p className="text-slate-400 text-[9px] pt-1">Printed via AKOS Supermarket POS</p>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
        <div className="bg-white border border-sky-100 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Receipt</h3>
                <p className="text-xs text-sky-700 font-mono font-semibold">Bill #{sale.billNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Select Printer / Width selector */}
              <div className="flex items-center bg-white border border-sky-200 rounded-lg p-0.5 text-xs">
                <button
                  onClick={() => setPaperWidth('58mm')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    paperWidth === '58mm'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  58mm
                </button>
                <button
                  onClick={() => setPaperWidth('80mm')}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    paperWidth === '80mm'
                      ? 'bg-sky-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  80mm
                </button>
              </div>

              {/* Select Printer Options Button */}
              <button
                onClick={() => setShowPrinterSelect(true)}
                className="px-2.5 py-1.5 bg-white hover:bg-sky-50 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Select Printer Model & Settings"
              >
                <Sliders className="w-3.5 h-3.5 text-sky-600" />
                <span className="hidden sm:inline">Select Printer</span>
              </button>

              <button
                onClick={() => setShowPrintHelp(!showPrintHelp)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Thermal Printer Setup Guide"
              >
                <HelpCircle className="w-4 h-4" />
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Active Printer Badge Bar */}
          <div className="px-6 py-2 bg-sky-50/40 border-b border-sky-100 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Active Printer:</span>
              <button
                onClick={() => setShowPrinterSelect(true)}
                className="font-semibold text-sky-700 hover:text-sky-800 flex items-center gap-1 hover:underline cursor-pointer"
              >
                <span>{activePrinterName}</span>
                <ChevronDown className="w-3 h-3 text-sky-600" />
              </button>
            </div>
          </div>

          {/* Thermal Print Setup Help Box */}
          {showPrintHelp && (
            <div className="p-4 bg-sky-50 border-b border-sky-200 text-xs text-slate-700">
              <h4 className="font-semibold text-sky-800 mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-sky-600" /> How to connect & print to 58mm / 80mm thermal printers:
              </h4>
              <ol className="list-decimal list-inside space-y-1 text-slate-600 pl-1 mt-1">
                <li>Click <strong>"Print Receipt"</strong> below to open the browser print dialog.</li>
                <li>Under <strong>Destination</strong>, select your connected USB, Bluetooth, or Network thermal receipt printer (e.g. POS-58, POS-80, Epson TM-T88, TVS, or Star Micronics).</li>
                <li>Under <strong>Paper Size</strong>, select <strong>58mm</strong> or <strong>80mm Roll</strong> (or Continuous).</li>
                <li>Set <strong>Margins</strong> to <strong>None</strong> or <strong>Minimum</strong>, and uncheck "Headers and footers".</li>
              </ol>
            </div>
          )}

          {/* Receipt Preview Area */}
          <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center bg-slate-100/70">
            <div
              id="printable-receipt"
              className={`bg-white text-slate-900 shadow-md border border-slate-300 rounded p-4 transition-all duration-200 ${
                paperWidth === '58mm'
                  ? 'w-[260px]'
                  : paperWidth === '80mm'
                  ? 'w-[360px]'
                  : 'w-[480px]'
              }`}
            >
              {/* Customer Copy */}
              {renderSingleReceipt('')}

              {/* Optional Merchant Duplicate Copy */}
              {printMerchantCopy && (
                <div className="mt-6 pt-4 border-t-2 border-dashed border-slate-400">
                  <div className="text-center text-[10px] text-slate-400 mb-2 font-mono">
                    --- CUT HERE ---
                  </div>
                  {renderSingleReceipt('MERCHANT COPY')}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="px-6 py-4 bg-white border-t border-sky-100 flex items-center justify-between">
            <button
              onClick={() => setShowPrinterSelect(true)}
              className="text-xs text-sky-700 hover:text-sky-800 font-semibold flex items-center gap-1.5 hover:underline"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Change Printer Settings</span>
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
              >
                Done
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02]"
              >
                <Printer className="w-4 h-4" />
                <span>Print to {activePrinterName}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Printer Select Modal */}
      <PrinterSelectModal
        isOpen={showPrinterSelect}
        onClose={() => setShowPrinterSelect(false)}
        settings={settings}
        onSaveConfig={handleSavePrinterConfig}
      />
    </>
  );
};
