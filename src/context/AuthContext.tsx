import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, StoreSettings } from '../types';
import {
  authenticateUser,
  hasAnyAdmin,
  getStoreSettings,
  DEFAULT_SETTINGS,
  getOfflineSales,
  syncOfflineSales,
  seedInitialDataIfNeeded,
} from '../services/db';

interface AuthContextType {
  currentUser: User | null;
  isAdmin: boolean;
  isStaff: boolean;
  isLoading: boolean;
  needsFirstAdminSetup: boolean;
  storeSettings: StoreSettings;
  isOnline: boolean;
  offlineCount: number;
  login: (username: string, pass: string) => Promise<User>;
  logout: () => void;
  checkSetupStatus: () => Promise<void>;
  refreshSettings: () => Promise<void>;
  triggerOfflineSync: () => Promise<{ synced: number; failed: number }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_SESSION_KEY = 'AKOS_CURRENT_USER_SESSION';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [needsFirstAdminSetup, setNeedsFirstAdminSetup] = useState<boolean>(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [offlineCount, setOfflineCount] = useState<number>(0);

  // Monitor online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update offline sales count
  useEffect(() => {
    const updateCount = () => {
      const pending = getOfflineSales();
      setOfflineCount(pending.length);
    };
    updateCount();
    const interval = setInterval(updateCount, 4000);
    return () => clearInterval(interval);
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const s = await getStoreSettings();
      setStoreSettings(s);
    } catch (e) {
      console.error('Error fetching store settings:', e);
    }
  }, []);

  const checkSetupStatus = useCallback(async () => {
    try {
      const adminExists = await hasAnyAdmin();
      setNeedsFirstAdminSetup(!adminExists);
    } catch (err) {
      console.error('Error checking setup status:', err);
    }
  }, []);

  // Restore stored session or check first setup
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        await refreshSettings();
        await checkSetupStatus();

        const storedUser = sessionStorage.getItem(CURRENT_USER_SESSION_KEY);
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setCurrentUser(parsed);
          } catch {
            sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
          }
        }
      } catch (e) {
        console.error('Initialization error:', e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [checkSetupStatus, refreshSettings]);

  const login = async (username: string, pass: string): Promise<User> => {
    const user = await authenticateUser(username, pass);
    setCurrentUser(user);
    sessionStorage.setItem(CURRENT_USER_SESSION_KEY, JSON.stringify(user));
    // If admin, seed sample data if catalog is empty
    if (user.role === 'admin') {
      seedInitialDataIfNeeded(user).catch(console.error);
    }
    return user;
  };

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(CURRENT_USER_SESSION_KEY);
  };

  const triggerOfflineSync = async () => {
    const res = await syncOfflineSales();
    const pending = getOfflineSales();
    setOfflineCount(pending.length);
    return res;
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAdmin: currentUser?.role === 'admin',
        isStaff: currentUser?.role === 'staff',
        isLoading,
        needsFirstAdminSetup,
        storeSettings,
        isOnline,
        offlineCount,
        login,
        logout,
        checkSetupStatus,
        refreshSettings,
        triggerOfflineSync,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
