'use client';

import { useState } from 'react';
import { Modal } from './Modal';
import { Copy, Check, Share2, Loader2 } from 'lucide-react';
import api from '@/lib/api';

interface ShareModalProps {
  open: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
}

export function ShareModal({ open, onClose, fileId, fileName }: ShareModalProps) {
  const [hours, setHours] = useState('24');
  const [link, setLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateLink = async () => {
    try {
      setLoading(true);
      const res = await api.post(`/files/${fileId}/share`, {
        expiresInHours: hours ? parseInt(hours) : undefined,
      });
      setLink(res.data.link);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to generate link');
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setLink('');
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Share File" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-400 truncate">
          <span className="text-gray-200 font-medium">{fileName}</span>
        </p>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">
            Link expires in (hours)
          </label>
          <input
            type="number"
            className="input-field"
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Leave empty for no expiry"
            min="1"
            max="8760"
          />
        </div>

        <button onClick={generateLink} disabled={loading} className="btn-primary w-full">
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Generating...</>
          ) : (
            <><Share2 className="w-4 h-4" />Generate Link</>
          )}
        </button>

        {link && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 bg-gray-800 rounded-lg px-3 py-2.5 border border-gray-700">
              <span className="flex-1 text-xs text-gray-300 truncate font-mono">{link}</span>
              <button onClick={copyLink} className="flex-shrink-0 text-gray-400 hover:text-brand-400 transition-colors">
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              Link copied! Anyone with this link can download the file.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}
