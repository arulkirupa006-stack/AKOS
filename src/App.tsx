import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, ActiveTab } from './components/Navbar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { NewBillPage } from './pages/NewBillPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { SalesHistoryPage } from './pages/SalesHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { StaffPage } from './pages/StaffPage';
import { SettingsPage } from './pages/SettingsPage';
import brandLogo from './assets/images/akos_brand_logo_1792646281388.jpg';

const MainApp: React.FC = () => {
  const { currentUser, isAdmin, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // If user is staff, default to new_bill and protect admin tabs
  React.useEffect(() => {
    if (currentUser && currentUser.role === 'staff') {
      if (activeTab !== 'new_bill' && activeTab !== 'sales_history') {
        setActiveTab('new_bill');
      }
    } else if (currentUser && currentUser.role === 'admin') {
      if (!activeTab) {
        setActiveTab('dashboard');
      }
    }
  }, [currentUser, activeTab]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-sky-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 animate-in fade-in duration-300">
          <img
            src={brandLogo}
            alt="AKOS"
            className="w-16 h-16 rounded-2xl object-cover ring-2 ring-sky-500/40 shadow-xl"
          />
          <div className="text-center">
            <h1 className="text-2xl font-black text-slate-900 tracking-wider">AKOS</h1>
            <p className="text-xs text-sky-600 font-medium">Initializing Supermarket POS & Inventory...</p>
          </div>
          <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginPage />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/60 to-white text-slate-800 flex flex-col antialiased selection:bg-sky-500 selection:text-white">
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 pb-16">
        {activeTab === 'dashboard' && isAdmin && (
          <DashboardPage setActiveTab={setActiveTab} />
        )}

        {activeTab === 'new_bill' && <NewBillPage />}

        {activeTab === 'products' && isAdmin && <ProductsPage />}

        {activeTab === 'inventory' && isAdmin && <InventoryPage />}

        {activeTab === 'sales_history' && <SalesHistoryPage />}

        {activeTab === 'reports' && isAdmin && <ReportsPage />}

        {activeTab === 'staff' && isAdmin && <StaffPage />}

        {activeTab === 'settings' && isAdmin && <SettingsPage />}
      </main>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
