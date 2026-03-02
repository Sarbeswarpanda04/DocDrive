'use client';

import { useState, useCallback, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { FolderTree } from '@/components/FolderTree';
import { FileCard } from '@/components/FileCard';
import { FilePreviewModal } from '@/components/FilePreviewModal';
import { UploadZone, UploadZoneHandle } from '@/components/UploadZone';
import { Modal } from '@/components/Modal';
import { ShareModal } from '@/components/ShareModal';
import { Upload, Loader2, FolderPlus, RefreshCw, PanelLeftClose, PanelLeft, X, CheckCircle, AlertCircle, FileIcon } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/context/AuthContext';
import { cn, formatBytes } from '@/lib/utils';

export default function DashboardPage() {
  const { refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [folderPanelOpen, setFolderPanelOpen] = useState(false);
  const [renameModal, setRenameModal] = useState<{ id: string; name: string; type: 'file' | 'folder' } | null>(null);
  const [newName, setNewName] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'file' | 'folder' } | null>(null);
  const [folderModal, setFolderModal] = useState<{ parentId: string | null } | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [shareModal, setShareModal] = useState<{ id: string; name: string } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const uploadZoneRef = useRef<UploadZoneHandle>(null);

  // Mobile upload state
  type MobileFile = { file: File; status: 'pending' | 'uploading' | 'done' | 'error'; error?: string; preview?: string };
  const [mobileFiles, setMobileFiles] = useState<MobileFile[]>([]);
  const [mobileUploading, setMobileUploading] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  const handleMobileFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    setMobileFiles(selected.map((f) => ({
      file: f,
      status: 'pending' as const,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined,
    })));
    e.target.value = '';
  };

  const handleMobileUpload = async () => {
    const hasPending = mobileFiles.some((f) => f.status === 'pending');
    if (!hasPending) return;
    setMobileUploading(true);
    for (let i = 0; i < mobileFiles.length; i++) {
      if (mobileFiles[i].status !== 'pending') continue;
      setMobileFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f));
      try {
        const formData = new FormData();
        formData.append('file', mobileFiles[i].file);
        if (selectedFolder) formData.append('folder_id', selectedFolder);
        await api.post('/files/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
        setMobileFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f));
      } catch (err: any) {
        const msg = err.response?.data?.message || 'Upload failed';
        setMobileFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: msg } : f));
      }
    }
    setMobileUploading(false);
    refresh();
  };

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
    <div className="flex h-full relative">
      {/* Mobile folder panel overlay */}
      {folderPanelOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 backdrop-blur-sm sm:hidden"
          onClick={() => setFolderPanelOpen(false)}
        />
      )}

      {/* Folder Sidebar */}
      <aside className={cn(
        'flex-shrink-0 border-r border-gray-800 bg-gray-900 overflow-y-auto',
        'transition-transform duration-300 ease-in-out',
        // Mobile: fixed full-height slide-in drawer from left
        'fixed sm:relative top-0 left-0 h-full z-30 sm:z-auto',
        'w-72 sm:w-52',
        folderPanelOpen ? 'translate-x-0' : '-translate-x-full sm:translate-x-0',
        'px-3 py-4'
      )}>
        {/* Mobile header row with close button */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Folders</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => { setFolderModal({ parentId: null }); setNewFolderName(''); }}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors"
              title="New Folder"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setFolderPanelOpen(false)}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-700 transition-colors sm:hidden"
              title="Close"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>
        {foldersLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 text-gray-600 animate-spin" />
          </div>
        ) : (
          <FolderTree
            folders={foldersData || []}
            selectedId={selectedFolder}
            onSelect={(id) => { setSelectedFolder(id); setFolderPanelOpen(false); }}
            onCreateFolder={(parentId) => { setFolderModal({ parentId }); setNewFolderName(''); }}
            onRenameFolder={(id, name) => { setRenameModal({ id, name, type: 'folder' }); setNewName(name); }}
            onDeleteFolder={(id) => setDeleteConfirm({ id, type: 'folder' })}
          />
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 sm:px-4 md:px-6 py-3 sm:py-4 border-b border-gray-800 bg-gray-950/50">
          {/* Mobile folder panel toggle */}
          <button
            onClick={() => setFolderPanelOpen(!folderPanelOpen)}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors sm:hidden flex-shrink-0"
            title="Toggle folders"
          >
            {folderPanelOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>

          <h2 className="flex-1 text-base sm:text-lg font-semibold text-gray-100 truncate min-w-0">
            {currentFolderName}
          </h2>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => refetchFiles()}
              className="p-2 rounded-lg text-gray-500 hover:text-gray-300 hover:bg-gray-800 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowUpload(!showUpload)}
              className="btn-primary text-sm px-3 py-2 hidden sm:flex"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden xs:inline">Upload</span>
            </button>
          </div>
        </div>

        {/* Hidden file input for mobile */}
        <input
          ref={mobileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleMobileFileSelect}
        />

        {/* Mobile FAB — Upload */}
        <button
          onClick={() => mobileInputRef.current?.click()}
          className="sm:hidden fixed bottom-20 right-4 z-20 w-14 h-14 rounded-full btn-primary shadow-lg shadow-brand-900/50 flex items-center justify-center"
          title="Upload"
        >
          <Upload className="w-6 h-6" />
        </button>

        {/* Mobile Upload Preview Modal */}
        {mobileFiles.length > 0 && (
          <div className="sm:hidden fixed inset-0 z-50 flex items-end">
            {/* backdrop */}
            <div className="absolute inset-0 bg-black/60" onClick={() => !mobileUploading && setMobileFiles([])} />
            <div className="relative w-full bg-gray-900 rounded-t-2xl border-t border-gray-800 p-4 space-y-3 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-100">Upload {mobileFiles.length} file{mobileFiles.length > 1 ? 's' : ''}</h3>
                {!mobileUploading && (
                  <button onClick={() => setMobileFiles([])} className="p-1 text-gray-500 hover:text-gray-300">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* File list */}
              <div className="overflow-y-auto space-y-2 flex-1">
                {mobileFiles.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 bg-gray-800 rounded-xl p-2.5">
                    {/* Thumbnail or file icon */}
                    {item.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.preview} alt={item.file.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0">
                        <FileIcon className="w-6 h-6 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate font-medium">{item.file.name}</p>
                      <p className="text-xs text-gray-500">{formatBytes(item.file.size)}</p>
                    </div>
                    <div className="flex-shrink-0">
                      {item.status === 'pending' && (
                        <button onClick={() => setMobileFiles((prev) => prev.filter((_, idx) => idx !== i))} className="p-1 text-gray-500 hover:text-gray-300">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                      {item.status === 'uploading' && <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />}
                      {item.status === 'done' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {item.status === 'error' && (
                        <span className="flex items-center gap-1 text-red-400 text-xs">
                          <AlertCircle className="w-4 h-4" />
                          {item.error}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                {mobileFiles.every((f) => f.status === 'done') ? (
                  <button onClick={() => setMobileFiles([])} className="btn-primary flex-1">Done</button>
                ) : (
                  <>
                    <button onClick={() => !mobileUploading && setMobileFiles([])} disabled={mobileUploading} className="btn-secondary flex-1">Cancel</button>
                    <button onClick={handleMobileUpload} disabled={mobileUploading || !mobileFiles.some((f) => f.status === 'pending')} className="btn-primary flex-1">
                      {mobileUploading ? <><Loader2 className="w-4 h-4 animate-spin" />Uploading…</> : 'Upload'}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Upload Zone — desktop only */}
          {showUpload && (
            <div className="hidden sm:block card">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Upload Files</h3>
              <UploadZone
                ref={uploadZoneRef}
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
            <div className="flex flex-col items-center justify-center py-16 sm:py-20 text-center px-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
              {filesData?.map((file: any, idx: number) => (
                <FileCard
                  key={file.id}
                  file={file}
                  onRename={(id, name) => { setRenameModal({ id, name, type: 'file' }); setNewName(name); }}
                  onDelete={(id) => setDeleteConfirm({ id, type: 'file' })}
                  onShare={(id) => setShareModal({ id, name: file.file_name })}
                  onRefresh={refresh}
                  onPreview={() => setPreviewIndex(idx)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* File preview lightbox */}
      {previewIndex !== null && filesData && (
        <FilePreviewModal
          files={filesData}
          initialIndex={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onRefresh={refresh}
        />
      )}

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
        title={
          folderModal?.parentId
            ? `New subfolder in "${foldersData?.find((f: { id: string }) => f.id === folderModal.parentId)?.folder_name ?? 'folder'}"`
            : 'New Folder'
        }
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
