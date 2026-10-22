import React, { useState } from 'react';
import { Conversation, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { removeGroupMember, addGroupMember } from '../../services/chatService';
import { getUserProfile } from '../../services/userService';
import {
  X,
  Users,
  Shield,
  UserMinus,
  UserPlus,
  LogOut,
  Loader2,
  ChevronRight
} from 'lucide-react';

interface GroupSettingsModalProps {
  conversation: Conversation;
  isOpen: boolean;
  onClose: () => void;
  onOpenProfile: (u: UserProfile) => void;
  onLeaveGroup: () => void;
}

export const GroupSettingsModal: React.FC<GroupSettingsModalProps> = ({
  conversation,
  isOpen,
  onClose,
  onOpenProfile,
  onLeaveGroup
}) => {
  const { profile } = useAuth();
  const { theme } = useTheme();

  const [isRemovingId, setIsRemovingId] = useState<string | null>(null);
  const [showAddMemberInput, setShowAddMemberInput] = useState(false);
  const [addUsernameInput, setAddUsernameInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isAdmin = conversation.groupAdminIds?.includes(profile?.uid || '');
  const members = Object.values(conversation.participants || {});

  const handleMemberClick = async (memberUid: string) => {
    try {
      const u = await getUserProfile(memberUid);
      if (u) {
        onClose();
        onOpenProfile(u);
      }
    } catch {}
  };

  const handleRemoveMember = async (memberUid: string) => {
    if (!profile || !isAdmin || isRemovingId) return;
    setIsRemovingId(memberUid);
    try {
      await removeGroupMember(conversation.id, memberUid, profile);
    } catch (err: any) {
      console.error('Failed to remove member:', err);
    } finally {
      setIsRemovingId(null);
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !isAdmin || !addUsernameInput.trim() || isAdding) return;
    setIsAdding(true);
    setAddError(null);

    try {
      // Find user profile by username
      const cleanUsername = addUsernameInput.trim().replace(/^@/, '');
      const userDoc = await import('firebase/firestore').then(async ({ getDoc, doc }) => {
        const db = (await import('../../firebase/config')).db;
        return getDoc(doc(db, 'usernames', cleanUsername.toLowerCase()));
      });

      if (!userDoc.exists()) {
        throw new Error('User not found with this username.');
      }

      const foundUid = userDoc.data().uid;
      const targetUser = await getUserProfile(foundUid);
      if (!targetUser) throw new Error('User not found.');

      await addGroupMember(conversation.id, targetUser, profile);
      setAddUsernameInput('');
      setShowAddMemberInput(false);
    } catch (err: any) {
      setAddError(err?.message || 'Could not add member.');
    } finally {
      setIsAdding(false);
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
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.colors.border }}>
          <span className="font-bold text-sm">Group Info</span>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:opacity-75 transition cursor-pointer"
          >
            <X className="w-4 h-4 text-stone-400" />
          </button>
        </div>

        {/* Group Header */}
        <div className="flex flex-col items-center text-center py-2">
          <img
            src={conversation.groupAvatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=group'}
            alt="Group"
            className="w-20 h-20 rounded-full object-cover border-2 shadow-md mb-2"
            style={{ borderColor: theme.colors.primary }}
          />
          <h3 className="font-bold text-base leading-tight">
            {conversation.groupName}
          </h3>
          <span className="text-xs text-stone-400 mt-0.5">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
          {conversation.groupDescription && (
            <p className="text-xs text-stone-400 mt-1 italic max-w-xs">
              "{conversation.groupDescription}"
            </p>
          )}
        </div>

        {/* Admin actions: Add member */}
        {isAdmin && (
          <div className="pt-1">
            {!showAddMemberInput ? (
              <button
                type="button"
                onClick={() => setShowAddMemberInput(true)}
                className="w-full py-2.5 px-3 rounded-2xl border text-xs font-semibold flex items-center justify-center gap-2 hover:opacity-85 transition cursor-pointer"
                style={{
                  borderColor: theme.colors.primary,
                  color: theme.colors.primary,
                  backgroundColor: theme.colors.lilac
                }}
              >
                <UserPlus className="w-4 h-4" />
                <span>Add Member to Group</span>
              </button>
            ) : (
              <form onSubmit={handleAddMemberSubmit} className="space-y-2 p-3 rounded-2xl border" style={{ borderColor: theme.colors.border }}>
                <span className="text-xs font-bold block">Add Member by Username</span>
                <input
                  type="text"
                  placeholder="Username (e.g. alex_rivers)"
                  value={addUsernameInput}
                  onChange={(e) => setAddUsernameInput(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border bg-transparent focus:outline-none"
                  style={{ borderColor: theme.colors.border }}
                  autoFocus
                />
                {addError && <p className="text-[11px] text-red-500">{addError}</p>}
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => { setShowAddMemberInput(false); setAddError(null); }}
                    className="px-3 py-1.5 rounded-xl text-xs hover:opacity-80"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAdding || !addUsernameInput.trim()}
                    className="px-4 py-1.5 rounded-xl text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    {isAdding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Add</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Members List */}
        <div className="space-y-1.5">
          <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block px-1">
            Members ({members.length})
          </span>
          <div
            className="rounded-2xl border divide-y overflow-hidden shadow-2xs max-h-56 overflow-y-auto"
            style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}
          >
            {members.map((m) => {
              const isMemberAdmin = conversation.groupAdminIds?.includes(m.uid);
              const isSelf = m.uid === profile?.uid;

              return (
                <div
                  key={m.uid}
                  className="p-3 flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/5 transition"
                >
                  <div
                    onClick={() => handleMemberClick(m.uid)}
                    className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                  >
                    <img
                      src={m.avatarUrl}
                      alt={m.displayName}
                      className="w-9 h-9 rounded-full object-cover border"
                      style={{ borderColor: theme.colors.border }}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate">
                          {m.displayName}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] text-stone-400 font-medium">(You)</span>
                        )}
                        {isMemberAdmin && (
                          <span
                            className="px-1.5 py-0.2 rounded-full text-[9px] font-bold text-white flex items-center gap-0.5"
                            style={{ backgroundColor: theme.colors.primary }}
                          >
                            <Shield className="w-2.5 h-2.5" />
                            Admin
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-stone-400 block truncate">
                        @{m.username}
                      </span>
                    </div>
                  </div>

                  {isAdmin && !isSelf && (
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(m.uid)}
                      disabled={isRemovingId === m.uid}
                      className="p-2 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition cursor-pointer shrink-0"
                      title="Remove Member"
                    >
                      {isRemovingId === m.uid ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <UserMinus className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Leave Group Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onLeaveGroup();
            }}
            className="w-full p-3 rounded-2xl border border-amber-300 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-100 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Group</span>
          </button>
        </div>
      </div>
    </div>
  );
};
