'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/context/AuthContext';
import { StorageBar } from '@/components/StorageBar';
import { Modal } from '@/components/Modal';
import { Key, Trash2, LogOut, Loader2, Shield, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

export default function SettingsPage() {
  const { user, logout, refreshUser } = useAuth();
  const [currentMpin, setCurrentMpin] = useState('');
  const [newMpin, setNewMpin] = useState('');
  const [confirmNewMpin, setConfirmNewMpin] = useState('');
  const [mpinLoading, setMpinLoading] = useState(false);
  const [mpinSuccess, setMpinSuccess] = useState(false);
  const [mpinError, setMpinError] = useState('');
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleChangeMpin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMpinError('');
    setMpinSuccess(false);

    if (!/^\d{4}$/.test(newMpin)) {
      setMpinError('New MPIN must be exactly 4 digits');
      return;
    }
    if (newMpin !== confirmNewMpin) {
      setMpinError('New MPINs do not match');
      return;
    }

    setMpinLoading(true);
    try {
      await api.patch('/auth/change-mpin', { currentMpin, newMpin });
      setMpinSuccess(true);
      setCurrentMpin('');
      setNewMpin('');
      setConfirmNewMpin('');
    } catch (err: any) {
      setMpinError(err.response?.data?.message || 'Failed to change MPIN');
    } finally {
      setMpinLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-100">Settings</h1>

      {/* Profile Info */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-200">Account Information</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Name</span>
            <span className="text-sm font-medium text-gray-200">{user.name}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-gray-800">
            <span className="text-sm text-gray-400">Role</span>
            <span className={`text-sm font-medium capitalize flex items-center gap-1.5
              ${user.role === 'admin' ? 'text-purple-300' : 'text-gray-200'}`}>
              {user.role === 'admin' && <Shield className="w-3.5 h-3.5" />}
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Storage Usage */}
      <div className="card space-y-4">
        <h2 className="text-base font-semibold text-gray-200">Storage Usage</h2>
        <StorageBar used={user.storage_used} quota={user.storage_quota} />
        <button onClick={refreshUser} className="btn-secondary text-sm">
          Refresh Usage
        </button>
      </div>

      {/* Change MPIN */}
      <div className="card space-y-4">
        <div className="flex items-center gap-2">
          <Key className="w-5 h-5 text-brand-400" />
          <h2 className="text-base font-semibold text-gray-200">Change MPIN</h2>
        </div>

        {mpinSuccess && (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-900/30 border border-green-800/50 rounded-lg text-sm text-green-400">
            <CheckCircle className="w-4 h-4" />
            MPIN updated successfully!
          </div>
        )}

        {mpinError && (
          <div className="px-4 py-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400">
            {mpinError}
          </div>
        )}

        <form onSubmit={handleChangeMpin} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Current MPIN</label>
            <input
              className="input-field"
              type="password"
              value={currentMpin}
              onChange={(e) => setCurrentMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              maxLength={4}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">New MPIN</label>
            <input
              className="input-field"
              type="password"
              value={newMpin}
              onChange={(e) => setNewMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              maxLength={4}
              inputMode="numeric"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm New MPIN</label>
            <input
              className="input-field"
              type="password"
              value={confirmNewMpin}
              onChange={(e) => setConfirmNewMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="••••"
              maxLength={4}
              inputMode="numeric"
            />
          </div>
          <button type="submit" disabled={mpinLoading} className="btn-primary">
            {mpinLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Updating...</> : 'Update MPIN'}
          </button>
        </form>
      </div>

      {/* Danger Zone */}
      <div className="card border-red-900/50 space-y-4">
        <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <button onClick={logout} className="btn-secondary flex items-center gap-2">
            <LogOut className="w-4 h-4" /> Logout
          </button>
          <button onClick={() => setDeleteModal(true)} className="btn-danger flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete Account
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete Account" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            This will permanently delete your account and ALL your files. This action{' '}
            <span className="text-red-400 font-medium">cannot be undone</span>.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Type <span className="text-red-400 font-mono">DELETE</span> to confirm
            </label>
            <input
              className="input-field"
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={() => setDeleteModal(false)} className="btn-secondary flex-1">Cancel</button>
            <button
              disabled={deleteConfirmText !== 'DELETE'}
              onClick={() => {
                // TODO: Implement delete account API call
                alert('Account deletion is not implemented in this demo.');
              }}
              className="btn-danger flex-1 disabled:opacity-40"
            >
              Delete Forever
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
