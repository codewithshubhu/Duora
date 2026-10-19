import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCall } from '../../context/CallContext';
import { UserProfile, Conversation } from '../../types';
import { searchUsers } from '../../services/userService';
import { getOrCreateDirectConversation } from '../../services/chatService';
import { isValidDuoraId } from '../../utils/duoraId';
import { Search, Shield, MessageSquare, Phone, Video, ArrowLeft } from 'lucide-react';

interface SearchScreenProps {
  onBack: () => void;
  onOpenConversation: (conv: Conversation) => void;
  onOpenProfile: (user: UserProfile) => void;
}

export const SearchScreen: React.FC<SearchScreenProps> = ({
  onBack,
  onOpenConversation,
  onOpenProfile
}) => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const { initiateCall } = useCall();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (val: string) => {
    setSearchTerm(val);
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
    } catch (err) {
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
    } catch (err) {
      console.error('Failed to open chat:', err);
    }
  };

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{
        backgroundColor: theme.colors.background,
        color: theme.colors.text
      }}
    >
      {/* Top Header */}
      <div
        className="p-4 border-b"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:opacity-80 md:hidden cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Discover Users
            </h1>
            <p className="text-xs text-stone-400">
              Search by unique Permanent Duora ID (DUR-XXXX-XXXX) or username.
            </p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Type Duora ID or username..."
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

        {isValidDuoraId(searchTerm) && (
          <div className="mt-2 flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
            <Shield className="w-4 h-4" />
            <span>Exact Duora ID query active</span>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 divide-y" style={{ borderColor: theme.colors.border }}>
        {loading ? (
          <div className="py-16 text-center text-stone-400 text-xs">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-2"
              style={{ borderColor: theme.colors.primary, borderTopColor: 'transparent' }}
            />
            Querying discoverable profiles...
          </div>
        ) : results.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <Search className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-1" />
            <p className="font-semibold text-sm">
              {searchTerm.length >= 2 ? 'No discoverable users found' : 'Search for friends'}
            </p>
            <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
              Ask your contact for their Permanent Duora ID (e.g. DUR-9F4K-3L7P) for guaranteed exact lookup.
            </p>
          </div>
        ) : (
          results.map((u) => (
            <div key={u.uid} className="py-3.5 flex items-center justify-between gap-3">
              <div
                onClick={() => onOpenProfile(u)}
                className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 hover:opacity-85"
              >
                <img
                  src={u.avatarUrl}
                  alt={u.displayName}
                  className="w-12 h-12 rounded-full object-cover border shadow-2xs"
                  style={{ borderColor: theme.colors.border }}
                />
                <div className="min-w-0">
                  <span className="font-bold text-sm block truncate">
                    {u.displayName}
                  </span>
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <span className="font-mono font-medium" style={{ color: theme.colors.primary }}>{u.duoraId}</span>
                    <span>•</span>
                    <span className="truncate">@{u.username}</span>
                  </div>
                  {u.bio && (
                    <p className="text-[11px] text-stone-400 truncate mt-0.5">{u.bio}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => initiateCall(u, 'audio')}
                  className="p-2 rounded-xl hover:opacity-80 transition cursor-pointer"
                  style={{ color: theme.colors.primary }}
                  title="Voice Call"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => initiateCall(u, 'video')}
                  className="p-2 rounded-xl hover:opacity-80 transition cursor-pointer"
                  style={{ color: theme.colors.primary }}
                  title="Video Call"
                >
                  <Video className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStartChat(u)}
                  className="px-3.5 py-1.5 rounded-xl text-white text-xs font-bold hover:opacity-90 shadow-sm transition flex items-center gap-1 cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
