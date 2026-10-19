import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES, WallpaperStyle } from '../../context/ThemeContext';
import { updateUserProfile, toggleBlockUser } from '../../services/userService';
import { uploadProfilePhoto } from '../../services/storageService';
import {
  ArrowLeft,
  Search,
  ChevronRight,
  Palette,
  Sparkles,
  Lock,
  Eye,
  CheckCheck,
  Ban,
  MessageSquare,
  HelpCircle,
  Shield,
  Info,
  LogOut,
  Check,
  User,
  Copy,
  ExternalLink,
  Smartphone,
  Camera,
  Moon,
  Sun,
  Bell,
  Sliders,
  UserCheck
} from 'lucide-react';

interface SettingsScreenProps {
  onBack: () => void;
  onOpenProfile: () => void;
  onOpenRequests?: () => void;
  pendingRequestsCount?: number;
}

const WALLPAPERS: { id: WallpaperStyle; name: string; desc: string }[] = [
  { id: 'clean', name: 'Duora Clean', desc: 'Minimal solid backdrop' },
  { id: 'constellation', name: 'Constellation', desc: 'Private celestial star dots' },
  { id: 'geometric', name: 'Geometric Mesh', desc: 'Subtle technical grid' },
  { id: 'waves', name: 'Organic Waves', desc: 'Smooth lilac gradient glow' },
  { id: 'dots', name: 'Dot Matrix', desc: 'Modern dot pattern' }
];

