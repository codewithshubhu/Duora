import React, { useState } from 'react';
import { Conversation, MessageRequest, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Search, Plus, Users, UserPlus, MessageSquare, Clock, ArrowRight } from 'lucide-react';

interface ChatListProps {
  conversations: Conversation[];
  incomingRequests: MessageRequest[];
  selectedConversationId?: string;
  onSelectConversation: (conv: Conversation) => void;
  onOpenRequests: () => void;
  onNewChat: () => void;
  onNewGroup: () => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  incomingRequests,
  selectedConversationId,
  onSelectConversation,
  onOpenRequests,
  onNewChat,
  onNewGroup
}) => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [filterQuery, setFilterQuery] = useState('');

  const filtered = conversations.filter(conv => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    if (conv.type === 'group') {
      return conv.groupName?.toLowerCase().includes(q);
    }
    const other = Object.values(conv.participants || {}).find(p => p.uid !== profile?.uid);
    return (
      other?.displayName.toLowerCase().includes(q) ||
      other?.username.toLowerCase().includes(q) ||
      other?.duoraId.toLowerCase().includes(q)
    );
  });

  return (
    <div
      className="flex flex-col h-full border-r select-none"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text
      }}
    >
      {/* Search Header */}
      <div
        className="p-4 border-b"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-bold tracking-tight">
            Messages
          </h1>
          <div className="flex items-center gap-1.5">
            <button
              onClick={onNewGroup}
              className="p-2 rounded-xl hover:opacity-80 transition cursor-pointer"
              style={{ color: theme.colors.textMuted }}
              title="Create Group"
            >
              <Users className="w-5 h-5" />
            </button>
            <button
              onClick={onNewChat}
              className="p-2 rounded-xl text-white hover:opacity-90 transition shadow-sm cursor-pointer"
              style={{ backgroundColor: theme.colors.primary }}
              title="New Chat"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2 shadow-2xs"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          />
        </div>
      </div>

      {/* Message Requests Card (Home page card) */}
      {incomingRequests.length > 0 && (
        <div
          className="p-3 border-b"
          style={{
            backgroundColor: theme.colors.lilac,
            borderColor: theme.colors.border
          }}
        >
          <div
            onClick={onOpenRequests}
            className="flex items-center justify-between p-3 rounded-2xl border shadow-sm hover:shadow-md transition cursor-pointer"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="relative p-2 rounded-xl"
                style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
              >
                <UserPlus className="w-5 h-5" />
                <span
                  className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] font-bold text-white flex items-center justify-center shadow-xs"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {incomingRequests.length}
                </span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold">
                  {incomingRequests.length} Pending Message {incomingRequests.length === 1 ? 'Request' : 'Requests'}
                </span>
                <span className="text-[11px] text-stone-400 truncate">
                  Latest from @{incomingRequests[0].senderUsername} ({incomingRequests[0].senderDuoraId})
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 shrink-0 ml-2" style={{ color: theme.colors.primary }} />
          </div>
        </div>
      )}

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: theme.colors.border }}>
        {filtered.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-stone-400">
            <MessageSquare className="w-10 h-10 mb-2 stroke-1 opacity-50" />
            <span className="text-sm font-semibold">
              No conversations yet
            </span>
            <p className="text-xs text-stone-400 mt-1 max-w-xs">
              Search by Duora ID or username to start a private conversation or send a message request.
            </p>
            <button
              onClick={onNewChat}
              className="mt-4 px-4 py-2 rounded-xl text-white text-xs font-bold shadow-md hover:opacity-90 transition cursor-pointer"
              style={{ backgroundColor: theme.colors.primary }}
            >
              Start New Chat
            </button>
          </div>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedConversationId;
            const other = Object.values(conv.participants || {}).find(p => p.uid !== profile?.uid);
            const unread = (profile && conv.unreadCount?.[profile.uid]) || 0;
            const avatarUrl = conv.type === 'group'
              ? (conv.groupAvatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=group')
              : (other?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user');
            const title = conv.type === 'group' ? conv.groupName : other?.displayName;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv)}
                className={`flex items-center gap-3 p-3.5 cursor-pointer transition select-none ${
                  isSelected
                    ? 'border-l-4'
                    : 'hover:opacity-85'
                }`}
                style={{
                  backgroundColor: isSelected ? theme.colors.surfaceHover : 'transparent',
                  borderLeftColor: isSelected ? theme.colors.primary : 'transparent',
                  borderBottomColor: theme.colors.border
                }}
              >
                <div className="relative shrink-0">
                  <img
                    src={avatarUrl}
                    alt={title}
                    className="w-12 h-12 rounded-full object-cover border"
                    style={{ borderColor: theme.colors.border }}
                  />
                  {conv.type === 'direct' && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#151320]" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-sm truncate">
                      {title}
                    </span>
                    <span className="text-[10px] text-stone-400 shrink-0 ml-1">
                      {conv.lastMessageTimestamp?.toDate
                        ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(conv.lastMessageTimestamp.toDate())
                        : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    <p className="text-xs text-stone-400 truncate">
                      {conv.lastMessage || 'No messages yet'}
                    </p>
                    {unread > 0 && (
                      <span
                        className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: theme.colors.primary }}
                      >
                        {unread}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
