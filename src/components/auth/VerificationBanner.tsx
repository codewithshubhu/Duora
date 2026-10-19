import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Mail, CheckCircle2, RefreshCw, AlertTriangle } from 'lucide-react';

export const VerificationBanner: React.FC = () => {
  const { currentUser, emailVerified, sendVerificationEmail, checkVerificationStatus } = useAuth();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!currentUser || emailVerified) return null;

  const handleResend = async () => {
    setResending(true);
    setMessage(null);
    try {
      await sendVerificationEmail();
      setMessage('Verification link sent! Please check your inbox and spam folder.');
    } catch (err: any) {
      setMessage(err?.message || 'Failed to send verification link.');
    } finally {
      setResending(false);
    }
  };

  const handleCheck = async () => {
    setChecking(true);
    setMessage(null);
    try {
      const verified = await checkVerificationStatus();
      if (verified) {
        setMessage('Email verified! You now have full access to Duora.');
      } else {
        setMessage('Not verified yet. Please click the link sent to your email.');
      }
    } catch (err: any) {
      setMessage('Could not refresh status. Please try again.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>
            <strong>Verify your email ({currentUser.email}):</strong> Duora requires email verification for full private messaging access.
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResend}
            disabled={resending}
            className="px-2.5 py-1 rounded-md bg-amber-600 text-white hover:bg-amber-700 transition font-medium flex items-center gap-1 text-[11px]"
          >
            <Mail className="w-3 h-3" />
            {resending ? 'Sending...' : 'Resend Link'}
          </button>
          <button
            onClick={handleCheck}
            disabled={checking}
            className="px-2.5 py-1 rounded-md bg-white dark:bg-stone-800 border border-amber-300 dark:border-stone-700 hover:bg-stone-100 transition font-medium flex items-center gap-1 text-[11px]"
          >
            <RefreshCw className={`w-3 h-3 ${checking ? 'animate-spin' : ''}`} />
            {checking ? 'Checking...' : "I've Verified"}
          </button>
        </div>
      </div>
      {message && (
        <div className="mt-1 text-center font-medium text-amber-700 dark:text-amber-300 text-[11px]">
          {message}
        </div>
      )}
    </div>
  );
};
