import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

/**
 * Formats bytes to a human-readable string
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
};

/**
 * Returns a percentage of storage used (0-100)
 */
export const storagePercent = (used: number, quota: number): number => {
  if (quota === 0) return 0;
  return Math.min(100, Math.round((used / quota) * 100));
};

/**
 * Returns a color class based on storage percentage
 */
export const storageColor = (percent: number): string => {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 75) return 'bg-yellow-500';
  return 'bg-brand-500';
};

/**
 * Formats a timestamp to a readable date
 */
export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Returns an icon name based on MIME type
 */
export const getMimeIcon = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio-lines';
  if (mimeType === 'application/pdf') return 'file-text';
  if (mimeType.includes('word')) return 'file-text';
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return 'table';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
  return 'file';
};

/**
 * Truncates filename preserving extension
 */
export const truncateFilename = (name: string, maxLen = 30): string => {
  if (name.length <= maxLen) return name;
  const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
  const baseTruncated = name.slice(0, maxLen - ext.length - 3);
  return `${baseTruncated}...${ext}`;
};

/**
 * Captures the first frame of a video (URL or blob URL) and returns a data-URL thumbnail.
 * Works client-side only.
 */
export const generateVideoThumbnail = (src: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.crossOrigin = 'anonymous';
    video.muted = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.src = src;
    video.currentTime = 0.5; // seek past the very first frame so codec has data

    const capture = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 320;
        canvas.height = video.videoHeight || 180;
        canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      } catch (e) {
        reject(e);
      } finally {
        video.src = '';
      }
    };

    video.addEventListener('seeked', capture, { once: true });
    video.addEventListener('error', () => reject(new Error('video error')), { once: true });
    // Some browsers need load() before seeked fires
    video.load();
  });