const ACCENT_COLORS = [
  { name: 'Royal Violet', hex: '#7057E8' },
  { name: 'Electric Lilac', hex: '#9333EA' },
  { name: 'Ocean Cyan', hex: '#06B6D4' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Amber Gold', hex: '#F59E0B' },
  { name: 'Rose Ruby', hex: '#F43F5E' },
  { name: 'Pure Blue', hex: '#2563EB' }
];

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onOpenProfile,
  onOpenRequests,
  pendingRequestsCount = 0
}) => {
  const { profile, privateInfo, signOut, refreshProfile } = useAuth();
  const { theme, setThemeId, wallpaper, setWallpaper, accentColor, setAccentColor } = useTheme();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSubView, setActiveSubView] = useState<'main' | 'themes' | 'wallpapers' | 'faq' | 'blocked' | 'about'>('main');
  const [copiedId, setCopiedId] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local state for instant toggles
  const [isDiscoverable, setIsDiscoverable] = useState(profile?.isDiscoverable !== false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(profile?.showOnlineStatus !== false);
  const [showLastSeen, setShowLastSeen] = useState(profile?.showLastSeen !== false);
  const [readReceipts, setReadReceipts] = useState(profile?.readReceipts !== false);

  const handleToggle = async (key: 'isDiscoverable' | 'showOnlineStatus' | 'showLastSeen' | 'readReceipts', val: boolean) => {
    if (!profile) return;
    if (key === 'isDiscoverable') setIsDiscoverable(val);
    if (key === 'showOnlineStatus') setShowOnlineStatus(val);
    if (key === 'showLastSeen') setShowLastSeen(val);
    if (key === 'readReceipts') setReadReceipts(val);

    try {
      await updateUserProfile(profile.uid, { [key]: val });
      await refreshProfile();
    } catch (err) {
      console.error('Failed to update toggle:', err);
    }
  };

  const handleCopyId = () => {
    if (profile?.duoraId) {
      navigator.clipboard.writeText(profile.duoraId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handlePhotoUploadFromPhone = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploadingPhoto(true);
    try {
      const newAvatarUrl = await uploadProfilePhoto(profile.uid, file);
      await updateUserProfile(profile.uid, { avatarUrl: newAvatarUrl });
      await refreshProfile();
    } catch (err) {
      console.error('Failed to update profile photo:', err);
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to log out of Duora?')) {
      await signOut();
    }
  };

  // Sub-view: 12 Built-in Themes with live preview
  if (activeSubView === 'themes') {
    return (
      <div
        className="flex flex-col h-full select-none"
        style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}
      >
        <div
          className="p-4 border-b flex items-center gap-3 backdrop-blur-md"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
        >
          <button
            onClick={() => setActiveSubView('main')}
            className="p-1.5 rounded-full hover:opacity-80 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="font-bold text-base">Appearance & Themes</h2>
            <p className="text-[11px] text-stone-400">Select any of 12 built-in themes</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {THEMES.map(t => {
            const isSelected = theme.id === t.id;
            return (
              <div
                key={t.id}
                onClick={() => setThemeId(t.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between shadow-2xs hover:scale-[1.01] active:scale-[0.99] ${
                  isSelected ? 'ring-2' : ''
                }`}
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                  // @ts-ignore
                  '--tw-ring-color': theme.colors.primary
                }}
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-12 h-12 rounded-xl shadow-inner flex items-center justify-center border"
                    style={{ backgroundColor: t.colors.background, borderColor: t.colors.border }}
                  >
                    <div
                      className="w-6 h-6 rounded-lg shadow-sm"
                      style={{ backgroundColor: t.colors.primary }}
                    />
                  </div>
                  <div>
                    <span className="text-xs font-bold block">{t.name}</span>
                    <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                      {t.isDark ? <Moon className="w-3 h-3" /> : <Sun className="w-3 h-3" />}
                      <span>{t.isDark ? 'Dark Mode' : 'Light Mode'}</span>
                    </span>
                  </div>
                </div>
                {isSelected && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-white"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Sub-view: Chat Wallpapers
  if (activeSubView === 'wallpapers') {
    return (
      <div
        className="flex flex-col h-full select-none"
        style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}
      >
        <div
          className="p-4 border-b flex items-center gap-3 backdrop-blur-md"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
        >
          <button
            onClick={() => setActiveSubView('main')}
            className="p-1.5 rounded-full hover:opacity-80 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-base">Chat Wallpapers</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {WALLPAPERS.map(wp => {
            const isSelected = wallpaper === wp.id;
            return (
              <div
                key={wp.id}
                onClick={() => setWallpaper(wp.id)}
                className="p-3.5 rounded-2xl border cursor-pointer transition flex items-center justify-between"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.border
                }}
              >
                <div>
                  <span className="text-xs font-bold block">{wp.name}</span>
                  <span className="text-[11px] text-stone-400">{wp.desc}</span>
                </div>
                {isSelected && <Check className="w-4 h-4" style={{ color: theme.colors.primary }} />}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Sub-view: Blocked Accounts
  if (activeSubView === 'blocked') {
    const blockedList = privateInfo?.blockedUserIds || [];
    return (
      <div
        className="flex flex-col h-full select-none"
        style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}
      >
        <div
          className="p-4 border-b flex items-center gap-3 backdrop-blur-md"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
        >
          <button
            onClick={() => setActiveSubView('main')}
            className="p-1.5 rounded-full hover:opacity-80 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-base">Blocked Accounts</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {blockedList.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <Ban className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">No blocked accounts</p>
              <p className="text-[11px] mt-1 max-w-xs mx-auto">
                Users you block will not be able to send you messages or voice/video calls.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {blockedList.map(uid => (
                <div
                  key={uid}
                  className="p-3 rounded-2xl border flex items-center justify-between"
                  style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
                >
                  <span className="text-xs font-mono">{uid}</span>
                  <button
                    onClick={async () => {
                      if (profile) {
                        await toggleBlockUser(profile.uid, uid);
                        await refreshProfile();
                      }
                    }}
                    className="px-3 py-1 rounded-xl text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sub-view: Help & FAQ
  if (activeSubView === 'faq') {
    return (
      <div
        className="flex flex-col h-full select-none"
        style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}
      >
        <div
          className="p-4 border-b flex items-center gap-3 backdrop-blur-md"
          style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
        >
          <button
            onClick={() => setActiveSubView('main')}
            className="p-1.5 rounded-full hover:opacity-80 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="font-bold text-base">Help & Security FAQs</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3 text-xs leading-relaxed">
          <div className="p-4 rounded-2xl border space-y-1.5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <span className="font-bold block text-sm" style={{ color: theme.colors.primary }}>What is a Permanent Duora ID?</span>
            <p className="text-stone-400">
              Your Duora ID (e.g. DUR-XXXX-XXXX) is an immutable cryptographic identity key. It never changes, protecting your account even if you update your display name or username.
            </p>
          </div>
          <div className="p-4 rounded-2xl border space-y-1.5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <span className="font-bold block text-sm" style={{ color: theme.colors.primary }}>Are phone numbers required?</span>
            <p className="text-stone-400">
              No. Duora never collects, stores, or transmits phone numbers. Communication is routed securely using verified session tokens and peer transport.
            </p>
          </div>
          <div className="p-4 rounded-2xl border space-y-1.5" style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}>
            <span className="font-bold block text-sm" style={{ color: theme.colors.primary }}>How do real voice/video calls work?</span>
            <p className="text-stone-400">
              Duora calls use direct WebRTC peer connections with STUN signaling in Cloud Firestore. Media flows directly between devices without central relay logging.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // MAIN INSTAGRAM-STYLE SETTINGS LAYOUT
  return (
    <div
      className="flex flex-col h-full select-none overflow-hidden"
      style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}
    >
      {/* Hidden file input for quick photo change from phone */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handlePhotoUploadFromPhone}
        accept="image/*"
        className="hidden"
      />

      {/* Top Navigation Bar */}
      <div
        className="p-4 border-b flex items-center justify-between backdrop-blur-md"
        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:opacity-80 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold tracking-tight">Settings</h1>
        </div>
        <button
          onClick={onOpenProfile}
          className="text-xs font-bold hover:underline"
          style={{ color: theme.colors.primary }}
        >
          Edit
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        
        {/* Instagram Profile Header / Accounts Banner */}
        {profile && (
          <div
            className="p-4 rounded-3xl border shadow-xs space-y-3.5 transition"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }}
          >
            <div className="flex items-center gap-4">
              {/* Profile Photo with Upload Badge */}
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <div
                  className="w-16 h-16 rounded-full overflow-hidden border-2 shadow-sm relative"
                  style={{ borderColor: theme.colors.primary }}
                >
                  <img
                    src={profile.avatarUrl}
                    alt={profile.displayName}
                    className="w-full h-full object-cover"
                  />
                  {uploadingPhoto && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[10px] text-white font-bold">
                      ...
                    </div>
                  )}
                </div>
                <div
                  className="absolute bottom-0 right-0 p-1.5 rounded-full text-white shadow hover:scale-110 transition"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="Upload from Phone"
                >
                  <Camera className="w-3.5 h-3.5" />
                </div>
              </div>

              {/* Identity & Duora ID info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-sm truncate">{profile.displayName}</h2>
                  <Shield className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <span className="text-xs text-stone-400 block truncate">@{profile.username}</span>

                <button
                  type="button"
                  onClick={handleCopyId}
                  className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[11px] font-mono font-bold transition hover:opacity-80"
                  style={{
                    backgroundColor: theme.colors.lilac,
                    borderColor: theme.colors.border,
                    color: theme.colors.primary
                  }}
                  title="Click to copy permanent Duora ID"
                >
                  <Lock className="w-3 h-3" />
                  <span>{profile.duoraId}</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-60" />}
                </button>
              </div>
            </div>

            {/* Quick Action Button */}
            <div className="pt-2 border-t flex items-center gap-2" style={{ borderColor: theme.colors.border }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-80 transition"
                style={{ borderColor: theme.colors.border }}
              >
                <Smartphone className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                <span>Change Photo</span>
              </button>

              <button
                type="button"
                onClick={onOpenProfile}
                className="flex-1 py-1.5 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-80 transition"
                style={{ borderColor: theme.colors.border }}
              >
                <User className="w-3.5 h-3.5" style={{ color: theme.colors.primary }} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 1: Your Account */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-3 block">
            Your Account
          </span>
          <div
            className="rounded-3xl border divide-y overflow-hidden shadow-xs"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            <div
              onClick={onOpenProfile}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:opacity-80 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                >
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Account Information</span>
                  <span className="text-[11px] text-stone-400">Name, username, bio, and privacy</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>

            <div
              onClick={handleCopyId}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:opacity-80 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                >
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Permanent Duora ID</span>
                  <span className="text-[11px] text-stone-400 font-mono">{profile?.duoraId}</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
          </div>
        </div>

        {/* SECTION 2: How others can interact with you */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-3 block">
            How others can interact with you
          </span>
          <div
            className="rounded-3xl border divide-y overflow-hidden shadow-xs"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            {/* Message Requests with live badge */}
            {onOpenRequests && (
              <div
                onClick={onOpenRequests}
                className="p-3.5 flex items-center justify-between cursor-pointer hover:opacity-80 transition"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-2 rounded-xl flex items-center justify-center relative"
                    style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                  >
                    <MessageSquare className="w-4 h-4" />
                    {pendingRequestsCount > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
                        {pendingRequestsCount}
                      </span>
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold block">Message Requests</span>
                    <span className="text-[11px] text-stone-400">
                      {pendingRequestsCount > 0 ? `${pendingRequestsCount} pending requests` : 'No new requests'}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            )}

            {/* Blocked Accounts */}
            <div
              onClick={() => setActiveSubView('blocked')}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:opacity-80 transition"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-500 flex items-center justify-center">
                  <Ban className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Blocked Accounts</span>
                  <span className="text-[11px] text-stone-400">
                    {privateInfo?.blockedUserIds?.length || 0} accounts
                  </span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
          </div>
        </div>

        {/* SECTION 3: Privacy & Security */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-3 block">
            What you see & privacy
          </span>
          <div
            className="rounded-3xl border divide-y overflow-hidden shadow-xs"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            {/* Public Discoverability */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                >
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Public Discoverability</span>
                  <span className="text-[11px] text-stone-400">Appear in Duora user searches</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={isDiscoverable}
                onChange={(e) => handleToggle('isDiscoverable', e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: theme.colors.primary }}
              />
            </div>

            {/* Activity Status */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-500 flex items-center justify-center">
                  <Eye className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Activity Status</span>
                  <span className="text-[11px] text-stone-400">Show when you are active</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={showOnlineStatus}
                onChange={(e) => handleToggle('showOnlineStatus', e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: theme.colors.primary }}
              />
            </div>

            {/* Read Receipts */}
            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                >
                  <CheckCheck className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Read Receipts</span>
                  <span className="text-[11px] text-stone-400">Double ticks when messages are read</span>
                </div>
              </div>
              <input
                type="checkbox"
                checked={readReceipts}
                onChange={(e) => handleToggle('readReceipts', e.target.checked)}
                className="w-4 h-4 rounded cursor-pointer"
                style={{ accentColor: theme.colors.primary }}
              />
            </div>
          </div>
        </div>

        {/* SECTION 4: App Appearance & Themes (12 Built-in Themes) */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-3 block">
            App Appearance & Theme
          </span>
          <div
            className="rounded-3xl border divide-y overflow-hidden shadow-xs"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            {/* 12 Built-in Themes Item */}
            <div
              onClick={() => setActiveSubView('themes')}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:opacity-80 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                >
                  <Palette className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Themes (12 Available)</span>
                  <span className="text-[11px] text-stone-400">Current: {theme.name}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full border shadow-2xs"
                  style={{ backgroundColor: theme.colors.primary, borderColor: theme.colors.border }}
                />
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </div>

            {/* Custom Accent Palette Swatches */}
            <div className="p-3.5 space-y-2">
              <span className="text-xs font-bold block">Custom Accent Color</span>
              <div className="flex items-center gap-2 pt-0.5">
                {ACCENT_COLORS.map(c => {
                  const isActive = (accentColor || theme.colors.primary) === c.hex;
                  return (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setAccentColor(c.hex)}
                      className={`w-7 h-7 rounded-full shadow-sm flex items-center justify-center transition hover:scale-110 cursor-pointer ${
                        isActive ? 'ring-2 ring-offset-2' : ''
                      }`}
                      style={{
                        backgroundColor: c.hex,
                        // @ts-ignore
                        '--tw-ring-color': c.hex
                      }}
                      title={c.name}
                    >
                      {isActive && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Wallpapers */}
            <div
              onClick={() => setActiveSubView('wallpapers')}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:opacity-80 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Chat Wallpaper</span>
                  <span className="text-[11px] text-stone-400 capitalize">{wallpaper} pattern</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>
          </div>
        </div>

        {/* SECTION 5: Help & About */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-3 block">
            Help & About
          </span>
          <div
            className="rounded-3xl border divide-y overflow-hidden shadow-xs"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            <div
              onClick={() => setActiveSubView('faq')}
              className="p-3.5 flex items-center justify-between cursor-pointer hover:opacity-80 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                >
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Help & Security FAQs</span>
                  <span className="text-[11px] text-stone-400">Architecture and privacy details</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400" />
            </div>

            <div className="p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                >
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold block">Duora Architecture</span>
                  <span className="text-[11px] text-stone-400">Developed by Shubham Mishra</span>
                </div>
              </div>
              <span className="text-[11px] font-mono text-stone-400">v1.2.0</span>
            </div>
          </div>
        </div>

        {/* SECTION 6: Logout */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full p-3.5 rounded-3xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 text-red-500 hover:bg-red-100/50 dark:hover:bg-red-950/40 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer shadow-2xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Log Out of Duora</span>
          </button>
        </div>

        <div className="py-4 text-center text-[11px] text-stone-400">
          Duora — Connect Privately. All rights reserved.
        </div>
      </div>
    </div>
  );
};
