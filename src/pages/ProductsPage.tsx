import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Product } from '../types';
import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
  bulkImportProducts,
} from '../services/db';
import { CameraScannerModal } from '../components/CameraScannerModal';
import {
  Package,
  Plus,
  Search,
  Camera,
  Edit2,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  CheckCircle2,
  Barcode,
  X,
} from 'lucide-react';

export const ProductsPage: React.FC = () => {
  const { currentUser, storeSettings } = useAuth();
  const currency = storeSettings.currencySymbol || '₹';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    barcode: '',
    mrp: '',
    sellingPrice: '',
    stock: '',
    category: '',
    lowStockThreshold: '10',
  });

  // Scanner modal state for barcode input
  const [isScannerOpen, setIsScannerOpen] = useState<boolean>(false);

  // CSV Import Modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState<boolean>(false);
  const [csvText, setCsvText] = useState<string>('');
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvProgress, setCsvProgress] = useState<string | null>(null);

  // Feedback notifications
  const [alert, setAlert] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setAlert({ type: 'error', text: 'Failed to load products from database.' });
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      barcode: '',
      mrp: '',
      sellingPrice: '',
      stock: '0',
      category: '',
      lowStockThreshold: storeSettings.lowStockThreshold?.toString() || '10',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      barcode: prod.barcode,
      mrp: prod.mrp.toString(),
      sellingPrice: prod.sellingPrice.toString(),
      stock: prod.stock.toString(),
      category: prod.category || '',
      lowStockThreshold: (prod.lowStockThreshold || 10).toString(),
    });
    setIsModalOpen(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    const mrp = parseFloat(formData.mrp);
    const sellingPrice = parseFloat(formData.sellingPrice);
    const stock = parseInt(formData.stock, 10);
    const lowStockThreshold = parseInt(formData.lowStockThreshold, 10) || 10;
    const cleanBarcode = formData.barcode.trim();

    if (!formData.name.trim() || !cleanBarcode || isNaN(mrp) || isNaN(sellingPrice)) {
      setAlert({ type: 'error', text: 'Please fill in all required product fields correctly.' });
      return;
    }

    if (sellingPrice > mrp) {
      setAlert({
        type: 'error',
        text: `Selling price (${currency}${sellingPrice}) cannot exceed MRP (${currency}${mrp}).`,
      });
      return;
    }

    try {
      if (editingProduct) {
        await updateProduct(
          editingProduct.id,
          {
            name: formData.name.trim(),
            barcode: cleanBarcode,
            mrp,
            sellingPrice,
            stock,
            category: formData.category.trim() || undefined,
            lowStockThreshold,
          },
          currentUser?.fullName || 'Admin'
        );
        setAlert({ type: 'success', text: `Product "${formData.name}" updated successfully.` });
      } else {
        await addProduct(
          {
            name: formData.name.trim(),
            barcode: cleanBarcode,
            mrp,
            sellingPrice,
            stock,
            category: formData.category.trim() || undefined,
            lowStockThreshold,
          },
          currentUser?.fullName || 'Admin'
        );
        setAlert({ type: 'success', text: `Product "${formData.name}" added to catalog.` });
      }

      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      console.error('Save product error:', err);
      setAlert({ type: 'error', text: err?.message || 'Error saving product.' });
    }
  };

  const handleDeleteProduct = async (prod: Product) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${prod.name}" (Barcode: ${prod.barcode})?`)) {
      return;
    }

    try {
      await deleteProduct(prod.id);
      setAlert({ type: 'success', text: `Product "${prod.name}" deleted.` });
      loadProducts();
    } catch (err: any) {
      console.error('Delete error:', err);
      setAlert({ type: 'error', text: `Failed to delete product: ${err.message || JSON.stringify(err)}` });
    }
  };

  // CSV Export
  const handleExportCsv = () => {
    if (products.length === 0) return;
    const headers = ['Product Name', 'Barcode', 'MRP', 'Selling Price', 'Stock Quantity', 'Category', 'Low Stock Threshold'];
    const rows = products.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.barcode}"`,
      p.mrp,
      p.sellingPrice,
      p.stock,
      `"${(p.category || '').replace(/"/g, '""')}"`,
      p.lowStockThreshold || 10,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `AKOS_Products_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Import
  const handleImportCsv = async () => {
    if (!csvText.trim()) {
      setCsvError('Please paste or upload CSV text.');
      return;
    }

    setCsvError(null);
    setCsvProgress('Parsing CSV data...');

    try {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        throw new Error('CSV must contain a header row and at least one product row.');
      }

      const productsToImport: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>> = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));

        if (parts.length >= 5) {
          const name = parts[0];
          const barcode = parts[1];
          const mrp = parseFloat(parts[2]) || 0;
          const sellingPrice = parseFloat(parts[3]) || 0;
          const stock = parseInt(parts[4], 10) || 0;
          const category = parts[5] || 'General';
          const lowStockThreshold = parseInt(parts[6], 10) || 10;

          if (name && barcode && mrp > 0 && sellingPrice > 0) {
            productsToImport.push({
              name,
              barcode,
              mrp,
              sellingPrice,
              stock,
              category,
              lowStockThreshold,
            });
          }
        }
      }

      if (productsToImport.length === 0) {
        throw new Error('No valid products found. Expected format: Name,Barcode,MRP,SellingPrice,Stock,Category,Threshold');
      }

      setCsvProgress(`Importing ${productsToImport.length} products to AKOS...`);
      const result = await bulkImportProducts(productsToImport, currentUser?.fullName || 'Admin');

      setAlert({
        type: 'success',
        text: `CSV Import complete! Added: ${result.added} items. Skipped duplicates: ${result.skippedDuplicates}.`,
      });
      setIsCsvModalOpen(false);
      setCsvText('');
      setCsvProgress(null);
      loadProducts();
    } catch (err: any) {
      console.error('CSV import error:', err);
      setCsvError(err?.message || 'Error importing CSV data.');
      setCsvProgress(null);
    }
  };

  // Categories list
  const categories = Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[];

  // Filtered products
  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.barcode.includes(searchQuery);
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-sky-100 rounded-2xl p-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Product Catalog & Barcodes</h1>
            <p className="text-xs text-slate-500">
              Manage inventory products, scan barcodes, and bulk import/export.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCsvModalOpen(true)}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            <span>Import CSV</span>
          </button>
          <button
            onClick={handleExportCsv}
            disabled={products.length === 0}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Alert message */}
      {alert && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
            alert.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-700'
              : 'bg-sky-50 border-sky-200 text-sky-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {alert.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-600" />
            )}
            <span className="font-medium">{alert.text}</span>
          </div>
          <button onClick={() => setAlert(null)} className="text-slate-400 hover:text-slate-700 font-bold px-1">
            ×
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white border border-sky-100 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by product name or barcode..."
            className="w-full pl-10 pr-3.5 py-2 bg-sky-50/40 border border-sky-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-sky-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500 whitespace-nowrap">Category:</span>
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="bg-white border border-sky-200 text-xs text-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-sky-500"
          >
            <option value="all">All Categories ({products.length})</option>
            {categories.map(c => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-sky-100 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading catalog from database...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Package className="w-8 h-8 text-sky-400 mx-auto" />
            <h4 className="text-sm font-semibold text-slate-800">No products found</h4>
            <p className="text-xs text-slate-500">
              {searchQuery ? 'Try clearing your search query.' : 'Click "Add Product" to add your first supermarket item.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-sky-100 bg-sky-50/60 text-slate-600 font-medium">
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Barcode</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">MRP</th>
                  <th className="py-3 px-3 text-right">Selling Price</th>
                  <th className="py-3 px-3 text-right">Margin / Discount</th>
                  <th className="py-3 px-4 text-center">Current Stock</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/70">
                {filteredProducts.map(prod => {
                  const margin = Math.max(0, prod.mrp - prod.sellingPrice);
                  const isLow = prod.stock <= (prod.lowStockThreshold || 10);
                  const isOut = prod.stock <= 0;

                  return (
                    <tr key={prod.id} className="hover:bg-sky-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{prod.name}</div>
                        <div className="text-[11px] text-slate-400">Threshold: {prod.lowStockThreshold || 10}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-800">
                        <span className="px-2 py-0.5 rounded bg-sky-50 border border-sky-200 text-[11px]">
                          {prod.barcode}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">{prod.category || '—'}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">
                        {currency}{prod.mrp.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-sky-700">
                        {currency}{prod.sellingPrice.toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-600">
                        {margin > 0 ? (
                          <span className="text-sky-600 font-medium">-{currency}{margin.toFixed(2)}</span>
                        ) : (
                          '0.00'
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] ${
                            isOut
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-sky-50 text-sky-700 border border-sky-200'
                          }`}
                        >
                          {prod.stock} units
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ADD / EDIT PRODUCT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-sky-100 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-sky-100 text-sky-700 rounded-lg">
                  <Package className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900">
                  {editingProduct ? 'Edit Product' : 'Add New Product to AKOS'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Basmati Rice 5kg, Full Cream Milk 1L"
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Barcode Field with Scan Barcode / QR Code button beside it */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Barcode Number * (Scan or Type)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formData.barcode}
                      onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                      placeholder="e.g. 8901030010012"
                      className="w-full pl-9 pr-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors whitespace-nowrap"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Scan Barcode / QR Code</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Camera will read the code and put only the decoded number into this field.
                </p>
              </div>

              {/* Pricing (MRP and Selling Price) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Maximum Retail Price (MRP {currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.mrp}
                    onChange={e => setFormData({ ...formData, mrp: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Selling Price ({currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={e => setFormData({ ...formData, sellingPrice: e.target.value })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Stock and Low Stock Threshold */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Current Stock Quantity *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    placeholder="0"
                    className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Low Stock Threshold
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.lowStockThreshold}
                    onChange={e => setFormData({ ...formData, lowStockThreshold: e.target.value })}
                    placeholder="10"
                    className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Category (Optional)
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={e => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g. Grains, Dairy, Beverages, Snacks, Personal Care"
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="pt-4 border-t border-sky-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV IMPORT MODAL */}
      {isCsvModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white border border-sky-100 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-sky-100 flex items-center justify-between bg-sky-50/60">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-sky-600" />
                <h3 className="text-base font-semibold text-slate-900">Import Products from CSV</h3>
              </div>
              <button
                onClick={() => setIsCsvModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-600">
                Paste your CSV content below. The first row must be the header. Format:
              </p>
              <div className="p-2.5 bg-sky-50 border border-sky-200 rounded-xl font-mono text-[11px] text-sky-800">
                Product Name,Barcode,MRP,Selling Price,Stock Quantity,Category,Low Stock Threshold
              </div>

              <textarea
                rows={7}
                value={csvText}
                onChange={e => setCsvText(e.target.value)}
                placeholder={`Basmati Rice 5kg,8901030010012,499,449,45,Grains,10\nWheat Atta 10kg,8901030010029,420,385,30,Grains,8`}
                className="w-full p-3 bg-white border border-sky-200 rounded-xl font-mono text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500"
              />

              {csvError && (
                <div className="text-xs text-rose-600 flex items-center gap-1.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                  <span>{csvError}</span>
                </div>
              )}

              {csvProgress && (
                <div className="text-xs text-sky-700 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-600" />
                  <span>{csvProgress}</span>
                </div>
              )}

              <div className="pt-3 border-t border-sky-100 flex items-center justify-between">
                <input
                  type="file"
                  accept=".csv"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => setCsvText((ev.target?.result as string) || '');
                      reader.readAsText(file);
                    }
                  }}
                  className="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:bg-sky-50 file:text-sky-700 file:border file:border-sky-200 cursor-pointer"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setIsCsvModalOpen(false)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportCsv}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                  >
                    Start Import
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Camera scanner modal for Add Product barcode */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={scannedText => {
          setFormData(prev => ({ ...prev, barcode: scannedText }));
          setIsScannerOpen(false);
        }}
        title="Scan Barcode / QR Code for New Product"
        description="Point camera at barcode label to populate the barcode field."
      />
    </div>
  );
};
