'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { loadFaceModels, getFaceEmbedding, isFaceDetected } from '@/lib/faceApi';
import { Camera, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FaceCaptureProps {
  onCapture: (embedding: number[]) => void;
  label?: string;
}

type CaptureState = 'loading' | 'ready' | 'detecting' | 'captured' | 'error';

export function FaceCapture({ onCapture, label = 'Face Verification' }: FaceCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CaptureState>('loading');
  const [message, setMessage] = useState('Loading face models...');
  const [faceVisible, setFaceVisible] = useState(false);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('ready');
      setMessage('Position your face in the frame, then click Capture');
    } catch (err) {
      setState('error');
      setMessage('Camera access denied. Please allow camera access.');
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        await loadFaceModels();
        if (mounted) await startCamera();
      } catch {
        if (mounted) {
          setState('error');
          setMessage('Failed to load face detection models.');
        }
      }
    })();

    return () => {
      mounted = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [startCamera]);

  // Live face detection indicator
  useEffect(() => {
    if (state !== 'ready') return;
    const interval = setInterval(async () => {
      if (videoRef.current) {
        const detected = await isFaceDetected(videoRef.current).catch(() => false);
        setFaceVisible(detected);
      }
    }, 800);
    return () => clearInterval(interval);
  }, [state]);

  const handleCapture = async () => {
    if (!videoRef.current) return;
    setState('detecting');
    setMessage('Capturing face embedding...');

    const embedding = await getFaceEmbedding(videoRef.current);
    if (!embedding) {
      setState('ready');
      setMessage('No face detected. Please ensure your face is clearly visible.');
      return;
    }

    setState('captured');
    setMessage('Face captured successfully!');
    streamRef.current?.getTracks().forEach((t) => t.stop());
    onCapture(embedding);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm font-medium text-gray-400">{label}</p>

      <div className={cn(
        'relative w-64 h-48 rounded-xl overflow-hidden border-2 transition-colors',
        faceVisible && state === 'ready' ? 'border-green-500' : 'border-gray-700',
        state === 'captured' ? 'border-brand-500' : '',
        state === 'error' ? 'border-red-500' : ''
      )}>
        <video
          ref={videoRef}
          className="w-full h-full object-cover scale-x-[-1]"
          muted
          playsInline
        />

        {state === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80">
            <Loader2 className="w-8 h-8 text-brand-400 animate-spin" />
          </div>
        )}

        {state === 'captured' && (
          <div className="absolute inset-0 flex items-center justify-center bg-brand-900/70">
            <CheckCircle className="w-12 h-12 text-brand-300" />
          </div>
        )}

        {faceVisible && state === 'ready' && (
          <div className="absolute top-2 right-2">
            <span className="flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
            </span>
          </div>
        )}
      </div>

      <p className={cn(
        'text-xs text-center max-w-xs',
        state === 'captured' ? 'text-green-400' : 'text-gray-400',
        state === 'error' || (!faceVisible && state === 'ready') ? 'text-yellow-400' : ''
      )}>
        {state === 'error' ? (
          <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" />{message}</span>
        ) : message}
      </p>

      {(state === 'ready' || state === 'detecting') && (
        <button
          onClick={handleCapture}
          disabled={state === 'detecting' || !faceVisible}
          className="btn-primary disabled:opacity-40"
        >
          {state === 'detecting' ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Capturing...</>
          ) : (
            <><Camera className="w-4 h-4" />Capture Face</>
          )}
        </button>
      )}
    </div>
  );
}
