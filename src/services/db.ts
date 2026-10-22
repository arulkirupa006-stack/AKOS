import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  runTransaction,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User, Product, Sale, SaleItem, StockAdjustment, StoreSettings } from '../types';
import { hashPassword, generateSalt } from './crypto';

const USERS_COL = 'users';
const PRODUCTS_COL = 'products';
const SALES_COL = 'sales';
const ADJUSTMENTS_COL = 'stock_adjustments';
const SETTINGS_COL = 'store_settings';
const SETTINGS_DOC_ID = 'current';

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'AKOS Supermarket',
  logoUrl: '',
  address: '42 Commercial Boulevard, Market Square',
  city: 'Metro City',
  receiptFooter: 'Thank you for shopping at AKOS Supermarket! Visit again.',
  currencySymbol: '₹',
  lowStockThreshold: 10,
  receiptWidth: '80mm',
  printerConfig: {
    printerType: 'thermal_80mm',
    printerName: 'POS-80 Thermal Receipt Printer',
    connection: 'browser',
    paperWidth: '80mm',
    copies: 1,
  },
};

/**
 * Recursively removes undefined fields from an object or array.
 * Firestore transactions and setDoc/updateDoc strictly reject 'undefined'.
 */
export function removeUndefined<T>(val: T): T {
  if (val === null || val === undefined) {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(item => removeUndefined(item)) as unknown as T;
  }
  if (typeof val === 'object' && !(val instanceof Date)) {
    const cleaned: Record<string, any> = {};
    for (const [key, v] of Object.entries(val as Record<string, any>)) {
      if (v !== undefined) {
        cleaned[key] = removeUndefined(v);
      }
    }
    return cleaned as T;
  }
  return val;
}

// ========================
// STORE SETTINGS
// ========================

export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const settingsDoc = await getDoc(doc(db, SETTINGS_COL, SETTINGS_DOC_ID));
    if (settingsDoc.exists()) {
      return { ...DEFAULT_SETTINGS, ...settingsDoc.data() } as StoreSettings;
    }
    // Initialize default if not exists
    await setDoc(doc(db, SETTINGS_COL, SETTINGS_DOC_ID), {
      ...DEFAULT_SETTINGS,
      updatedAt: new Date().toISOString(),
    });
    return DEFAULT_SETTINGS;
  } catch (error) {
    console.error('Failed to get store settings, using defaults:', error);
    return DEFAULT_SETTINGS;
  }
}

export async function updateStoreSettings(settings: Partial<StoreSettings>): Promise<void> {
  const current = await getStoreSettings();
  const updated = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
  };
  await setDoc(doc(db, SETTINGS_COL, SETTINGS_DOC_ID), updated);
}

// ========================
// USERS & AUTHENTICATION
// ========================

export async function hasAnyAdmin(): Promise<boolean> {
  try {
    const q = query(collection(db, USERS_COL), where('role', '==', 'admin'));
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  } catch (err) {
    console.error('Error checking admin presence:', err);
    return false;
  }
}

export async function setupFirstAdmin(username: string, fullName: string, password: string): Promise<User> {
  const adminExists = await hasAnyAdmin();
  if (adminExists) {
    throw new Error('An administrator account already exists. Please login with existing admin credentials.');
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);
  const now = new Date().toISOString();
  const userId = `usr_${Date.now()}`;

  const newUser: User = {
    id: userId,
    username: username.trim().toLowerCase(),
    fullName: fullName.trim(),
    role: 'admin',
    passwordHash,
    salt,
    active: true,
    createdAt: now,
  };

  await setDoc(doc(db, USERS_COL, userId), newUser);
  return newUser;
}

