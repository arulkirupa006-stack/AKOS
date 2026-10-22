import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  ShoppingCart,
  Package,
  Layers,
  History,
  BarChart3,
  Users,
  Settings,
  LogOut,
  Wifi,
  WifiOff,
  PlusCircle,
  Menu,
  X,
  LayoutDashboard,
} from 'lucide-react';
import brandLogo from '../assets/images/akos_brand_logo_1792646281388.jpg';

export type ActiveTab =
  | 'dashboard'
  | 'new_bill'
  | 'products'
  | 'inventory'
  | 'sales_history'
  | 'reports'
  | 'staff'
  | 'settings';

interface NavbarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { currentUser, isAdmin, logout, isOnline, offlineCount, triggerOfflineSync } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await triggerOfflineSync();
      if (res.synced > 0) {
        alert(`Successfully synchronized ${res.synced} offline sales to server!`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-sky-100 shadow-xs">
      {/* 3-Zone Top Bar Contract */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand title, one line */}
        <div className="flex items-center gap-3 shrink-0">
          <img
            src={brandLogo}
            alt="AKOS Logo"
            className="w-9 h-9 rounded-lg object-cover ring-2 ring-sky-500/20"
          />
          <span
            onClick={() => setActiveTab(isAdmin ? 'dashboard' : 'new_bill')}
            className="text-xl font-extrabold tracking-tight text-slate-900 cursor-pointer select-none"
          >
            AKOS
          </span>
          <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 uppercase tracking-wider">
            {currentUser?.role === 'admin' ? 'Admin' : 'Cashier POS'}
          </span>
        </div>

        {/* Zone 2: Nav links, 1-2 word labels, single-line */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
          {isAdmin && (
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-sky-600 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'dashboard' ? 'text-sky-600 font-bold border-b-2 border-sky-600' : ''
              }`}
            >
              Dashboard
            </button>
          )}

          <button
            onClick={() => setActiveTab('new_bill')}
            className={`hover:text-sky-600 transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 ${
              activeTab === 'new_bill' ? 'text-sky-600 font-bold border-b-2 border-sky-600' : ''
            }`}
          >
            <span>Billing</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('products')}
              className={`hover:text-sky-600 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'products' ? 'text-sky-600 font-bold border-b-2 border-sky-600' : ''
              }`}
            >
              Products
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('inventory')}
              className={`hover:text-sky-600 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'inventory' ? 'text-sky-600 font-bold border-b-2 border-sky-600' : ''
              }`}
            >
              Inventory
            </button>
          )}

          <button
            onClick={() => setActiveTab('sales_history')}
            className={`hover:text-sky-600 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeTab === 'sales_history' ? 'text-sky-600 font-bold border-b-2 border-sky-600' : ''
            }`}
          >
            Sales
          </button>

          {isAdmin && (
            <button
              onClick={() => setActiveTab('reports')}
              className={`hover:text-sky-600 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'reports' ? 'text-sky-600 font-bold border-b-2 border-sky-600' : ''
              }`}
            >
              Reports
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('staff')}
              className={`hover:text-sky-600 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'staff' ? 'text-sky-600 font-bold border-b-2 border-sky-600' : ''
              }`}
            >
              Staff
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab('settings')}
              className={`hover:text-sky-600 transition-colors whitespace-nowrap shrink-0 py-1 ${
                activeTab === 'settings' ? 'text-sky-600 font-bold border-b-2 border-sky-600' : ''
              }`}
            >
              Settings
            </button>
          )}
        </nav>

        {/* Zone 3: 1 primary action / Status cluster */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Offline/Online Indicator */}
          <div className="hidden md:flex items-center gap-1.5 text-xs">
            {isOnline ? (
              <span className="flex items-center gap-1 text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full border border-sky-200">
                <Wifi className="w-3.5 h-3.5 text-sky-600" />
                <span className="font-medium">Online</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                <WifiOff className="w-3.5 h-3.5" />
                <span className="font-medium">Offline</span>
              </span>
            )}

            {offlineCount > 0 && (
              <button
                onClick={handleSync}
                disabled={!isOnline || isSyncing}
                className="px-2 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded border border-amber-300 text-[11px] font-semibold"
                title="Sync offline transactions to cloud"
              >
                {isSyncing ? 'Syncing...' : `Sync (${offlineCount})`}
              </button>
            )}
          </div>

          {/* Quick New Bill Button */}
          {activeTab !== 'new_bill' && (
            <button
              onClick={() => setActiveTab('new_bill')}
              className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Bill</span>
            </button>
          )}

          {/* User profile & logout */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <span className="hidden xl:inline text-xs text-slate-600 font-medium truncate max-w-[120px]">
              {currentUser?.fullName}
            </span>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-sky-100 px-4 py-3 space-y-1 shadow-sm">
          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
                activeTab === 'dashboard' ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('new_bill');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
              activeTab === 'new_bill' ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>New Bill (Cashier)</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('products');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
                activeTab === 'products' ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Products & Catalog</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('inventory');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
                activeTab === 'inventory' ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>Inventory & Stock</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveTab('sales_history');
              setMobileMenuOpen(false);
            }}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
              activeTab === 'sales_history' ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'
            }`}
          >
            <History className="w-4 h-4" />
            <span>Sales History</span>
          </button>

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('reports');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
                activeTab === 'reports' ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Reports</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('staff');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
                activeTab === 'staff' ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Staff Accounts</span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('settings');
                setMobileMenuOpen(false);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 ${
                activeTab === 'settings' ? 'bg-sky-50 text-sky-600 font-bold' : 'text-slate-700'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Store Settings</span>
            </button>
          )}
        </div>
      )}
    </header>
  );
};
