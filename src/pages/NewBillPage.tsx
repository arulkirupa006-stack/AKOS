import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Product, SaleItem, Sale, PaymentMethod } from '../types';
import {
  getProductByBarcode,
  getProducts,
  processSale,
  generateBillNumber,
  saveOfflineSale,
} from '../services/db';
import { CameraScannerModal } from '../components/CameraScannerModal';
import { ReceiptModal } from '../components/ReceiptModal';
import { PrinterSelectModal } from '../components/PrinterSelectModal';
import { updateStoreSettings } from '../services/db';
import { PrinterConfig } from '../types';
import {
  Camera,
  Barcode,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  CircleDollarSign,
  Printer,
  RotateCcw,
  Edit3,
  X,
  Sliders,
} from 'lucide-react';

export const NewBillPage: React.FC = () => {
  const { currentUser, storeSettings, isOnline, refreshSettings } = useAuth();
  const currency = storeSettings.currencySymbol || '₹';

  // Bill state
  const [billNumber, setBillNumber] = useState<string>('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountReceived, setAmountReceived] = useState<string>('');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [printerModalOpen, setPrinterModalOpen] = useState<boolean>(false);

  // Barcode input state
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [isSearchingBarcode, setIsSearchingBarcode] = useState<boolean>(false);
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'error' | 'success' | 'warning'; text: string } | null>(
    null
  );

  // Manual Billing / Custom Item state
  const [manualModalOpen, setManualModalOpen] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>('');
  const [manualPrice, setManualPrice] = useState<string>('');
  const [manualMrp, setManualMrp] = useState<string>('');
  const [manualQty, setManualQty] = useState<string>('1');
  const [manualDiscount, setManualDiscount] = useState<string>('0');

  // Manual catalog search quick-picker fallback
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [manualSearchQuery, setManualSearchQuery] = useState<string>('');
  const [manualSearchResults, setManualSearchResults] = useState<Product[]>([]);

  // Checkout & receipt state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [receiptOpen, setReceiptOpen] = useState<boolean>(false);

  // Focus ref for barcode input to keep cashier hands on keyboard/scanner
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Init new bill number on mount
  useEffect(() => {
    generateBillNumber().then(setBillNumber);
    getProducts().then(setAllProducts).catch(console.error);
    focusBarcodeField();
  }, []);

  const focusBarcodeField = () => {
    setTimeout(() => {
      if (barcodeInputRef.current) {
        barcodeInputRef.current.focus();
      }
    }, 150);
  };

  // Filter products for quick search dropdown
  useEffect(() => {
    if (!manualSearchQuery.trim()) {
      setManualSearchResults([]);
      return;
    }
    const q = manualSearchQuery.toLowerCase();
    const matches = allProducts
      .filter(p => p.name.toLowerCase().includes(q) || p.barcode.includes(q))
      .slice(0, 6);
    setManualSearchResults(matches);
  }, [manualSearchQuery, allProducts]);

  // BARCODE BILLING WORKFLOW
  const handleBarcodeLookup = useCallback(
    async (codeToSearch: string) => {
      const code = codeToSearch.trim();
      if (!code) return;

      setIsSearchingBarcode(true);
      setMessage(null);

      try {
        const product = await getProductByBarcode(code);

        if (!product) {
          setMessage({
            type: 'warning',
            text: `Barcode "${code}" is unknown. Please ask an Admin to add this product to AKOS catalog.`,
          });
          setBarcodeInput('');
          focusBarcodeField();
          return;
        }

        // Add or increment in cart
        setCart(prevCart => {
          const existingIndex = prevCart.findIndex(item => item.productId === product.id);

          if (existingIndex > -1) {
            const currentItem = prevCart[existingIndex];
            if (currentItem.quantity >= product.stock) {
              setMessage({
                type: 'error',
                text: `Cannot add more. Available stock for "${product.name}" is only ${product.stock}.`,
              });
              return prevCart;
            }
            const updated = [...prevCart];
            const newQty = currentItem.quantity + 1;
            updated[existingIndex] = {
              ...currentItem,
              quantity: newQty,
              total: (currentItem.sellingPrice - currentItem.discount) * newQty,
            };
            setMessage({
              type: 'success',
              text: `Added another "${product.name}" (Qty: ${newQty}). Stock: ${product.stock}`,
            });
            return updated;
          } else {
            if (product.stock < 1) {
              setMessage({
                type: 'error',
                text: `"${product.name}" is out of stock (Stock: 0). Cannot add to bill.`,
              });
              return prevCart;
            }
            const newItem: SaleItem = {
              productId: product.id,
              name: product.name,
              barcode: product.barcode,
              mrp: product.mrp,
              sellingPrice: product.sellingPrice,
              quantity: 1,
              discount: 0,
              total: product.sellingPrice,
            };
            setMessage({
              type: 'success',
              text: `Added "${product.name}" (${currency}${product.sellingPrice.toFixed(2)}). Stock: ${product.stock}`,
            });
            return [newItem, ...prevCart];
          }
        });

        setBarcodeInput('');
      } catch (err: any) {
        console.error('Barcode lookup error:', err);
        setMessage({
          type: 'error',
          text: err?.message || 'Error looking up barcode from database.',
        });
      } finally {
        setIsSearchingBarcode(false);
        focusBarcodeField();
      }
    },
    [currency]
  );

  // USB/Bluetooth Barcode Scanner Keyboard Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT' && target !== barcodeInputRef.current) {
        return;
      }
      if (e.key === 'F2') {
        e.preventDefault();
        setScannerOpen(true);
      }
      if (e.key === 'F4') {
        e.preventDefault();
        setManualModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleBarcodeFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (barcodeInput.trim()) {
      handleBarcodeLookup(barcodeInput);
    }
  };

  const handleAddManualItem = (e: React.FormEvent) => {
    e.preventDefault();
    const name = manualName.trim();
    const price = parseFloat(manualPrice);
    const qty = parseFloat(manualQty) || 1;
    const mrp = parseFloat(manualMrp) || price;
    const discount = parseFloat(manualDiscount) || 0;

    if (!name) {
      setMessage({ type: 'error', text: 'Please enter a name or description for the manual item.' });
      return;
    }

    if (isNaN(price) || price <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid selling price greater than 0.' });
      return;
    }

    if (qty <= 0) {
      setMessage({ type: 'error', text: 'Quantity must be greater than 0.' });
      return;
    }

    const newItem: SaleItem = {
      productId: `manual_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      barcode: 'MANUAL',
      mrp,
      sellingPrice: price,
      quantity: qty,
      discount,
      total: (price - discount) * qty,
    };

    setCart(prev => [newItem, ...prev]);
    setMessage({
      type: 'success',
      text: `Added manual item "${name}" (${currency}${price.toFixed(2)} x ${qty}) to bill.`,
    });

    setManualModalOpen(false);
    setManualName('');
    setManualPrice('');
    setManualMrp('');
    setManualQty('1');
    setManualDiscount('0');
    focusBarcodeField();
  };

  const updateItemQuantity = (productId: string, newQty: number) => {
    const isManual = productId.startsWith('manual_');
    const product = allProducts.find(p => p.id === productId);
    const maxStock = isManual ? 9999 : (product ? product.stock : 9999);

    if (newQty <= 0) {
      removeItem(productId);
      return;
    }

    if (!isManual && newQty > maxStock) {
      setMessage({
        type: 'error',
        text: `Cannot set quantity to ${newQty}. Available stock is only ${maxStock}.`,
      });
      return;
    }

    setCart(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          return {
            ...item,
            quantity: newQty,
            total: (item.sellingPrice - item.discount) * newQty,
          };
        }
        return item;
      })
    );
  };

  const updateItemDiscount = (productId: string, discount: number) => {
    setCart(prev =>
      prev.map(item => {
        if (item.productId === productId) {
          const validDiscount = Math.max(0, Math.min(item.sellingPrice, discount));
          return {
            ...item,
            discount: validDiscount,
            total: (item.sellingPrice - validDiscount) * item.quantity,
          };
        }
        return item;
      })
    );
  };

  const removeItem = (productId: string) => {
    setCart(prev => prev.filter(i => i.productId !== productId));
    focusBarcodeField();
  };

  const clearBill = () => {
    if (cart.length > 0 && !window.confirm('Clear all items from this bill?')) {
      return;
    }
    setCart([]);
    setBillDiscount(0);
    setAmountReceived('');
    setPaymentRef('');
    setMessage(null);
    generateBillNumber().then(setBillNumber);
    focusBarcodeField();
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const grandTotal = Math.max(0, subtotal - billDiscount);
  const totalMrp = cart.reduce((sum, item) => sum + item.mrp * item.quantity, 0);
  const totalSavings = Math.max(0, totalMrp - grandTotal);

  const receivedNum = parseFloat(amountReceived) || 0;
  const changeDue = paymentMethod === 'cash' ? Math.max(0, receivedNum - grandTotal) : 0;

  // COMPLETE SALE
  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      setMessage({ type: 'error', text: 'Cart is empty. Scan products before checking out.' });
      return;
    }

    if (paymentMethod === 'cash' && receivedNum < grandTotal && receivedNum > 0) {
      setMessage({
        type: 'error',
        text: `Cash tendered (${currency}${receivedNum.toFixed(2)}) is less than Grand Total (${currency}${grandTotal.toFixed(2)}).`,
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const salePayload: Omit<Sale, 'id' | 'createdAt'> = {
      billNumber,
      cashierId: currentUser?.id || 'cashier_1',
      cashierName: currentUser?.fullName || 'Cashier',
      items: cart.map(item => ({
        ...item,
        discount: item.discount || 0,
      })),
      subtotal,
      discount: billDiscount || 0,
      grandTotal,
      paymentMethod,
      ...(paymentMethod === 'cash'
        ? {
            amountReceived: receivedNum > 0 ? receivedNum : grandTotal,
            changeDue: changeDue || 0,
          }
        : {}),
      ...(paymentRef.trim() ? { paymentReference: paymentRef.trim() } : {}),
    };

    try {
      let finalSale: Sale;

      if (!isOnline) {
        const offlineSale: Sale = {
          ...salePayload,
          id: `off_${Date.now()}`,
          createdAt: new Date().toISOString(),
        };
        saveOfflineSale(offlineSale);
        finalSale = offlineSale;
        setMessage({
          type: 'warning',
          text: `Sale saved to offline storage (Bill #${billNumber}). It will synchronize when online.`,
        });
      } else {
        finalSale = await processSale(salePayload);
        setMessage({
          type: 'success',
          text: `Bill #${billNumber} completed successfully! Stock updated.`,
        });
      }

      setCompletedSale(finalSale);
      setReceiptOpen(true);

      // Reset for next customer
      setCart([]);
      setBillDiscount(0);
      setAmountReceived('');
      setPaymentRef('');
      generateBillNumber().then(setBillNumber);

      // Refresh products cache to update stocks
      getProducts().then(setAllProducts).catch(console.error);
    } catch (err: any) {
      console.error('Checkout error:', err);
      setMessage({
        type: 'error',
        text: err?.message || 'Failed to complete transaction.',
      });
    } finally {
      setIsSubmitting(false);
      focusBarcodeField();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-sky-100 rounded-2xl p-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <Barcode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900">Cashier Billing Terminal</h1>
              <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 font-semibold border border-sky-200">
                {billNumber}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Cashier: <strong className="text-slate-800">{currentUser?.fullName}</strong> · Live POS
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setPrinterModalOpen(true)}
            className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
            title="Configure Active Thermal Printer & Paper"
          >
            <Printer className="w-3.5 h-3.5 text-sky-600" />
            <span>Select Printer ({storeSettings.printerConfig?.paperWidth || storeSettings.receiptWidth || '80mm'})</span>
          </button>
          <button
            onClick={() => setManualModalOpen(true)}
            className="px-3.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5 text-sky-600" />
            <span>Manual Billing (F4)</span>
          </button>
          <button
            onClick={clearBill}
            disabled={cart.length === 0}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Clear Bill</span>
          </button>
        </div>
      </div>

      {/* Alert / Feedback message */}
      {message && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            message.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : message.type === 'warning'
              ? 'bg-amber-50 border-amber-200 text-amber-700'
              : 'bg-sky-50 border-sky-200 text-sky-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {message.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            ) : message.type === 'warning' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-500" />
            ) : (
              <CheckCircle className="w-4 h-4 shrink-0 text-sky-600" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700 text-xs font-bold px-1"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Barcode Scanner & Cart Items (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Barcode & Search Controls */}
          <div className="bg-white border border-sky-100 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Barcode Form for Scanner & Manual typing */}
              <form onSubmit={handleBarcodeFormSubmit} className="flex-1 flex gap-2">
                <div className="relative flex-1">
                  <Barcode className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    value={barcodeInput}
                    onChange={e => setBarcodeInput(e.target.value)}
                    placeholder="Scan barcode or type barcode number & press Enter..."
                    disabled={isSearchingBarcode}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-sky-200 rounded-xl text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!barcodeInput.trim() || isSearchingBarcode}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-800 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors"
                >
                  {isSearchingBarcode ? 'Searching...' : 'Add Item'}
                </button>
              </form>

              {/* Camera Scanner Button */}
              <button
                type="button"
                onClick={() => setScannerOpen(true)}
                className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.02] whitespace-nowrap"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Barcode / QR Code</span>
              </button>

              {/* Manual Item Entry Button */}
              <button
                type="button"
                onClick={() => setManualModalOpen(true)}
                className="px-4 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.02] whitespace-nowrap"
              >
                <Edit3 className="w-4 h-4 text-sky-600" />
                <span>Manual Item Entry</span>
              </button>
            </div>

            {/* Quick manual search fallback */}
            <div className="relative pt-1 border-t border-sky-100">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={manualSearchQuery}
                  onChange={e => setManualSearchQuery(e.target.value)}
                  placeholder="Can't scan? Quick search product name (e.g. Rice, Milk, Soap)..."
                  className="w-full pl-9 pr-3 py-1.5 bg-sky-50/40 border border-sky-100 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-400 transition-colors"
                />
              </div>

              {/* Quick Search Results Dropdown */}
              {manualSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-sky-200 rounded-xl shadow-xl z-20 overflow-hidden divide-y divide-sky-100">
                  {manualSearchResults.map(product => (
                    <div
                      key={product.id}
                      onClick={() => {
                        handleBarcodeLookup(product.barcode);
                        setManualSearchQuery('');
                        setManualSearchResults([]);
                      }}
                      className="p-2.5 hover:bg-sky-50/70 cursor-pointer flex items-center justify-between text-xs transition-colors"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          Barcode: {product.barcode} · Stock: {product.stock}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-sky-700">
                          {currency}{product.sellingPrice.toFixed(2)}
                        </div>
                        {product.mrp > product.sellingPrice && (
                          <div className="line-through text-[10px] text-slate-400">
                            {currency}{product.mrp.toFixed(2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Cart Table */}
          <div className="bg-white border border-sky-100 rounded-2xl shadow-xs overflow-hidden">
            <div className="px-5 py-3 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Current Bill Items
                </h3>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-sky-100 text-sky-700 font-bold">
                  {cart.reduce((sum, i) => sum + i.quantity, 0)} items
                </span>
              </div>
              <span className="text-xs text-slate-500 hidden sm:inline">
                Press Enter to scan continuous barcodes
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-sky-50 flex items-center justify-center text-sky-500 border border-sky-100">
                  <Barcode className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold text-slate-800">Bill is Empty</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Scan a barcode using the camera or USB scanner, or type a barcode above to add products to this bill.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-sky-100 bg-sky-50/40 text-slate-600 font-medium">
                      <th className="py-2.5 px-4">#</th>
                      <th className="py-2.5 px-4">Product</th>
                      <th className="py-2.5 px-3 text-right">MRP</th>
                      <th className="py-2.5 px-3 text-right">Selling</th>
                      <th className="py-2.5 px-3 text-center">Quantity</th>
                      <th className="py-2.5 px-3 text-right">Discount</th>
                      <th className="py-2.5 px-4 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100/70">
                    {cart.map((item, index) => {
                      const prod = allProducts.find(p => p.id === item.productId);
                      const currentStock = prod ? prod.stock : 99;

                      return (
                        <tr key={item.productId} className="hover:bg-sky-50/30 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900">{item.name}</div>
                            <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                              {item.productId.startsWith('manual_') ? (
                                <span className="text-sky-700 font-sans font-medium px-1.5 py-0.5 rounded bg-sky-50 border border-sky-200 text-[10px]">
                                  Manual / Loose Item
                                </span>
                              ) : (
                                <>
                                  <span>{item.barcode}</span>
                                  <span className="text-slate-400">·</span>
                                  <span className={currentStock <= 5 ? 'text-amber-600 font-semibold' : 'text-slate-500'}>
                                    Avail: {currentStock}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right font-mono text-slate-500">
                            {currency}{item.mrp.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-medium text-slate-800">
                            {currency}{item.sellingPrice.toFixed(2)}
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => updateItemQuantity(item.productId, item.quantity - 1)}
                                className="w-6 h-6 rounded bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 flex items-center justify-center transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={currentStock}
                                value={item.quantity}
                                onChange={e => {
                                  const val = parseInt(e.target.value, 10);
                                  if (!isNaN(val)) updateItemQuantity(item.productId, val);
                                }}
                                className="w-12 text-center py-0.5 bg-white border border-sky-200 rounded text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-500"
                              />
                              <button
                                onClick={() => updateItemQuantity(item.productId, item.quantity + 1)}
                                disabled={item.quantity >= currentStock}
                                className="w-6 h-6 rounded bg-sky-50 hover:bg-sky-100 disabled:opacity-40 text-sky-700 border border-sky-200 flex items-center justify-center transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              min={0}
                              max={item.sellingPrice}
                              value={item.discount || ''}
                              onChange={e => updateItemDiscount(item.productId, parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="w-14 text-right py-0.5 px-1 bg-white border border-sky-200 rounded text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-sky-700 text-sm">
                            {currency}{item.total.toFixed(2)}
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => removeItem(item.productId)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout & Payment Summary (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white border border-sky-100 rounded-2xl p-5 shadow-xs space-y-5">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 pb-3 border-b border-sky-100">
              Payment & Checkout
            </h3>

            {/* Calculations Breakdown */}
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal ({cart.reduce((s, i) => s + i.quantity, 0)} items):</span>
                <span className="font-mono font-semibold text-slate-800">{currency}{subtotal.toFixed(2)}</span>
              </div>

              {/* Total MRP vs Selling savings */}
              {totalSavings > 0 && (
                <div className="flex justify-between text-sky-700 font-medium">
                  <span>Customer Savings:</span>
                  <span className="font-mono">-{currency}{totalSavings.toFixed(2)}</span>
                </div>
              )}

              {/* Overall Bill Discount */}
              <div className="flex items-center justify-between text-slate-700 pt-1">
                <span>Bill Discount:</span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-400 font-mono">{currency}</span>
                  <input
                    type="number"
                    min={0}
                    max={subtotal}
                    value={billDiscount || ''}
                    onChange={e => setBillDiscount(parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="w-20 text-right py-1 px-2 bg-white border border-sky-200 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Grand Total */}
              <div className="pt-3 border-t border-sky-100 flex items-center justify-between">
                <div>
                  <span className="text-xs uppercase font-bold text-slate-500">Grand Total</span>
                  <div className="text-[11px] text-slate-400">All taxes included</div>
                </div>
                <div className="text-2xl font-black font-mono text-sky-700">
                  {currency}{grandTotal.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-2 border-t border-sky-100">
              <label className="block text-xs font-semibold text-slate-700">
                Payment Method
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                    paymentMethod === 'cash'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50/50'
                  }`}
                >
                  <Banknote className="w-4 h-4 text-sky-600" />
                  <span>Cash</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                    paymentMethod === 'upi'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50/50'
                  }`}
                >
                  <QrCode className="w-4 h-4 text-sky-600" />
                  <span>UPI / QR</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                    paymentMethod === 'card'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50/50'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  <span>Debit / Card</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('other')}
                  className={`py-2 px-3 rounded-xl border flex items-center gap-2 font-medium transition-all ${
                    paymentMethod === 'other'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 ring-2 ring-sky-500/20 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-sky-50/50'
                  }`}
                >
                  <CircleDollarSign className="w-4 h-4 text-sky-600" />
                  <span>Other</span>
                </button>
              </div>
            </div>

            {/* Cash Calculator (Amount received & change due) */}
            {paymentMethod === 'cash' && (
              <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-medium">Cash Received:</span>
                  <div className="flex items-center gap-1">
                    <span className="text-slate-400 font-mono">{currency}</span>
                    <input
                      type="number"
                      value={amountReceived}
                      onChange={e => setAmountReceived(e.target.value)}
                      placeholder={grandTotal.toString()}
                      className="w-24 text-right py-1 px-2 bg-white border border-sky-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                {/* Quick note buttons */}
                <div className="flex gap-1.5 justify-end">
                  {[100, 200, 500, 2000].map(note => (
                    <button
                      key={note}
                      type="button"
                      onClick={() => setAmountReceived(note.toString())}
                      className="px-2 py-0.5 bg-white hover:bg-sky-50 border border-sky-100 text-[10px] font-mono text-slate-700 rounded transition-colors"
                    >
                      {currency}{note}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAmountReceived(grandTotal.toString())}
                    className="px-2 py-0.5 bg-sky-100 hover:bg-sky-200 text-[10px] text-sky-700 font-medium rounded transition-colors"
                  >
                    Exact
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-sky-200/60">
                  <span className="text-slate-600 font-medium">Change Due:</span>
                  <span
                    className={`font-mono text-sm font-bold ${
                      changeDue > 0 ? 'text-sky-700' : 'text-slate-500'
                    }`}
                  >
                    {currency}{changeDue.toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {/* UPI or Card Reference */}
            {(paymentMethod === 'upi' || paymentMethod === 'card') && (
              <div className="space-y-1 text-xs">
                <label className="block text-slate-600 font-medium">
                  {paymentMethod === 'upi' ? 'UPI UTR / Ref No. (Optional)' : 'Card Approval Code (Optional)'}
                </label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  placeholder="e.g. UPI48910283 or AUTH8492"
                  className="w-full px-3 py-1.5 bg-white border border-sky-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
            )}

            {/* Complete Sale Button */}
            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={isSubmitting || cart.length === 0}
              className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl text-sm font-bold shadow-md shadow-sky-600/20 transition-all flex items-center justify-center gap-2 hover:scale-[1.01]"
            >
              <Printer className="w-4 h-4" />
              <span>{isSubmitting ? 'Processing Transaction...' : 'Complete Sale & Print'}</span>
            </button>

            {/* Active Printer Indicator & Selector */}
            <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500">
              <span className="truncate max-w-[190px]">
                Printer: <strong className="text-slate-700">{storeSettings.printerConfig?.printerName || 'POS-80 Thermal'}</strong> ({storeSettings.printerConfig?.paperWidth || storeSettings.receiptWidth || '80mm'})
              </span>
              <button
                type="button"
                onClick={() => setPrinterModalOpen(true)}
                className="text-sky-600 hover:text-sky-700 font-semibold hover:underline flex items-center gap-1 shrink-0"
              >
                <Sliders className="w-3 h-3" />
                <span>Select Printer</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* CAMERA SCANNER MODAL */}
      <CameraScannerModal
        isOpen={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          focusBarcodeField();
        }}
        onScanSuccess={scannedText => {
          handleBarcodeLookup(scannedText);
        }}
        title="Point Scanner at Product Barcode / QR"
        description="Supported: EAN-13, EAN-8, UPC, Code 128, Code 39, QR"
      />

      {/* MANUAL ITEM ENTRY MODAL */}
      {manualModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white border border-sky-100 w-full max-w-lg rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900">Manual Item Billing</h3>
                  <p className="text-xs text-slate-500">Add loose groceries, bakery, or custom items to this bill</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setManualModalOpen(false);
                  focusBarcodeField();
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Quick select loose items */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Quick Common Loose Items:
                </label>
                <div className="flex flex-wrap gap-1.5 text-xs">
                  {[
                    { name: 'Carry Bag (Small)', price: 5 },
                    { name: 'Cloth Carry Bag', price: 15 },
                    { name: 'Loose Potatoes 1kg', price: 35 },
                    { name: 'Loose Onions 1kg', price: 40 },
                    { name: 'Fresh Tomatoes 1kg', price: 30 },
                    { name: 'Fresh Green Chilies 100g', price: 10 },
                    { name: 'Fresh Coriander Bunch', price: 10 },
                    { name: 'Loose Sugar 1kg', price: 48 },
                  ].map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setManualName(preset.name);
                        setManualPrice(preset.price.toString());
                        setManualMrp(preset.price.toString());
                        setManualQty('1');
                      }}
                      className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg border border-sky-200 transition-colors text-[11px]"
                    >
                      {preset.name} ({currency}{preset.price})
                    </button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAddManualItem} className="space-y-4 pt-2 border-t border-sky-100">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Item Name / Description *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={manualName}
                    onChange={e => setManualName(e.target.value)}
                    placeholder="e.g. Fresh Red Apples 1.5kg, Bakery Bun, Custom Item"
                    className="w-full px-3.5 py-2.5 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Selling Price ({currency}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={manualPrice}
                      onChange={e => {
                        setManualPrice(e.target.value);
                        if (!manualMrp || parseFloat(manualMrp) < parseFloat(e.target.value)) {
                          setManualMrp(e.target.value);
                        }
                      }}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      value={manualQty}
                      onChange={e => setManualQty(e.target.value)}
                      placeholder="1"
                      className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      MRP ({currency}) (Optional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualMrp}
                      onChange={e => setManualMrp(e.target.value)}
                      placeholder={manualPrice || '0.00'}
                      className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Discount ({currency} per unit)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={manualDiscount}
                      onChange={e => setManualDiscount(e.target.value)}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-sky-100 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setManualModalOpen(false);
                      focusBarcodeField();
                    }}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                  >
                    Add to Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      <ReceiptModal
        isOpen={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          focusBarcodeField();
        }}
        sale={completedSale}
        settings={storeSettings}
        onSettingsUpdate={refreshSettings}
      />

      {/* PRINTER SELECT MODAL */}
      <PrinterSelectModal
        isOpen={printerModalOpen}
        onClose={() => {
          setPrinterModalOpen(false);
          focusBarcodeField();
        }}
        settings={storeSettings}
        onSaveConfig={async (config: PrinterConfig) => {
          await updateStoreSettings({
            printerConfig: config,
            receiptWidth: config.paperWidth === '58mm' ? '58mm' : '80mm',
          });
          await refreshSettings();
        }}
      />
    </div>
  );
};
