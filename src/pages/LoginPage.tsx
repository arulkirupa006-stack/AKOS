import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { setupFirstAdmin } from '../services/db';
import { Lock, User as UserIcon, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import heroPosImg from '../assets/images/akos_supermarket_pos_1792646281308.jpg';
import brandLogo from '../assets/images/akos_brand_logo_1792646281388.jpg';

export const LoginPage: React.FC = () => {
  const { login, needsFirstAdminSetup, checkSetupStatus } = useAuth();

  // Login form state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Setup first admin form state
  const [setupUsername, setSetupUsername] = useState('admin');
  const [setupFullName, setSetupFullName] = useState('Store Administrator');
  const [setupPassword, setSetupPassword] = useState('');
  const [showSetupPassword, setShowSetupPassword] = useState(false);
  const [setupSuccess, setSetupSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await login(username, password);
    } catch (err: any) {
      setError(err?.message || 'Login failed. Please check credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetupFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupUsername.trim() || !setupFullName.trim() || !setupPassword) {
      setError('Please fill in all setup fields.');
      return;
    }
    if (setupPassword.length < 6) {
      setError('Password must be at least 6 characters long for security.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await setupFirstAdmin(setupUsername, setupFullName, setupPassword);
      setSetupSuccess(true);
      // Auto login as new master admin
      await login(setupUsername, setupPassword);
      await checkSetupStatus();
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize administrator account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-sky-50/60 flex flex-col md:flex-row items-stretch text-slate-800">
      {/* Visual Brand Side */}
      <div className="relative hidden md:flex md:w-1/2 lg:w-3/5 bg-sky-950 overflow-hidden items-end p-12">
        <img
          src={heroPosImg}
          alt="AKOS Supermarket Checkout Terminal"
          className="absolute inset-0 w-full h-full object-cover opacity-45 filter brightness-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-sky-950 via-sky-950/60 to-transparent" />

        <div className="relative z-10 max-w-xl space-y-4">
          <div className="flex items-center gap-3">
            <img
              src={brandLogo}
              alt="AKOS emblem"
              className="w-12 h-12 rounded-xl object-cover ring-2 ring-sky-400/40 shadow-xl"
            />
            <div>
              <span className="text-3xl font-black tracking-tight text-white">AKOS</span>
              <p className="text-xs text-sky-300 font-semibold tracking-wider uppercase">
                Supermarket Billing & Inventory System
              </p>
            </div>
          </div>

          <p className="text-base text-sky-100 leading-relaxed font-normal">
            High-speed retail cashier billing, camera and USB/Bluetooth barcode scanning, real-time stock
            deductions, thermal receipt printing, and comprehensive sales auditing.
          </p>

          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-sky-800/80 text-xs text-sky-200">
            <div>
              <div className="font-semibold text-white">Barcode & QR</div>
              <div>Instant camera & USB</div>
            </div>
            <div>
              <div className="font-semibold text-white">Receipts</div>
              <div>58mm & 80mm thermal</div>
            </div>
            <div>
              <div className="font-semibold text-white">Inventory</div>
              <div>Atomic stock updates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form Side */}
      <div className="w-full md:w-1/2 lg:w-2/5 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 bg-white border-l border-sky-100">
        <div className="max-w-md w-full mx-auto space-y-8">
          {/* Header */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 md:hidden mb-2">
              <img src={brandLogo} alt="AKOS" className="w-8 h-8 rounded-lg" />
              <span className="text-2xl font-black text-slate-900">AKOS</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {needsFirstAdminSetup ? 'Initialize Master Admin' : 'Sign In to AKOS'}
            </h2>
            <p className="text-xs text-slate-500">
              {needsFirstAdminSetup
                ? 'Create the primary administrator account to secure your supermarket terminal.'
                : 'Enter your Admin or Staff credentials to access billing and inventory.'}
            </p>
          </div>

          {/* Error / Alert banner */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {setupSuccess && (
            <div className="p-3.5 bg-sky-50 border border-sky-200 rounded-xl flex items-start gap-2.5 text-xs text-sky-800">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-sky-600" />
              <span>Admin account initialized! Redirecting to workspace...</span>
            </div>
          )}

          {/* FIRST-ADMIN SETUP FORM */}
          {needsFirstAdminSetup ? (
            <form onSubmit={handleSetupFirstAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Admin Full Name
                </label>
                <input
                  type="text"
                  required
                  value={setupFullName}
                  onChange={e => setSetupFullName(e.target.value)}
                  placeholder="e.g. Master Store Administrator"
                  className="w-full px-3.5 py-2.5 bg-sky-50/40 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Admin Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={setupUsername}
                    onChange={e => setSetupUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-sky-50/40 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Create Master Password (min 6 characters)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showSetupPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={setupPassword}
                    onChange={e => setSetupPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-sky-50/40 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSetupPassword(!showSetupPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    title={showSetupPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSetupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-2 py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-sky-200 transition-all"
              >
                {isSubmitting ? 'Configuring System...' : 'Initialize AKOS & Log In'}
              </button>
            </form>
          ) : (
            /* STANDARD LOGIN FORM */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="Enter username"
                    autoFocus
                    className="w-full pl-10 pr-3.5 py-2.5 bg-sky-50/40 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-2.5 bg-sky-50/40 border border-slate-300 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                    title={showLoginPassword ? 'Hide password' : 'Show password'}
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-md shadow-sky-200 transition-all"
              >
                {isSubmitting ? 'Authenticating...' : 'Sign In to AKOS'}
              </button>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400">
                  Staff accounts must be provisioned by an Administrator in Staff Management.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
