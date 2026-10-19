import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserProfile } from '../../types';
import { updateUserProfile, toggleBlockUser } from '../../services/userService';
import { uploadProfilePhoto } from '../../services/storageService';
import {
  X,
  Shield,
  Copy,
  Check,
  Camera,
  Edit3,
  Lock,
  Upload,
  Trash2,
  Ban,
  Flag,
  Sparkles,
  AlertCircle,
  Smartphone,
  MessageSquare
} from 'lucide-react';

interface ProfileModalProps {
  user: UserProfile;
  isSelf: boolean;
  onClose: () => void;
  onStartChat?: (user: UserProfile) => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  user,
  isSelf,
  onClose,
  onStartChat
}) => {
  const { profile, refreshProfile } = useAuth();
  const { theme } = useTheme();

  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName);
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [isDiscoverable, setIsDiscoverable] = useState(user.isDiscoverable !== false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(user.showOnlineStatus !== false);
  const [showLastSeen, setShowLastSeen] = useState(user.showLastSeen !== false);
  const [readReceipts, setReadReceipts] = useState(user.readReceipts !== false);

  const [copiedId, setCopiedId] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.duoraId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // Upload Profile Picture directly from phone / gallery
  const handlePhotoUploadFromPhone = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    if (file.size > 15 * 1024 * 1024) {
      setError('Please choose a photo under 15MB.');
      return;
    }

    setUploadingPhoto(true);
    setError(null);

    try {
      const newAvatarUrl = await uploadProfilePhoto(profile.uid, file);
      setAvatarUrl(newAvatarUrl);
      
      // If not currently in explicit edit mode, save directly to profile immediately
      if (!isEditing) {
        await updateUserProfile(profile.uid, { avatarUrl: newAvatarUrl });
        await refreshProfile();
        setSuccess('Profile picture updated and synchronized across all chats!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      setError(err?.message || 'Could not upload photo.');
    } finally {
      setUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = async () => {
    const fallback = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || user.username)}&backgroundColor=7057e8`;
    setAvatarUrl(fallback);
    if (!isEditing && profile) {
      await updateUserProfile(profile.uid, { avatarUrl: fallback });
      await refreshProfile();
      setSuccess('Profile photo reset.');
      setTimeout(() => setSuccess(null), 2500);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      await updateUserProfile(
        profile.uid,
        {
          displayName: displayName.trim(),
          avatarUrl,
          bio: bio.trim(),
          isDiscoverable,
          showOnlineStatus,
          showLastSeen,
          readReceipts,
        },
        username.trim()
      );
      await refreshProfile();
      setSuccess('Profile updated successfully and synced across Duora!');
      setIsEditing(false);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleBlockOther = async () => {
    if (!profile) return;
    try {
      await toggleBlockUser(profile.uid, user.uid);
      await refreshProfile();
      onClose();
    } catch (err) {
      console.error('Block error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none">
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[90vh]"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          color: theme.colors.text
        }}
      >
        {/* Hidden Phone File Input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handlePhotoUploadFromPhone}
          accept="image/*"
          className="hidden"
        />

        {/* Top Header */}
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" style={{ color: theme.colors.primary }} />
            <h2 className="font-bold text-sm tracking-wide">
              {isSelf ? 'My Duora Profile' : 'Contact Profile'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:opacity-75 cursor-pointer"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="p-3 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {/* Profile Header Card */}
          <div className="flex flex-col items-center text-center">
            <div className="relative mb-3 group">
              <div
                className="w-24 h-24 rounded-full overflow-hidden border-4 shadow-md relative"
                style={{ borderColor: theme.colors.primary }}
              >
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-semibold">
                    Uploading...
                  </div>
                )}
              </div>

              {/* Upload photo button badge for self */}
              {isSelf && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 rounded-full text-white shadow-lg hover:scale-105 active:scale-95 transition cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                  title="Upload Photo from Phone"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>

            <h3 className="text-lg font-bold">
              {displayName}
            </h3>
            <span className="text-xs text-stone-400 mt-0.5">
              @{username}
            </span>

            {/* Permanent Duora ID pill */}
            <div
              onClick={handleCopyId}
              className="mt-3 flex items-center gap-2 px-3.5 py-1.5 rounded-full border cursor-pointer hover:opacity-80 transition shadow-2xs"
              style={{
                backgroundColor: theme.colors.lilac,
                borderColor: theme.colors.border,
                color: theme.colors.primary
              }}
              title="Click to copy permanent Duora ID"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="font-mono text-xs font-bold tracking-wider">{user.duoraId}</span>
              {copiedId ? (
                <Check className="w-3.5 h-3.5 text-emerald-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 opacity-60" />
              )}
            </div>

            {/* Upload from phone button for self */}
            {isSelf && (
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 hover:opacity-85 transition cursor-pointer shadow-2xs"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.primary
                  }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload from Phone</span>
                </button>

                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="px-3 py-1.5 rounded-xl border text-xs font-medium text-stone-400 hover:text-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                  style={{ borderColor: theme.colors.border }}
                >
                  Reset Photo
                </button>
              </div>
            )}
          </div>

          {/* View or Edit mode */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Username (@unique)
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-400 mb-1">
                  Bio
                </label>
                <textarea
                  rows={2}
                  maxLength={160}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border focus:outline-none"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                />
              </div>

              {/* Privacy Toggles */}
              <div className="pt-2 border-t space-y-2" style={{ borderColor: theme.colors.border }}>
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">
                  Privacy Preferences
                </span>

                <label className="flex items-center justify-between text-xs">
                  <span>Discoverable in user search</span>
                  <input
                    type="checkbox"
                    checked={isDiscoverable}
                    onChange={(e) => setIsDiscoverable(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: theme.colors.primary }}
                  />
                </label>

                <label className="flex items-center justify-between text-xs">
                  <span>Show activity / online status</span>
                  <input
                    type="checkbox"
                    checked={showOnlineStatus}
                    onChange={(e) => setShowOnlineStatus(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: theme.colors.primary }}
                  />
                </label>

                <label className="flex items-center justify-between text-xs">
                  <span>Show last seen timestamp</span>
                  <input
                    type="checkbox"
                    checked={showLastSeen}
                    onChange={(e) => setShowLastSeen(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: theme.colors.primary }}
                  />
                </label>

                <label className="flex items-center justify-between text-xs">
                  <span>Read receipts (double violet ticks)</span>
                  <input
                    type="checkbox"
                    checked={readReceipts}
                    onChange={(e) => setReadReceipts(e.target.checked)}
                    className="w-4 h-4 rounded cursor-pointer"
                    style={{ accentColor: theme.colors.primary }}
                  />
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-2.5 rounded-xl border text-xs font-semibold"
                  style={{ borderColor: theme.colors.border }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Bio card */}
              <div
                className="p-3.5 rounded-2xl border text-xs leading-relaxed"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border
                }}
              >
                <span className="text-[10px] font-bold uppercase tracking-wider block text-stone-400 mb-1">
                  About
                </span>
                <p>{user.bio || 'Connecting privately on Duora.'}</p>
              </div>

              {/* Action buttons */}
              {isSelf ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              ) : (
                <div className="space-y-2">
                  {onStartChat && (
                    <button
                      onClick={() => onStartChat(user)}
                      className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 hover:opacity-90 transition cursor-pointer"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Direct Message</span>
                    </button>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleBlockOther}
                      className="flex-1 py-2 rounded-xl border border-red-200 dark:border-red-900/60 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      <span>Block Contact</span>
                    </button>

                    <button
                      onClick={() => setReported(true)}
                      className="flex-1 py-2 rounded-xl border border-stone-200 dark:border-stone-800 text-stone-400 hover:text-stone-600 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span>{reported ? 'Reported' : 'Report'}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