export async function createUser(data: {
  username: string;
  fullName: string;
  password: string;
  role: 'admin' | 'staff';
}): Promise<User> {
  const cleanUsername = data.username.trim().toLowerCase();
  // Check unique username
  const q = query(collection(db, USERS_COL), where('username', '==', cleanUsername));
  const snap = await getDocs(q);
  if (!snap.empty) {
    throw new Error(`Username "${cleanUsername}" is already taken.`);
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(data.password, salt);
  const now = new Date().toISOString();
  const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newUser: User = {
    id: userId,
    username: cleanUsername,
    fullName: data.fullName.trim(),
    role: data.role,
    passwordHash,
    salt,
    active: true,
    createdAt: now,
  };

  await setDoc(doc(db, USERS_COL, userId), newUser);
  return newUser;
}

export async function getUsers(): Promise<User[]> {
  const snap = await getDocs(collection(db, USERS_COL));
  return snap.docs.map(d => ({ ...d.data(), id: d.id } as User));
}

export async function updateUser(id: string, updates: Partial<User>): Promise<void> {
  const userRef = doc(db, USERS_COL, id);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: new Date().toISOString(),
  });
}

export async function resetUserPassword(id: string, newPass: string): Promise<void> {
  const salt = generateSalt();
  const passwordHash = await hashPassword(newPass, salt);
  await updateDoc(doc(db, USERS_COL, id), {
    passwordHash,
    salt,
    updatedAt: new Date().toISOString(),
  });
}

export async function authenticateUser(username: string, password: string): Promise<User> {
  const cleanUsername = username.trim().toLowerCase();
  const q = query(collection(db, USERS_COL), where('username', '==', cleanUsername));
  const snap = await getDocs(q);

  if (snap.empty) {
    throw new Error('Invalid username or password.');
  }

  const user = { ...snap.docs[0].data(), id: snap.docs[0].id } as User;

  if (!user.active) {
    throw new Error('This account has been deactivated. Please contact an Administrator.');
  }

  const computedHash = await hashPassword(password, user.salt || '');
  if (computedHash !== user.passwordHash) {
    throw new Error('Invalid username or password.');
  }

  return user;
}

// ========================
// PRODUCTS & INVENTORY
// ========================

export async function getProducts(): Promise<Product[]> {
  const snap = await getDocs(collection(db, PRODUCTS_COL));
  const products = snap.docs.map(d => ({ ...d.data(), id: d.id } as Product));
  return products.sort((a, b) => a.name.localeCompare(b.name));
}

export async function getProductByBarcode(barcode: string): Promise<Product | null> {
  const cleanBarcode = barcode.trim();
  const q = query(collection(db, PRODUCTS_COL), where('barcode', '==', cleanBarcode));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { ...snap.docs[0].data(), id: snap.docs[0].id } as Product;
}

export async function checkBarcodeExists(barcode: string, excludeId?: string): Promise<boolean> {
  const clean = barcode.trim();
  const q = query(collection(db, PRODUCTS_COL), where('barcode', '==', clean));
  const snap = await getDocs(q);
  if (snap.empty) return false;
  if (excludeId && snap.docs.length === 1 && snap.docs[0].id === excludeId) {
    return false;
  }
  return true;
}

export async function addProduct(data: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, operatorName: string): Promise<Product> {
  const cleanBarcode = data.barcode.trim();
  const exists = await checkBarcodeExists(cleanBarcode);
  if (exists) {
    throw new Error(`A product with barcode "${cleanBarcode}" already exists in AKOS.`);
  }

  const now = new Date().toISOString();
  const productId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const newProduct: Product = {
    ...data,
    id: productId,
    barcode: cleanBarcode,
    createdAt: now,
    updatedAt: now,
  };

  await setDoc(doc(db, PRODUCTS_COL, productId), newProduct);

  // If initial stock > 0, log an initial stock entry
  if (data.stock > 0) {
    await logStockAdjustment({
      productId,
      productName: data.name,
      barcode: cleanBarcode,
      previousStock: 0,
      change: data.stock,
      newStock: data.stock,
      reason: 'Restock',
      adjustedBy: 'system',
      adjustedByName: operatorName || 'Admin',
    });
  }

  return newProduct;
}

