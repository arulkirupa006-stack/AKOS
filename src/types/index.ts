export type UserRole = 'admin' | 'staff';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  passwordHash: string;
  salt?: string;
  active: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Product {
  id: string;
  name: string;
  barcode: string;
  mrp: number;
  sellingPrice: number;
  stock: number;
  category?: string;
  lowStockThreshold?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface SaleItem {
  productId: string;
  name: string;
  barcode: string;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  discount: number; // in currency or %
  total: number;
}

export type PaymentMethod = 'cash' | 'upi' | 'card' | 'other';

export interface Sale {
  id: string;
  billNumber: string;
  cashierId: string;
  cashierName: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountReceived?: number;
  changeDue?: number;
  paymentReference?: string;
  createdAt: string;
}

export interface StockAdjustment {
  id: string;
  productId: string;
  productName: string;
  barcode: string;
  previousStock: number;
  change: number; // positive for addition, negative for reduction
  newStock: number;
  reason: 'Sale' | 'Restock' | 'Damage / Expiry' | 'Physical Audit' | 'Manual Correction' | 'Return';
  adjustedBy: string;
  adjustedByName: string;
  createdAt: string;
}

export type PrinterType = 'thermal_80mm' | 'thermal_58mm';
export type PrinterConnection = 'browser' | 'usb' | 'bluetooth' | 'network';

export interface PrinterConfig {
  printerType: PrinterType;
  printerName: string;
  connection: PrinterConnection;
  paperWidth: '58mm' | '80mm';
  copies: number;
}

export interface StoreSettings {
  storeName: string;
  logoUrl?: string;
  address: string;
  city: string;
  receiptFooter: string;
  currencySymbol: string;
  lowStockThreshold: number;
  receiptWidth: '58mm' | '80mm';
  printerConfig?: PrinterConfig;
  updatedAt?: string;
}
