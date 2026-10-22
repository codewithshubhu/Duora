import React, { useState } from 'react';
import { Conversation, MessageRequest, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { deleteConversation } from '../../services/chatService';
import { Search, Plus, Users, UserPlus, MessageSquare, Clock, ArrowRight, Trash2, Compass, Loader2 } from 'lucide-react';

interface ChatListProps {
  conversations: Conversation[];
  incomingRequests: MessageRequest[];
  selectedConversationId?: string;
  onSelectConversation: (conv: Conversation) => void;
  onOpenRequests: () => void;
  onNewChat: () => void;
  onNewGroup: () => void;
  onJoinGroup?: () => void;
  onConversationDeleted?: (convId: string) => void;
}

export const ChatList: React.FC<ChatListProps> = ({
  conversations,
  incomingRequests,
  selectedConversationId,
  onSelectConversation,
  onOpenRequests,
  onNewChat,
  onNewGroup,
  onJoinGroup,
  onConversationDeleted
}) => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [filterQuery, setFilterQuery] = useState('');
  const [showGroupMenu, setShowGroupMenu] = useState(false);

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

  const [convToDelete, setConvToDelete] = useState<Conversation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!convToDelete || !profile) return;
    setIsDeleting(true);
    try {
      await deleteConversation(convToDelete.id, profile.uid);
      if (onConversationDeleted) {
        onConversationDeleted(convToDelete.id);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    } finally {
      setIsDeleting(false);
      setConvToDelete(null);
    }
  };

  return (
    <div
      className="flex flex-col h-full border-r select-none relative"
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
          <div className="flex items-center gap-1.5 relative">
            {/* Merged Group Options Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowGroupMenu(!showGroupMenu)}
                className="p-2 rounded-xl hover:opacity-80 transition cursor-pointer"
                style={{ color: theme.colors.textMuted }}
                title="Groups"
              >
                <Users className="w-5 h-5" />
              </button>

              {showGroupMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowGroupMenu(false)}
                  />
                  <div
                    className="absolute right-0 mt-2 w-48 rounded-2xl shadow-xl border p-1.5 z-50 animate-in fade-in zoom-in-95 text-xs font-medium"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border,
                      color: theme.colors.text
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setShowGroupMenu(false);
                        onNewGroup();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-2.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-[#7057E8]" />
                      <span>Create New Group</span>
                    </button>
                    {onJoinGroup && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowGroupMenu(false);
                          onJoinGroup();
                        }}
                        className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 transition flex items-center gap-2.5 cursor-pointer"
                      >
                        <Compass className="w-4 h-4 text-emerald-500" />
                        <span>Browse & Join Groups</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
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
                className={`group flex items-center gap-3 p-3.5 cursor-pointer transition select-none ${
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
                    <div className="flex items-center gap-1 shrink-0">
                      {unread > 0 && (
                        <span
                          className="px-1.5 py-0.5 rounded-full text-white text-[10px] font-bold shrink-0"
                          style={{ backgroundColor: theme.colors.primary }}
                        >
                          {unread}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConvToDelete(conv);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/15 text-stone-400 hover:text-red-500 transition cursor-pointer"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Chat Confirmation Modal */}
      {convToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none">
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center animate-in zoom-in-95"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base mb-1.5">Delete Chat?</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
              Are you sure you want to delete this conversation with{' '}
              <strong className="text-stone-800 dark:text-stone-200">
                {convToDelete.type === 'group'
                  ? convToDelete.groupName
                  : Object.values(convToDelete.participants || {}).find(p => p.uid !== profile?.uid)?.displayName || 'this contact'}
              </strong>
              ? This will remove the chat from your messages list.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConvToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-2xl border text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                style={{
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
