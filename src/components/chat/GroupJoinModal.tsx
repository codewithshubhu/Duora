import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Conversation } from '../../types';
import { getDiscoverableGroups, joinGroupConversation } from '../../services/chatService';
import { Users, X, Search, Check, Plus, Loader2, Sparkles, ArrowRight } from 'lucide-react';

interface GroupJoinModalProps {
  onClose: () => void;
  onGroupJoined: (conv: Conversation) => void;
  onOpenCreateGroup: () => void;
}

export const GroupJoinModal: React.FC<GroupJoinModalProps> = ({
  onClose,
  onGroupJoined,
  onOpenCreateGroup
}) => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [groups, setGroups] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    try {
      const list = await getDiscoverableGroups();
      setGroups(list);
    } catch (err) {
      console.error('Failed to load groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (group: Conversation) => {
    if (!profile) return;
    setJoiningId(group.id);
    setError(null);
    try {
      const updated = await joinGroupConversation(group.id, profile);
      onGroupJoined(updated);
      onClose();
    } catch (err: any) {
      console.error('Failed to join group:', err);
      setError(err?.message || 'Could not join group.');
    } finally {
      setJoiningId(null);
    }
  };

  const filteredGroups = groups.filter(g => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.groupName?.toLowerCase().includes(q) ||
      g.id.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none">
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          color: theme.colors.text
        }}
      >
        {/* Header */}
        <div
          className="p-4 border-b flex items-center justify-between"
          style={{ borderColor: theme.colors.border }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5" style={{ color: theme.colors.primary }} />
            <div>
              <h2 className="font-bold text-base leading-tight">Join a Group</h2>
              <span className="text-[11px] text-stone-400">Discover public groups or enter an invite ID</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:opacity-75 cursor-pointer"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        {/* Search & Actions */}
        <div className="p-4 border-b space-y-3" style={{ borderColor: theme.colors.border }}>
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search groups by name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 shadow-2xs"
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-stone-400">
              Want to create your own?
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenCreateGroup();
              }}
              className="text-xs font-bold flex items-center gap-1 hover:underline cursor-pointer"
              style={{ color: theme.colors.primary }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create New Group</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-500 text-xs">
            {error}
          </div>
        )}

        {/* Group List */}
        <div className="p-4 overflow-y-auto space-y-2.5 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-stone-400">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: theme.colors.primary }} />
              <span className="text-xs">Finding available groups...</span>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-12 text-center text-stone-400 flex flex-col items-center">
              <Users className="w-10 h-10 mb-2 stroke-1 opacity-50" />
              <span className="text-xs font-semibold">No groups found</span>
              <p className="text-[11px] text-stone-400 mt-1 max-w-xs">
                {searchQuery ? `No groups match "${searchQuery}"` : 'Be the first to create a public group!'}
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateGroup();
                }}
                className="mt-3 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer"
                style={{ backgroundColor: theme.colors.primary }}
              >
                Create First Group
              </button>
            </div>
          ) : (
            filteredGroups.map(group => {
              const isMember = profile && group.participantIds?.includes(profile.uid);
              const memberCount = group.participantIds?.length || 0;
              const isJoining = joiningId === group.id;

              return (
                <div
                  key={group.id}
                  className="p-3 rounded-2xl border flex items-center justify-between gap-3 transition hover:shadow-xs"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={group.groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(group.groupName || 'group')}`}
                      alt={group.groupName}
                      className="w-10 h-10 rounded-full object-cover border"
                      style={{ borderColor: theme.colors.border }}
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-xs block truncate">{group.groupName}</span>
                      <span className="text-[11px] text-stone-400 block">
                        {memberCount} {memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                  </div>

                  {isMember ? (
                    <button
                      type="button"
                      onClick={() => {
                        onGroupJoined(group);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 hover:opacity-85 transition cursor-pointer shrink-0"
                      style={{
                        borderColor: theme.colors.border,
                        color: theme.colors.text
                      }}
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Open</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleJoin(group)}
                      disabled={isJoining}
                      className="px-3.5 py-1.5 rounded-xl text-white text-[11px] font-bold shadow-xs hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      {isJoining ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Join</span>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
