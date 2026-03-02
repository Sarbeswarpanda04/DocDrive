'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaceCapture } from '@/components/FaceCapture';
import { HardDrive, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/context/AuthContext';

type LoginMethod = 'face' | 'mpin';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [method, setMethod] = useState<LoginMethod>('face');
  const [name, setName] = useState('');
  const [mpin, setMpin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [faceEmbedding, setFaceEmbedding] = useState<number[] | null>(null);

  const handleFaceLogin = async () => {
    if (!faceEmbedding) { setError('Please capture your face first'); return; }
    if (!name.trim()) { setError('Please enter your name'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/face', { name: name.trim(), faceEmbedding });
      login(res.data.user);
      router.push(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Face login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMpinLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mpin) { setError('Name and MPIN are required'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/login/mpin', { name: name.trim(), mpin });
      login(res.data.user);
      router.push(res.data.user.role === 'admin' ? '/admin' : '/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'MPIN login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-100">DocDrive</span>
        </div>

        <div className="card">
          <h1 className="text-xl font-semibold text-gray-100 mb-1">Welcome back</h1>
          <p className="text-sm text-gray-400 mb-6">Sign in to your secure vault</p>

          {/* Method Toggle */}
          <div className="flex bg-gray-800 rounded-lg p-1 mb-6">
            {(['face', 'mpin'] as LoginMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMethod(m); setError(''); }}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-colors capitalize
                  ${method === m ? 'bg-brand-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
              >
                {m === 'face' ? '🪪 Face Login' : '🔢 MPIN Login'}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Name field always visible */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Your Name</label>
            <input
              className="input-field"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              autoFocus
            />
          </div>

          {method === 'face' ? (
            <div className="space-y-4">
              <FaceCapture onCapture={setFaceEmbedding} label="Scan your face to authenticate" />
              <button
                onClick={handleFaceLogin}
                disabled={!faceEmbedding || loading}
                className="btn-primary w-full"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Verifying...</> : 'Sign In with Face'}
              </button>
            </div>
          ) : (
            <form onSubmit={handleMpinLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">4-Digit MPIN</label>
                <input
                  className="input-field tracking-[0.5em] text-center text-lg"
                  type="password"
                  value={mpin}
                  onChange={(e) => setMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Signing in...</> : 'Sign In'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          New to DocDrive?{' '}
          <Link href="/register" className="text-brand-400 hover:text-brand-300 font-medium">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
