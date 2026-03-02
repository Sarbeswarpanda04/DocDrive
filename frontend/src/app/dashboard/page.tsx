'use client';

import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree } from '@/components/FolderTree';
import { FileCard } from '@/components/FileCard';
import { UploadZone } from '@/components/UploadZone';
import { Modal } from '@/components/Modal';
import { ShareModal } from '@/components/ShareModal';
import { Upload, Loader2, FolderPlus, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/context/AuthContext';

export default function DashboardPage() {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [renameModal, setRenameModal] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'file' | 'folder' } | null>(null);
  const [folderModal, setFolderModal] = useState<{ parentId: string | null } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [shareModal, setShareModal] = useState<{ id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: foldersData, isLoading: foldersLoading } = useQuery({
    queryKey: ['folders'],
    queryFn: () => api.get('/folders').then((r) => r.data.folders),
  });

  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useQuery({
    queryKey: ['files', selectedFolder],
    queryFn: () =>
      api.get('/files', { params: { folder_id: selectedFolder || undefined } }).then((r) => r.data.files),
  });

  const refresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['files'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
    refreshUser();
  }, [queryClient, refreshUser]);

  const handleRename = async () => {
    if (!renameModal || !newName.trim()) return;
    setActionLoading(true);
    try {
      if (renameModal.type === 'file') {
        await api.patch(`/files/${renameModal.id}`, { file_name: newName.trim() });
      } else {
        await api.patch(`/folders/${renameModal.id}`, { folder_name: newName.trim() });
      }
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
      if (deleteConfirm.type === 'file') {
        await api.delete(`/files/${deleteConfirm.id}`);
      } else {
        await api.delete(`/folders/${deleteConfirm.id}`);
      }
      refresh();
      setDeleteConfirm(null);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Delete failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setActionLoading(true);
    try {
      await api.post('/folders', {
        folder_name: newFolderName.trim(),
        parent_folder_id: folderModal?.parentId || undefined,
      });
      refresh();
      setFolderModal(null);
      setNewFolderName('');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create folder');
    } finally {
      setActionLoading(false);
    }
  };

  const currentFolderName = selectedFolder
    ? foldersData?.find((f: any) => f.id === selectedFolder)?.folder_name
    : 'All Files';

  return (
    <div className="flex h-full">
      {/* Folder Sidebar */}
      <aside className="w-56 flex-shrink-0 border-r border-gray-800 bg-gray-900/50 px-3 py-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Folders</span>
          <button
            onClick={() => { setFolderModal({ parentId: null }); setNewFolderName(''); }}
            className="p-1 rounded text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
            title="New Folder"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        </div>
        {foldersLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          </div>
        ) : (
          <FolderTree
            folders={foldersData || []}
            selectedId={selectedFolder}
            onSelect={setSelectedFolder}
            onCreateFolder={(parentId) => { setFolderModal({ parentId }); setNewFolderName(''); }}
            onRenameFolder={(id, name) => { setRenameModal({ id, name, type: 'folder' }); setNewName(name); }}
            onDeleteFolder={(id) => setDeleteConfirm({ id, type: 'folder' })}
          />
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/50">
          <h2 className="text-lg font-semibold text-gray-100">{currentFolderName}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetchFiles()}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="btn-primary"
            >
              <Upload className="w-4 h-4" />
              Upload
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Upload Zone (toggleable) */}
          {showUpload && (
            <div className="card">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Upload Files</h3>
              <UploadZone
                folderId={selectedFolder}
                onUploadComplete={() => { refresh(); }}
              />
            </div>
          )}

          {/* Files Grid */}
          {filesLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 text-gray-600 animate-spin" />
            </div>
          ) : filesData?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
                <Upload className="w-8 h-8 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">No files here yet</p>
              <p className="text-gray-600 text-sm mt-1">Upload your first file to get started</p>
              <button onClick={() => setShowUpload(true)} className="btn-primary mt-4">
                <Upload className="w-4 h-4" />
                Upload Files
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filesData?.map((file: any) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onRename={(id, name) => { setRenameModal({ id, name, type: 'file' }); setNewName(name); }}
                  onDelete={(id) => setDeleteConfirm({ id, type: 'file' })}
                  onShare={(id) => setShareModal({ id, name: file.file_name })}
                  onRefresh={refresh}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rename Modal */}
      <Modal
        open={!!renameModal}
        onClose={() => setRenameModal(null)}
        title={`Rename ${renameModal?.type === 'file' ? 'File' : 'Folder'}`}
        size="sm"
      >
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
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Confirm Delete"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Are you sure you want to delete this {deleteConfirm?.type}?
            {deleteConfirm?.type === 'folder' && ' All files and subfolders inside will also be deleted.'}
            {' '}This action cannot be undone.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteConfirm(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} disabled={actionLoading} className="btn-danger flex-1">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>

      {/* New Folder Modal */}
      <Modal
        open={!!folderModal}
        onClose={() => setFolderModal(null)}
        title="New Folder"
        size="sm"
      >
        <div className="space-y-4">
          <input
            className="input-field"
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            placeholder="Folder name"
            autoFocus
          />
          <div className="flex gap-3">
            <button onClick={() => setFolderModal(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleCreateFolder} disabled={actionLoading} className="btn-primary flex-1">
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Share Modal */}
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
