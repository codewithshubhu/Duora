import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as fbSignOut,
  sendEmailVerification,
  sendPasswordResetEmail as fbSendPasswordResetEmail,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserProfile, UserPrivateInfo } from '../types';
import { initializeUserProfile, getUserProfile, getUserPrivateInfo, setUserOnlineStatus } from '../services/userService';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  profile: UserProfile | null;
  privateInfo: UserPrivateInfo | null;
  loading: boolean;
  emailVerified: boolean;
  signInWithEmail: (e: string, p: string) => Promise<void>;
  signUpWithEmail: (e: string, p: string, displayName: string, username?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  checkVerificationStatus: () => Promise<boolean>;
  resetPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [privateInfo, setPrivateInfo] = useState<UserPrivateInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [emailVerified, setEmailVerified] = useState<boolean>(false);

  // Sync profile when auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setEmailVerified(user.emailVerified);
        try {
          let prof = await getUserProfile(user.uid);
          if (!prof) {
            // First time login with Google or email, initialize profile
            prof = await initializeUserProfile(
              user.uid,
              user.email || '',
              user.displayName || user.email?.split('@')[0] || 'Duora Member',
              undefined,
              user.photoURL || undefined
            );
          }
          setProfile(prof);
          const priv = await getUserPrivateInfo(user.uid);
          setPrivateInfo(priv);
          await setUserOnlineStatus(user.uid, true);
        } catch (err) {
          console.error('Error loading user profile:', err);
        }
      } else {
        setProfile(null);
        setPrivateInfo(null);
        setEmailVerified(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Online status heartbeat & unload listener
  useEffect(() => {
    if (!currentUser) return;
    const interval = setInterval(() => {
      setUserOnlineStatus(currentUser.uid, true);
    }, 60000);

    const handleBeforeUnload = () => {
      setUserOnlineStatus(currentUser.uid, false);
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      setUserOnlineStatus(currentUser.uid, false);
    };
  }, [currentUser]);

  const signInWithEmail = async (email: string, pass: string) => {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
    setEmailVerified(cred.user.emailVerified);
  };

  const signUpWithEmail = async (email: string, pass: string, displayName: string, username?: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
    await fbUpdateProfile(cred.user, { displayName: displayName.trim() });
    // Send email verification immediately
    await sendEmailVerification(cred.user);
    // Initialize profile
    const prof = await initializeUserProfile(
      cred.user.uid,
      cred.user.email || email,
      displayName.trim(),
      username?.trim()
    );
    setProfile(prof);
    setEmailVerified(false);
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    setEmailVerified(cred.user.emailVerified);
  };

  const signOut = async () => {
    try {
      if (currentUser) {
        await setUserOnlineStatus(currentUser.uid, false).catch((err) => {
          console.warn('Could not update offline status before sign out:', err);
        });
      }
    } catch (e) {
      console.warn('Sign out cleanup error:', e);
    }

    try {
      await fbSignOut(auth);
    } catch (err) {
      console.error('Firebase sign out error:', err);
    } finally {
      setCurrentUser(null);
      setProfile(null);
      setPrivateInfo(null);
      setEmailVerified(false);
    }
  };

  const sendVerificationEmail = async () => {
    if (auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    }
  };

  const checkVerificationStatus = async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    const isVer = auth.currentUser.emailVerified;
    setEmailVerified(isVer);
    return isVer;
  };

  const resetPassword = async (email: string) => {
    await fbSendPasswordResetEmail(auth, email.trim());
  };

  const refreshProfile = async () => {
    if (currentUser) {
      const prof = await getUserProfile(currentUser.uid);
      setProfile(prof);
      const priv = await getUserPrivateInfo(currentUser.uid);
      setPrivateInfo(priv);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        privateInfo,
        loading,
        emailVerified,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOut,
        sendVerificationEmail,
        checkVerificationStatus,
        resetPassword,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
