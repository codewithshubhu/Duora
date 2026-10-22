import React, { useState } from 'react';
import { UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme, THEMES, WallpaperStyle } from '../../context/ThemeContext';
import { toggleBlockUser } from '../../services/userService';
import {
  X,
  Search,
  Image,
  Ban,
  UserCheck,
  User,
  Trash2,
  ChevronRight,
  Shield,
  Loader2
} from 'lucide-react';

interface ChatSettingsModalProps {
  user: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (u: UserProfile) => void;
  onSearchInChat: () => void;
  onDeleteChat: () => void;
}

const WALLPAPERS: { id: WallpaperStyle; name: string }[] = [
  { id: 'clean', name: 'Clean Minimal' },
  { id: 'constellation', name: 'Constellation' },
  { id: 'geometric', name: 'Geometric Grid' },
  { id: 'waves', name: 'Ambient Glow' },
  { id: 'dots', name: 'Dot Matrix' }
];

export const ChatSettingsModal: React.FC<ChatSettingsModalProps> = ({
  user,
  isOpen,
  onClose,
  onOpenProfile,
  onSearchInChat,
  onDeleteChat
}) => {
  const { profile, refreshProfile } = useAuth();
  const { theme, wallpaper, setWallpaper } = useTheme();

  const [isBlocking, setIsBlocking] = useState(false);
  const [showWallpaperList, setShowWallpaperList] = useState(false);

  if (!isOpen) return null;

  const isBlockedByMe = profile?.blockedUserIds?.includes(user.uid) || false;

  const handleToggleBlock = async () => {
    if (!profile || isBlocking) return;
    setIsBlocking(true);
    try {
      await toggleBlockUser(profile.uid, user.uid, !isBlockedByMe);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to update block state:', err);
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl p-5 shadow-2xl border flex flex-col gap-4 animate-in slide-in-from-bottom-4 max-h-[85vh] overflow-y-auto"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          color: theme.colors.text
        }}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.colors.border }}>
          <span className="font-bold text-sm">Chat Settings</span>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:opacity-75 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Contact Info Header */}
        <div className="flex flex-col items-center text-center py-2">
          <div className="relative mb-3">
            <img
              src={user.avatarUrl}
              alt={user.displayName}
              className="w-20 h-20 rounded-full object-cover border-2 shadow-md"
              style={{ borderColor: theme.colors.primary }}
            />
            {isBlockedByMe && (
              <span className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold">
                Blocked
              </span>
            )}
          </div>
          <h3 className="font-bold text-base leading-tight">
            {user.displayName}
          </h3>
          <span className="text-xs text-stone-400 mt-0.5 font-medium">
            @{user.username}
          </span>
        </div>

        {/* Options List */}
        <div
          className="rounded-2xl border divide-y overflow-hidden shadow-2xs"
          style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}
        >
          {/* Search in Chat */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onSearchInChat();
            }}
            className="w-full p-3.5 flex items-center justify-between hover:opacity-80 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <Search className="w-4 h-4" style={{ color: theme.colors.primary }} />
              <span className="text-xs font-semibold">Search in Chat</span>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>

          {/* Wallpaper */}
          <div>
            <button
              type="button"
              onClick={() => setShowWallpaperList(!showWallpaperList)}
              className="w-full p-3.5 flex items-center justify-between hover:opacity-80 transition cursor-pointer text-left"
            >
              <div className="flex items-center gap-3">
                <Image className="w-4 h-4" style={{ color: theme.colors.primary }} />
                <span className="text-xs font-semibold">Wallpaper</span>
              </div>
              <ChevronRight className={`w-4 h-4 text-stone-400 transition-transform ${showWallpaperList ? 'rotate-90' : ''}`} />
            </button>

            {showWallpaperList && (
              <div className="p-2 border-t flex flex-col gap-1 bg-black/5 dark:bg-white/5" style={{ borderColor: theme.colors.border }}>
                {WALLPAPERS.map((wp) => (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => setWallpaper(wp.id)}
                    className={`px-3 py-2 rounded-xl text-xs flex items-center justify-between cursor-pointer transition ${
                      wallpaper === wp.id ? 'font-bold' : ''
                    }`}
                    style={{
                      backgroundColor: wallpaper === wp.id ? theme.colors.lilac : 'transparent',
                      color: wallpaper === wp.id ? theme.colors.primary : theme.colors.text
                    }}
                  >
                    <span>{wp.name}</span>
                    {wallpaper === wp.id && <span className="text-xs">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* View Profile */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenProfile(user);
            }}
            className="w-full p-3.5 flex items-center justify-between hover:opacity-80 transition cursor-pointer text-left"
          >
            <div className="flex items-center gap-3">
              <User className="w-4 h-4" style={{ color: theme.colors.primary }} />
              <span className="text-xs font-semibold">View Profile</span>
            </div>
            <ChevronRight className="w-4 h-4 text-stone-400" />
          </button>

          {/* Block / Unblock User */}
          <button
            type="button"
            onClick={handleToggleBlock}
            disabled={isBlocking}
            className={`w-full p-3.5 flex items-center justify-between hover:opacity-80 transition cursor-pointer text-left ${
              isBlockedByMe ? 'text-emerald-500' : 'text-red-500'
            }`}
          >
            <div className="flex items-center gap-3">
              {isBlockedByMe ? (
                <UserCheck className="w-4 h-4" />
              ) : (
                <Ban className="w-4 h-4" />
              )}
              <span className="text-xs font-semibold">
                {isBlocking ? 'Updating...' : isBlockedByMe ? 'Unblock User' : 'Block User'}
              </span>
            </div>
            {isBlocking && <Loader2 className="w-4 h-4 animate-spin" />}
          </button>
        </div>

        {/* Separate Danger Zone: Delete Chat */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onDeleteChat();
            }}
            className="w-full p-3.5 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};
