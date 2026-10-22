import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { DuoraLogo } from '../common/DuoraLogo';
import { Lock, Mail, User, ArrowRight, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import { isValidUsername } from '../../utils/duoraId';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../firebase/config';

export const AuthModal: React.FC = () => {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword } = useAuth();

  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [identifier, setIdentifier] = useState(''); // email or username
  const [email, setEmail] = useState(''); // for registration / password reset
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const resolveEmail = async (input: string): Promise<string> => {
    const trimmed = input.trim();
    if (trimmed.includes('@')) {
      return trimmed;
    }
    const clean = trimmed.replace(/^@/, '').toLowerCase();
    if (!clean) {
      throw new Error('Please enter your email or username.');
    }
    // Check usernames collection
    const uDoc = await getDoc(doc(db, 'usernames', clean));
    if (uDoc.exists() && uDoc.data()?.email) {
      return uDoc.data().email;
    }
    // Fallback search in users collection
    const q = query(collection(db, 'users'), where('usernameLower', '==', clean));
    const snap = await getDocs(q);
    if (!snap.empty && snap.docs[0].data()?.email) {
      return snap.docs[0].data().email;
    }
    throw new Error(`No account found with username "@${clean}". Try using your email.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        if (!identifier.trim()) {
          throw new Error('Please enter your email or username.');
        }
        if (!password) {
          throw new Error('Please enter your password.');
        }
        const resolvedEmail = await resolveEmail(identifier);
        await signInWithEmail(resolvedEmail, password);
      } else if (mode === 'register') {
        if (!displayName.trim()) {
          throw new Error('Please enter your full name.');
        }
        if (username && !isValidUsername(username)) {
          throw new Error('Username must be 3-30 characters (letters, numbers, underscores).');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        await signUpWithEmail(email, password, displayName, username);
        setSuccess('Account created! A verification link has been sent to your email.');
      } else if (mode === 'forgot') {
        if (!email.trim()) {
          throw new Error('Please enter your email address.');
        }
        await resetPassword(email);
        setSuccess('Password reset link sent to your email.');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message || 'Authentication failed. Please try again.';
      if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password') || msg.includes('auth/user-not-found')) {
        msg = 'Invalid credentials. Please verify your email or username and password.';
      } else if (msg.includes('auth/email-already-in-use')) {
        msg = 'An account already exists with this email.';
      } else if (msg.includes('auth/weak-password')) {
        msg = 'Password must be at least 6 characters.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err?.message || 'Google sign-in could not be completed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
      <div className="w-full max-w-md bg-white dark:bg-[#1A1826] rounded-3xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-7 text-center border-b border-stone-100 dark:border-stone-800">
          <div className="flex justify-center mb-2.5">
            <DuoraLogo size="lg" showTagline={false} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-stone-900 dark:text-white">
            {mode === 'login' ? 'Welcome Back' : mode === 'register' ? 'Create Your Account' : 'Reset Password'}
          </h2>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            {mode === 'login'
              ? 'Sign in to access your chats and calls'
              : mode === 'register'
              ? 'Connect with friends and start talking'
              : 'Enter your email to receive a password reset link'}
          </p>
        </div>

        {/* Form Container */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Alex Rivers"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7057E8]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                    Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-stone-400">@</span>
                    <input
                      type="text"
                      placeholder="alex_rivers"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7057E8]"
                    />
                  </div>
                </div>
              </>
            )}

            {mode === 'login' ? (
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Email or Username
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="text"
                    required
                    placeholder="email@example.com or @username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7057E8]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7057E8]"
                  />
                </div>
              </div>
            )}

            {mode !== 'forgot' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-stone-600 dark:text-stone-400">
                    Password
                  </label>
                  {mode === 'login' && (
                    <button
                      type="button"
                      onClick={() => { setMode('forgot'); setError(null); }}
                      className="text-[11px] text-[#7057E8] dark:text-[#A796FF] hover:underline"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#7057E8]"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-[#7057E8] hover:bg-[#5E44D9] active:scale-[0.99] transition shadow-md shadow-violet-500/20 flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : mode === 'login' ? (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : mode === 'register' ? (
                <span>Create Account</span>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <KeyRound className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Clean toggle links: "Didn't have account? Create new account" */}
          <div className="mt-4 text-center">
            {mode === 'login' ? (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Didn't have account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); setSuccess(null); }}
                  className="font-bold text-[#7057E8] dark:text-[#A796FF] hover:underline cursor-pointer"
                >
                  Create new account
                </button>
              </p>
            ) : mode === 'register' ? (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setSuccess(null); }}
                  className="font-bold text-[#7057E8] dark:text-[#A796FF] hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <button
                type="button"
                onClick={() => { setMode('login'); setError(null); }}
                className="text-xs font-bold text-[#7057E8] dark:text-[#A796FF] hover:underline cursor-pointer"
              >
                Back to Sign In
              </button>
            )}
          </div>

          {/* Social Sign-In Divider */}
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-stone-200 dark:border-stone-800" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-white dark:bg-[#1A1826] text-stone-400">
                or
              </span>
            </div>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-50 dark:hover:bg-stone-750 transition text-sm font-semibold flex items-center justify-center gap-2.5 cursor-pointer shadow-xs"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign in with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};
