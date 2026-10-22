import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserProfile, Conversation } from '../../types';
import { searchUsers } from '../../services/userService';
import { getOrCreateDirectConversation } from '../../services/chatService';
import { Search, X, MessageSquare, Shield, AlertCircle } from 'lucide-react';
import { isValidDuoraId } from '../../utils/duoraId';

interface NewChatModalProps {
  onClose: () => void;
  onOpenConversation: (conv: Conversation) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({ onClose, onOpenConversation }) => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
    setActionError(null);
    if (val.trim().length < 2) {
      setResults([]);
      return;
    }

    setLoading(true);
    try {
      if (profile) {
        const found = await searchUsers(val, profile.uid);
        setResults(found);
      }
    } catch (err: any) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChat = async (targetUser: UserProfile) => {
    if (!profile) return;
    try {
      const conv = await getOrCreateDirectConversation(profile, targetUser, true);
      onOpenConversation(conv);
      onClose();
    } catch (err: any) {
      setActionError(err?.message || 'Could not initiate direct conversation.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none">
      <div
        className="w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh]"
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
          <div>
            <h2 className="text-base font-bold">
              New Chat
            </h2>
            <p className="text-xs text-stone-400">
              Search for users by their name or username to start chatting.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:opacity-75 cursor-pointer"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        {/* Search input */}
        <div
          className="p-4 border-b"
          style={{ backgroundColor: theme.colors.background, borderColor: theme.colors.border }}
        >
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by name or username (e.g. Alex or @alex)..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 shadow-2xs"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
              autoFocus
            />
          </div>
        </div>

        {actionError && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 divide-y divide-stone-100 dark:divide-stone-800">
          {loading ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              <div
                className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
                style={{ borderColor: theme.colors.primary, borderTopColor: 'transparent' }}
              />
              Searching users...
            </div>
          ) : results.length === 0 ? (
            <div className="py-8 text-center text-stone-400 text-xs">
              {searchTerm.length >= 2 ? (
                <>
                  <p className="font-semibold text-sm">No users found</p>
                  <p className="mt-1">Try searching by their name or username.</p>
                </>
              ) : (
                'Type a name or username to search.'
              )}
            </div>
          ) : (
            results.map((user) => (
              <div key={user.uid} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={user.avatarUrl}
                    alt={user.displayName}
                    className="w-11 h-11 rounded-full object-cover border shadow-2xs"
                    style={{ borderColor: theme.colors.border }}
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-sm block truncate">
                      {user.displayName}
                    </span>
                    <div className="flex items-center gap-2 text-xs text-stone-400">
                      <span className="font-mono font-medium" style={{ color: theme.colors.primary }}>
                        {user.duoraId}
                      </span>
                      <span>•</span>
                      <span className="truncate">@{user.username}</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleStartChat(user)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 transition active:scale-95 flex items-center gap-1.5 cursor-pointer shrink-0"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