export async function updateProduct(
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt'>>,
  operatorName: string
): Promise<void> {
  const productRef = doc(db, PRODUCTS_COL, id);
  const currentSnap = await getDoc(productRef);
  if (!currentSnap.exists()) {
    throw new Error('Product not found.');
  }

  const current = currentSnap.data() as Product;

  if (data.barcode && data.barcode.trim() !== current.barcode) {
    const exists = await checkBarcodeExists(data.barcode.trim(), id);
    if (exists) {
      throw new Error(`Barcode "${data.barcode.trim()}" is already assigned to another product.`);
    }
  }

  // If stock was directly updated
  if (data.stock !== undefined && data.stock !== current.stock) {
    const change = data.stock - current.stock;
    await logStockAdjustment({
      productId: id,
      productName: data.name || current.name,
      barcode: data.barcode || current.barcode,
      previousStock: current.stock,
      change,
      newStock: data.stock,
      reason: change > 0 ? 'Restock' : 'Physical Audit',
      adjustedBy: 'admin',
      adjustedByName: operatorName || 'Admin',
    });
  }

  await updateDoc(productRef, {
    ...data,
    barcode: data.barcode ? data.barcode.trim() : current.barcode,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteProduct(id: string): Promise<void> {
  await runTransaction(db, async (transaction) => {
    transaction.delete(doc(db, PRODUCTS_COL, id));
  });
}

export async function bulkImportProducts(
  productsList: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>>,
  operatorName: string
): Promise<{ added: number; skippedDuplicates: number }> {
  let added = 0;
  let skippedDuplicates = 0;

  for (const item of productsList) {
    const exists = await checkBarcodeExists(item.barcode.trim());
    if (exists) {
      skippedDuplicates++;
      continue;
    }
    await addProduct(item, operatorName);
    added++;
  }

  return { added, skippedDuplicates };
}

// ========================
// STOCK ADJUSTMENTS & AUDIT
// ========================

export async function logStockAdjustment(data: Omit<StockAdjustment, 'id' | 'createdAt'>): Promise<void> {
  const adjId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const adjustment: StockAdjustment = {
    ...data,
    id: adjId,
    createdAt: new Date().toISOString(),
  };
  await setDoc(doc(db, ADJUSTMENTS_COL, adjId), adjustment);
}

export async function getStockAdjustments(): Promise<StockAdjustment[]> {
  const snap = await getDocs(collection(db, ADJUSTMENTS_COL));
  const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as StockAdjustment));
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function adjustStock(
  productId: string,
  changeDelta: number,
  reason: StockAdjustment['reason'],
  operatorName: string,
  operatorId: string
): Promise<number> {
  const productRef = doc(db, PRODUCTS_COL, productId);

  return await runTransaction(db, async transaction => {
    const prodDoc = await transaction.get(productRef);
    if (!prodDoc.exists()) {
      throw new Error('Product does not exist.');
    }

    const currentStock = prodDoc.data().stock || 0;
    const newStock = currentStock + changeDelta;

    if (newStock < 0) {
      throw new Error(`Insufficient stock. Current stock is ${currentStock}, cannot reduce by ${Math.abs(changeDelta)}.`);
    }

    transaction.update(productRef, {
      stock: newStock,
      updatedAt: new Date().toISOString(),
    });

    const adjId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const adjDocRef = doc(db, ADJUSTMENTS_COL, adjId);
    transaction.set(adjDocRef, {
      id: adjId,
      productId,
      productName: prodDoc.data().name,
      barcode: prodDoc.data().barcode,
      previousStock: currentStock,
      change: changeDelta,
      newStock,
      reason,
      adjustedBy: operatorId,
      adjustedByName: operatorName,
      createdAt: new Date().toISOString(),
    });

    return newStock;
  });
}

// ========================
// SALES & BILLING (ATOMIC)
// ========================

export async function generateBillNumber(): Promise<string> {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randNum = Math.floor(1000 + Math.random() * 9000);
  return `AKOS-${dateStr}-${randNum}`;
}

export async function processSale(saleData: Omit<Sale, 'id' | 'createdAt'>): Promise<Sale> {
  const saleId = `sale_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date().toISOString();

  // Run atomic Firestore transaction to verify stock and decrement
  await runTransaction(db, async transaction => {
    // 1. Read all product docs to verify sufficient stock
    const productDocs: { ref: any; currentStock: number; item: SaleItem }[] = [];

    for (const item of saleData.items) {
      // Manual billing items (e.g. loose items, custom groceries) don't have catalog stock records
      if (item.productId.startsWith('manual_')) {
        continue;
      }

      const pRef = doc(db, PRODUCTS_COL, item.productId);
      const pSnap = await transaction.get(pRef);

      if (!pSnap.exists()) {
        throw new Error(`Product "${item.name}" (Barcode: ${item.barcode}) no longer exists.`);
      }

      const pData = pSnap.data() as Product;
      if (pData.stock < item.quantity) {
        throw new Error(
          `Insufficient stock for "${item.name}". Required: ${item.quantity}, Available: ${pData.stock}.`
        );
      }

      productDocs.push({
        ref: pRef,
        currentStock: pData.stock,
        item,
      });
    }

    // 2. Perform updates
    for (const entry of productDocs) {
      const newStock = entry.currentStock - entry.item.quantity;
      transaction.update(entry.ref, {
        stock: newStock,
        updatedAt: now,
      });

      // Log stock adjustment for this sale item
      const adjId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const adjRef = doc(db, ADJUSTMENTS_COL, adjId);
      transaction.set(adjRef, {
        id: adjId,
        productId: entry.item.productId,
        productName: entry.item.name,
        barcode: entry.item.barcode,
        previousStock: entry.currentStock,
        change: -entry.item.quantity,
        newStock,
        reason: 'Sale',
        adjustedBy: saleData.cashierId,
        adjustedByName: saleData.cashierName,
        createdAt: now,
      });
    }

    // 3. Save the Sale record
    const saleRef = doc(db, SALES_COL, saleId);
    const saleRecord = removeUndefined({
      ...saleData,
      id: saleId,
      createdAt: now,
    });
    transaction.set(saleRef, saleRecord);
  });

  return removeUndefined({
    ...saleData,
    id: saleId,
    createdAt: now,
  });
}

export async function getSales(): Promise<Sale[]> {
  const snap = await getDocs(collection(db, SALES_COL));
  const list = snap.docs.map(d => ({ ...d.data(), id: d.id } as Sale));
  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

// ========================
// OFFLINE SYNC SUPPORT
// ========================

const OFFLINE_SALES_KEY = 'AKOS_OFFLINE_SALES_QUEUE';

export function getOfflineSales(): Sale[] {
  try {
    const raw = localStorage.getItem(OFFLINE_SALES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveOfflineSale(sale: Sale): void {
  const current = getOfflineSales();
  current.push(sale);
  localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(current));
}

export async function syncOfflineSales(): Promise<{ synced: number; failed: number }> {
  const pending = getOfflineSales();
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: Sale[] = [];

  for (const sale of pending) {
    try {
      // Check if billNumber already exists in Firestore to avoid duplicate uploads
      const q = query(collection(db, SALES_COL), where('billNumber', '==', sale.billNumber));
      const existing = await getDocs(q);
      if (existing.empty) {
        await processSale(
          removeUndefined({
            billNumber: sale.billNumber,
            cashierId: sale.cashierId,
            cashierName: sale.cashierName,
            items: sale.items,
            subtotal: sale.subtotal,
            discount: sale.discount,
            grandTotal: sale.grandTotal,
            paymentMethod: sale.paymentMethod,
            ...(sale.amountReceived !== undefined ? { amountReceived: sale.amountReceived } : {}),
            ...(sale.changeDue !== undefined ? { changeDue: sale.changeDue } : {}),
            ...(sale.paymentReference ? { paymentReference: sale.paymentReference } : {}),
          })
        );
      }
      synced++;
    } catch (err) {
      console.error('Failed to sync offline sale:', sale.billNumber, err);
      failed++;
      remaining.push(sale);
    }
  }

  localStorage.setItem(OFFLINE_SALES_KEY, JSON.stringify(remaining));
  return { synced, failed };
}

// ========================
// SEED INITIAL SUPERMARKET DATA
// ========================

export async function seedInitialDataIfNeeded(adminUser: User): Promise<void> {
  try {
    const products = await getProducts();
    if (products.length > 0) return;

    console.log('Seeding initial supermarket inventory for AKOS...');

    const sampleProducts: Array<Omit<Product, 'id' | 'createdAt' | 'updatedAt'>> = [
      {
        name: 'Royal Basmati Rice 5kg',
        barcode: '8901030010012',
        mrp: 499,
        sellingPrice: 449,
        stock: 45,
        category: 'Grains & Staples',
        lowStockThreshold: 10,
      },
      {
        name: 'Whole Wheat Chakki Atta 10kg',
        barcode: '8901030010029',
        mrp: 420,
        sellingPrice: 385,
        stock: 35,
        category: 'Grains & Staples',
        lowStockThreshold: 8,
      },
      {
        name: 'Farm Fresh Full Cream Milk 1L',
        barcode: '8901030010036',
        mrp: 66,
        sellingPrice: 64,
        stock: 50,
        category: 'Dairy & Eggs',
        lowStockThreshold: 15,
      },
      {
        name: 'Organic Brown Eggs Pack of 12',
        barcode: '8901030010043',
        mrp: 120,
        sellingPrice: 105,
        stock: 30,
        category: 'Dairy & Eggs',
        lowStockThreshold: 10,
      },
      {
        name: 'Premium Extra Virgin Olive Oil 1L',
        barcode: '8901030010050',
        mrp: 850,
        sellingPrice: 775,
        stock: 20,
        category: 'Oils & Ghee',
        lowStockThreshold: 5,
      },
      {
        name: 'Gold Refined Sunflower Oil 1L',
        barcode: '8901030010067',
        mrp: 165,
        sellingPrice: 148,
        stock: 40,
        category: 'Oils & Ghee',
        lowStockThreshold: 10,
      },
      {
        name: 'Assam Gold CTC Leaf Tea 500g',
        barcode: '8901030010074',
        mrp: 290,
        sellingPrice: 260,
        stock: 25,
        category: 'Beverages',
        lowStockThreshold: 6,
      },
      {
        name: 'Pure Arabica Filter Coffee 200g',
        barcode: '8901030010081',
        mrp: 210,
        sellingPrice: 189,
        stock: 18,
        category: 'Beverages',
        lowStockThreshold: 5,
      },
      {
        name: 'Crunchy Marie Gold Biscuits 250g',
        barcode: '8901030010098',
        mrp: 40,
        sellingPrice: 36,
        stock: 60,
        category: 'Snacks & Biscuits',
        lowStockThreshold: 15,
      },
      {
        name: 'Dark Chocolate Cookies 150g',
        barcode: '8901030010104',
        mrp: 80,
        sellingPrice: 72,
        stock: 4, // low stock test
        category: 'Snacks & Biscuits',
        lowStockThreshold: 8,
      },
      {
        name: 'Natural Honey Jar 500g',
        barcode: '8901030010111',
        mrp: 250,
        sellingPrice: 225,
        stock: 15,
        category: 'Breakfast & Spreads',
        lowStockThreshold: 5,
      },
      {
        name: 'Herbal Protection Bath Soap 125g (Pack of 3)',
        barcode: '8901030010128',
        mrp: 150,
        sellingPrice: 135,
        stock: 28,
        category: 'Personal Care',
        lowStockThreshold: 8,
      },
      {
        name: 'Crispy Potato Chips Salted 100g',
        barcode: '8901030010135',
        mrp: 30,
        sellingPrice: 28,
        stock: 2, // low stock test
        category: 'Snacks & Biscuits',
        lowStockThreshold: 10,
      },
    ];

    for (const item of sampleProducts) {
      await addProduct(item, adminUser.fullName);
    }

    console.log('Sample supermarket products seeded successfully.');
  } catch (err) {
    console.error('Failed to seed sample inventory:', err);
  }
}
