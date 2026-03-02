'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { FaceCapture } from '@/components/FaceCapture';
import { HardDrive, Loader2, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/lib/context/AuthContext';

type Step = 'info' | 'face';

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<Step>('info');
  const [name, setName] = useState('');
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [showMpin, setShowMpin] = useState(false);
  const [embedding, setEmbedding] = useState<number[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateInfo = () => {
    if (!name.trim()) return 'Name is required';
    if (!/^\d{4}$/.test(mpin)) return 'MPIN must be exactly 4 digits';
    if (mpin !== confirmMpin) return 'MPINs do not match';
    return null;
  };

  const handleInfoNext = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateInfo();
    if (err) { setError(err); return; }
    setError('');
    setStep('face');
  };

  const handleFaceCapture = (emb: number[]) => {
    setEmbedding(emb);
  };

  const handleSubmit = async () => {
    if (!embedding) { setError('Please capture your face first'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/auth/register', {
        name: name.trim(),
        mpin,
        faceEmbedding: embedding,
      });
      login(res.data.user);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center">
            <HardDrive className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-100">DocDrive</span>
        </div>

        <div className="card">
          <h1 className="text-xl font-semibold text-gray-100 mb-1">Create your account</h1>
          <p className="text-sm text-gray-400 mb-6">Secure cloud storage with face verification</p>

          {/* Step Indicators */}
          <div className="flex items-center gap-2 mb-6">
            {(['info', 'face'] as Step[]).map((s, i) => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${step === s || (s === 'info' && step === 'face') ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-500'}`}>
                  {i + 1}
                </div>
                <span className={`text-xs ${step === s ? 'text-gray-200' : 'text-gray-500'} flex-1`}>
                  {s === 'info' ? 'Your Info' : 'Face Setup'}
                </span>
                {i < 1 && <div className={`h-px flex-1 ${step === 'face' ? 'bg-brand-600' : 'bg-gray-800'}`} />}
              </div>
            ))}
          </div>

          {error && (
            <div className="mb-4 px-4 py-3 bg-red-900/30 border border-red-800/50 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {step === 'info' && (
            <form onSubmit={handleInfoNext} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Full Name</label>
                <input
                  className="input-field"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">4-Digit MPIN</label>
                <div className="relative">
                  <input
                    className="input-field pr-10"
                    type={showMpin ? 'text' : 'password'}
                    value={mpin}
                    onChange={(e) => setMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    maxLength={4}
                    inputMode="numeric"
                  />
                  <button type="button" onClick={() => setShowMpin(!showMpin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">
                    {showMpin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1.5">Confirm MPIN</label>
                <input
                  className="input-field"
                  type="password"
                  value={confirmMpin}
                  onChange={(e) => setConfirmMpin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>
              <button type="submit" className="btn-primary w-full">Continue →</button>
            </form>
          )}

          {step === 'face' && (
            <div className="space-y-4">
              <FaceCapture onCapture={handleFaceCapture} label="Capture your face for biometric login" />
              <div className="flex gap-3">
                <button onClick={() => setStep('info')} className="btn-secondary flex-1">
                  ← Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!embedding || loading}
                  className="btn-primary flex-1"
                >
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Creating...</> : 'Create Account'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
