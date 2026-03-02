'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FileCard } from '@/components/FileCard';
import { Modal } from '@/components/Modal';
import { ShareModal } from '@/components/ShareModal';
import { Clock, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function RecentPage() {
  const queryClient = useQueryClient();
  const [renameModal, setRenameModal] = useState<{ id: string; name: string; type: 'file' } | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string } | null>(null);
  const [shareModal, setShareModal] = useState<{ id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: filesData, isLoading } = useQuery({
    queryKey: ['files-recent'],
    queryFn: () => api.get('/files/recent').then((r) => r.data.files),
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['files-recent'] });
    queryClient.invalidateQueries({ queryKey: ['files'] });
  }, [queryClient]);

  const handleRename = async () => {
    if (!renameModal || !newName.trim()) return;
    setActionLoading(true);
    try {
      await api.patch(`/files/${renameModal.id}`, { file_name: newName.trim() });
      refresh();
      setRenameModal(null);
      setNewName('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Rename failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setActionLoading(true);
    try {
      await api.delete(`/files/${deleteConfirm.id}`);
      refresh();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 md:px-6 py-3 sm:py-4 border-b border-gray-800 bg-gray-950/50">
        <Clock className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <h1 className="text-base sm:text-lg font-semibold text-gray-100">Recent</h1>
        <span className="text-xs text-gray-500 ml-auto">Last 30 files</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-6">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
          </div>
        ) : filesData?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-gray-600" />
            </div>
            <p className="text-gray-400 font-medium">No files yet</p>
            <p className="text-gray-600 text-sm mt-1">Files you upload will appear here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {filesData?.map((file: any) => (
              <FileCard
                key={file.id}
                file={file}
                onRename={(id, name) => { setRenameModal({ id, name, type: 'file' }); setNewName(name); }}
                onDelete={(id) => setDeleteConfirm({ id })}
                onShare={(id) => setShareModal({ id, name: file.file_name })}
                onRefresh={refresh}
              />
            ))}
          </div>
        )}
      </div>

      {/* Rename Modal */}
      <Modal open={!!renameModal} onClose={() => setRenameModal(null)} title="Rename File" size="sm">
        <div className="space-y-4">
          <input
            className="input-field"
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            autoFocus
          />
          <div className="flex gap-3">
            <button onClick={() => setRenameModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleRename} disabled={actionLoading} className="btn-primary flex-1">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Rename'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Confirm Delete" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Are you sure? This cannot be undone.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} disabled={actionLoading} className="btn-danger flex-1">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {shareModal && (
        <ShareModal
          open={!!shareModal}
          onClose={() => setShareModal(null)}
          fileId={shareModal.id}
          fileName={shareModal.name}
        />
      )}
    </div>
  );
}
