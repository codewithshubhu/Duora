import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { UserProfile, Conversation } from '../../types';
import { createGroupConversation } from '../../services/chatService';
import { searchUsers } from '../../services/userService';
import { Users, X, Check, Search, Plus } from 'lucide-react';

interface GroupCreateModalProps {
  onClose: () => void;
  onGroupCreated: (conv: Conversation) => void;
}

export const GroupCreateModal: React.FC<GroupCreateModalProps> = ({ onClose, onGroupCreated }) => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [groupName, setGroupName] = useState('');
  const [searchMember, setSearchMember] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const handleMemberSearch = async (val: string) => {
    setSearchMember(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      if (profile) {
        const found = await searchUsers(val, profile.uid);
        setSearchResults(found);
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectMember = (user: UserProfile) => {
    if (selectedMembers.some(m => m.uid === user.uid)) {
      setSelectedMembers(prev => prev.filter(m => m.uid !== user.uid));
    } else {
      setSelectedMembers(prev => [...prev, user]);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !groupName.trim() || selectedMembers.length === 0) return;

    setCreating(true);
    try {
      const conv = await createGroupConversation(profile, groupName.trim(), selectedMembers);
      onGroupCreated(conv);
      onClose();
    } catch (err) {
      console.error('Failed to create group:', err);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none">
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[85vh]"
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
            <h2 className="font-bold text-base">New Group Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:opacity-75 cursor-pointer"
          >
            <X className="w-5 h-5 text-stone-400" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="p-4 flex flex-col flex-1 overflow-hidden space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-400 mb-1">
              Group Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Design Sync, Family, Private Team..."
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border focus:outline-none focus:ring-2 shadow-2xs"
              style={{
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
            />
          </div>

          {/* Selected Member Chips */}
          {selectedMembers.length > 0 && (
            <div>
              <span className="text-[11px] font-semibold text-stone-400 block mb-1.5">
                Selected Participants ({selectedMembers.length})
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {selectedMembers.map(m => (
                  <span
                    key={m.uid}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium"
                    style={{
                      backgroundColor: theme.colors.lilac,
                      borderColor: theme.colors.border,
                      color: theme.colors.primary
                    }}
                  >
                    <span>{m.displayName}</span>
                    <button
                      type="button"
                      onClick={() => toggleSelectMember(m)}
                      className="hover:opacity-75"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Search for participants */}
          <div className="flex-1 flex flex-col min-h-[160px] overflow-hidden">
            <span className="text-[11px] font-semibold text-stone-400 block mb-1">
              Add Members (Search by Duora ID or username)
            </span>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search by Duora ID or @username..."
                value={searchMember}
                onChange={(e) => handleMemberSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 shadow-2xs"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
              />
            </div>

            <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: theme.colors.border }}>
              {loading ? (
                <div className="py-6 text-center text-xs text-stone-400">
                  Searching contacts...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="py-6 text-center text-xs text-stone-400">
                  {searchMember.length >= 2 ? 'No users found' : 'Type to search users to add'}
                </div>
              ) : (
                searchResults.map(user => {
                  const isChecked = selectedMembers.some(m => m.uid === user.uid);
                  return (
                    <div
                      key={user.uid}
                      onClick={() => toggleSelectMember(user)}
                      className="py-2 px-1 flex items-center justify-between cursor-pointer hover:opacity-85 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div>
                          <span className="text-xs font-bold block">{user.displayName}</span>
                          <span className="text-[10px] text-stone-400">@{user.username} ({user.duoraId})</span>
                        </div>
                      </div>
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center transition ${
                          isChecked ? 'text-white' : ''
                        }`}
                        style={{
                          backgroundColor: isChecked ? theme.colors.primary : 'transparent',
                          borderColor: isChecked ? theme.colors.primary : theme.colors.border
                        }}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={creating || !groupName.trim() || selectedMembers.length === 0}
            className="w-full py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: theme.colors.primary }}
          >
            {creating ? 'Creating Group...' : `Create Group (${selectedMembers.length} members)`}
          </button>
        </form>
      </div>
    </div>
  );
};
