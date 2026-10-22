import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, UserRole } from '../types';
import { getUsers, createUser, updateUser, resetUserPassword } from '../services/db';
import {
  Users,
  UserPlus,
  Shield,
  Key,
  CheckCircle2,
  AlertCircle,
  X,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
} from 'lucide-react';

export const StaffPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New staff modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'staff' as UserRole,
  });
  const [showCreatePassword, setShowCreatePassword] = useState<boolean>(false);

  // Reset password modal
  const [resetTargetUser, setResetTargetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState<string>('');
  const [showResetPassword, setShowResetPassword] = useState<boolean>(false);

  const [alert, setAlert] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (e) {
      console.error('Failed to load staff accounts:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.fullName.trim() || !formData.password) {
      setAlert({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (formData.password.length < 6) {
      setAlert({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setIsSubmitting(true);
    setAlert(null);
    try {
      await createUser(formData);
      setAlert({
        type: 'success',
        text: `Account for ${formData.fullName} (${formData.role.toUpperCase()}) created successfully!`,
      });
      setIsAddModalOpen(false);
      setFormData({ username: '', fullName: '', password: '', role: 'staff' });
      loadUsers();
    } catch (err: any) {
      setAlert({ type: 'error', text: err?.message || 'Error creating account.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (user.id === currentUser?.id) {
      setAlert({ type: 'error', text: 'You cannot deactivate your own currently active account.' });
      return;
    }

    try {
      await updateUser(user.id, { active: !user.active });
      setAlert({
        type: 'success',
        text: `Account "${user.username}" ${!user.active ? 'activated' : 'deactivated'}.`,
      });
      loadUsers();
    } catch (err: any) {
      setAlert({ type: 'error', text: 'Failed to update account status.' });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTargetUser || !newPassword) return;
    if (newPassword.length < 6) {
      setAlert({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }

    setIsSubmitting(true);
    try {
      await resetUserPassword(resetTargetUser.id, newPassword);
      setAlert({
        type: 'success',
        text: `Password for "${resetTargetUser.username}" was reset successfully.`,
      });
      setResetTargetUser(null);
      setNewPassword('');
    } catch (err: any) {
      setAlert({ type: 'error', text: 'Failed to reset password.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-sky-100 rounded-2xl p-4 sm:px-6 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="p-2.5 bg-sky-50 text-sky-600 rounded-xl border border-sky-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Staff & Cashier Accounts</h1>
            <p className="text-xs text-slate-500">
              Manage cashiers, administrators, system roles, and account access.
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormData({ username: '', fullName: '', password: '', role: 'staff' });
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all hover:scale-[1.02] self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add New Account</span>
        </button>
      </div>

      {/* Alert banner */}
      {alert && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs ${
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

      {/* Staff Accounts Table */}
      <div className="bg-white border border-sky-100 rounded-2xl shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading accounts...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-sky-100 bg-sky-50/60 text-slate-600 font-medium">
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sky-100/70">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-sky-50/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-2">
                        <span>{u.fullName}</span>
                        {u.id === currentUser?.id && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-sky-100 text-sky-700 rounded font-normal border border-sky-200">
                            You
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">@{u.username}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`inline-flex items-center gap-1 uppercase font-semibold text-[10px] px-2 py-0.5 rounded ${
                          u.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        <span>{u.role}</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`font-semibold text-[10px] px-2.5 py-0.5 rounded-full ${
                          u.active
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {u.active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setResetTargetUser(u)}
                          className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                          title="Reset Password"
                        >
                          <Key className="w-3 h-3" />
                          <span>Reset Pass</span>
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          disabled={u.id === currentUser?.id}
                          className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                            u.active
                              ? 'text-rose-600 hover:bg-rose-50'
                              : 'text-sky-700 hover:bg-sky-50'
                          } disabled:opacity-30`}
                          title={u.active ? 'Deactivate Account' : 'Activate Account'}
                        >
                          {u.active ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE ACCOUNT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-sky-100 w-full max-w-md rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New User Account</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. John Doe"
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Username * (lowercase login ID)
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. cashier1"
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Initial Password (min 6 chars) *
                </label>
                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                    title={showCreatePassword ? 'Hide password' : 'Show password'}
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  System Role *
                </label>
                <select
                  value={formData.role}
                  onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 bg-white border border-sky-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                >
                  <option value="staff">Staff / Cashier (Billing & Receipts Only)</option>
                  <option value="admin">Administrator (Full Access to Settings, Stock & Users)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-sky-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESET PASSWORD MODAL */}
      {resetTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-sky-100 w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-sky-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                Reset Password: @{resetTargetUser.username}
              </h3>
              <button
                onClick={() => setResetTargetUser(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Enter New Password (min 6 chars)
                </label>
                <div className="relative">
                  <input
                    type={showResetPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-3 pr-10 py-2 bg-white border border-sky-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                    title={showResetPassword ? 'Hide password' : 'Show password'}
                  >
                    {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setResetTargetUser(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold shadow-xs"
                >
                  {isSubmitting ? 'Resetting...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
