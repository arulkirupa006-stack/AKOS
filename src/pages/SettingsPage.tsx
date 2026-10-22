import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { StoreSettings, PrinterConfig, PrinterType, PrinterConnection } from '../types';
import { updateStoreSettings } from '../services/db';
import {
  Settings,
  Save,
  CheckCircle2,
  AlertCircle,
  Store,
  Receipt,
  Sliders,
  Printer,
  Usb,
  Bluetooth,
  Network,
  Monitor,
} from 'lucide-react';
import { PrinterSelectModal } from '../components/PrinterSelectModal';

export const SettingsPage: React.FC = () => {
  const { storeSettings, refreshSettings } = useAuth();

  const [formData, setFormData] = useState<StoreSettings>({ ...storeSettings });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [printerModalOpen, setPrinterModalOpen] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      await updateStoreSettings(formData);
      await refreshSettings();
      setFeedback({
        type: 'success',
        text: 'Store settings saved successfully and updated across receipts & dashboard.',
      });
    } catch (err: any) {
      console.error('Failed to save settings:', err);
      setFeedback({ type: 'error', text: 'Error saving settings to database.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePrinterConfig = (updates: Partial<PrinterConfig>) => {
    const currentConfig: PrinterConfig = formData.printerConfig || {
      printerType: formData.receiptWidth === '58mm' ? 'thermal_58mm' : 'thermal_80mm',
      printerName: formData.receiptWidth === '58mm' ? 'POS-58 Thermal Printer' : 'POS-80 Thermal Printer',
      connection: 'browser',
      paperWidth: formData.receiptWidth || '80mm',
      copies: 1,
    };

    const newConfig = { ...currentConfig, ...updates };
    setFormData({
      ...formData,
      printerConfig: newConfig,
      receiptWidth: newConfig.paperWidth === '58mm' ? '58mm' : '80mm',
    });
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3.5 bg-white border border-sky-100 rounded-2xl p-4 sm:px-6 shadow-xs">
        <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-slate-900">Store Settings & Branding</h1>
          <p className="text-xs text-slate-500">
            Configure store contact information, currency, low-stock threshold, and thermal receipt formats.
          </p>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
            feedback.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-sky-50 border-sky-200 text-sky-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-600" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-slate-700 font-bold px-1">
            ×
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Section 1: Store Identity */}
        <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-sky-100">
            <Store className="w-4 h-4 text-sky-600" />
            <span>Store Profile & Contact</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Store Name *
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={e => setFormData({ ...formData, storeName: e.target.value })}
                placeholder="AKOS Supermarket"
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Street Address *
              </label>
              <input
                type="text"
                required
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                placeholder="42 Commercial Boulevard, Market Square"
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                City / Town *
              </label>
              <input
                type="text"
                required
                value={formData.city}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="Metro City"
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Billing & Currency Settings */}
        <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-sky-100">
            <Sliders className="w-4 h-4 text-sky-600" />
            <span>Billing & Inventory Rules</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Currency Symbol * (default: ₹)
              </label>
              <input
                type="text"
                required
                value={formData.currencySymbol}
                onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                placeholder="₹"
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Default Low-Stock Warning Threshold *
              </label>
              <input
                type="number"
                min="1"
                required
                value={formData.lowStockThreshold}
                onChange={e => setFormData({ ...formData, lowStockThreshold: parseInt(e.target.value, 10) || 10 })}
                placeholder="10"
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Receipt Template & Printer Selection */}
        <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-sky-100">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
              <Printer className="w-4 h-4 text-sky-600" />
              <span>Printer & Thermal Receipt Setup</span>
            </div>
            <button
              type="button"
              onClick={() => setPrinterModalOpen(true)}
              className="px-3 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5 text-sky-600" />
              <span>Select Printer Option</span>
            </button>
          </div>

          <div className="space-y-4">
            {/* Active Printer Option Details */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Default Printer Option & Paper Layout
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    handleUpdatePrinterConfig({
                      printerType: 'thermal_80mm',
                      printerName: 'POS-80 Thermal Printer',
                      paperWidth: '80mm',
                    });
                  }}
                  className={`p-3 rounded-xl border text-left font-medium transition-colors ${
                    (formData.printerConfig?.paperWidth || formData.receiptWidth) === '80mm'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold ring-1 ring-sky-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50/40'
                  }`}
                >
                  <div className="font-semibold text-slate-900">80 mm Thermal Roll</div>
                  <div className="text-[11px] text-slate-500">POS-80 / Epson / TVS / Star</div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleUpdatePrinterConfig({
                      printerType: 'thermal_58mm',
                      printerName: 'POS-58 Mobile Printer',
                      paperWidth: '58mm',
                    });
                  }}
                  className={`p-3 rounded-xl border text-left font-medium transition-colors ${
                    (formData.printerConfig?.paperWidth || formData.receiptWidth) === '58mm'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 font-bold ring-1 ring-sky-500/20'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50/40'
                  }`}
                >
                  <div className="font-semibold text-slate-900">58 mm Mobile Roll</div>
                  <div className="text-[11px] text-slate-500">POS-58 / Bluetooth Handheld</div>
                </button>

              </div>
            </div>

            {/* Quick Toggle Settings */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-sky-50/40 border border-sky-100 rounded-xl space-y-2 text-xs">
                <span className="font-semibold text-slate-800">Print Copies</span>
                <p className="text-[11px] text-slate-500">Print 1 copy for customer or 2 copies for filing</p>
                <div className="flex gap-2 pt-1">
                  {[1, 2].map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleUpdatePrinterConfig({ copies: c })}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                        (formData.printerConfig?.copies || 1) === c
                          ? 'bg-sky-600 text-white border-sky-600'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50'
                      }`}
                    >
                      {c} {c === 1 ? 'Copy' : 'Copies'}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Receipt Footer Message
              </label>
              <textarea
                rows={2}
                value={formData.receiptFooter}
                onChange={e => setFormData({ ...formData, receiptFooter: e.target.value })}
                placeholder="Thank you for shopping at AKOS Supermarket! Visit again."
                className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition-all hover:scale-[1.01]"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Printer Select Modal */}
      <PrinterSelectModal
        isOpen={printerModalOpen}
        onClose={() => setPrinterModalOpen(false)}
        settings={formData}
        onSaveConfig={async (newConfig: PrinterConfig) => {
          setFormData({
            ...formData,
            printerConfig: newConfig,
            receiptWidth: newConfig.paperWidth === '58mm' ? '58mm' : '80mm',
          });
          await updateStoreSettings({
            printerConfig: newConfig,
            receiptWidth: newConfig.paperWidth === '58mm' ? '58mm' : '80mm',
          });
          await refreshSettings();
        }}
      />
    </div>
  );
};
