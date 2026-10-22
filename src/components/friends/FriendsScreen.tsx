import React, { useState, useEffect } from 'react';
import { MessageRequest, UserProfile, Conversation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import {
  acceptMessageRequest,
  declineMessageRequest,
  cancelMessageRequest,
  removeFriend
} from '../../services/requestService';
import { getUserProfile, toggleBlockUser } from '../../services/userService';
import { getOrCreateDirectConversation } from '../../services/chatService';
import {
  UserCheck,
  UserPlus,
  Check,
  X,
  ArrowLeft,
  MessageSquare,
  Search,
  MoreVertical,
  UserMinus,
  Ban,
  Clock,
  Loader2
} from 'lucide-react';

interface FriendsScreenProps {
  incomingRequests: MessageRequest[];
  outgoingRequests: MessageRequest[];
  onBack: () => void;
  onOpenConversation: (conv: Conversation) => void;
  onOpenProfile: (user: UserProfile) => void;
}

export const FriendsScreen: React.FC<FriendsScreenProps> = ({
  incomingRequests,
  outgoingRequests,
  onBack,
  onOpenConversation,
  onOpenProfile
}) => {
  const { profile, refreshProfile } = useAuth();
  const { theme } = useTheme();

  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [requestSubtab, setRequestSubtab] = useState<'incoming' | 'outgoing'>('incoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [friendsList, setFriendsList] = useState<UserProfile[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [openMenuFriendId, setOpenMenuFriendId] = useState<string | null>(null);

  // Load friend profiles from profile.friends
  useEffect(() => {
    if (!profile?.friends || profile.friends.length === 0) {
      setFriendsList([]);
      return;
    }

    let isMounted = true;
    setLoadingFriends(true);

    Promise.all(profile.friends.map(uid => getUserProfile(uid).catch(() => null)))
      .then(users => {
        if (isMounted) {
          setFriendsList(users.filter((u): u is UserProfile => u !== null));
        }
      })
      .finally(() => {
        if (isMounted) setLoadingFriends(false);
      });

    return () => {
      isMounted = false;
    };
  }, [profile?.friends]);

  const filteredFriends = friendsList.filter(f => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return f.displayName.toLowerCase().includes(q) || f.username.toLowerCase().includes(q);
  });

  const pendingOutgoing = outgoingRequests.filter(r => r.status === 'pending');

  const handleAccept = async (req: MessageRequest) => {
    if (!profile) return;
    setActionLoadingId(req.id);
    try {
      const senderUser = await getUserProfile(req.senderId);
      if (senderUser) {
        await acceptMessageRequest(req, profile, senderUser);
        await refreshProfile();
        const conv = await getOrCreateDirectConversation(profile, senderUser, true);
        onOpenConversation(conv);
      }
    } catch (err) {
      console.error('Failed to accept request:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDecline = async (reqId: string) => {
    setActionLoadingId(reqId);
    try {
      await declineMessageRequest(reqId);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to decline request:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = async (reqId: string) => {
    setActionLoadingId(reqId);
    try {
      await cancelMessageRequest(reqId);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to cancel request:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUnfriend = async (friendUid: string) => {
    if (!profile) return;
    setActionLoadingId(friendUid);
    setOpenMenuFriendId(null);
    try {
      await removeFriend(profile.uid, friendUid);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to remove friend:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlockFriend = async (friendUid: string) => {
    if (!profile) return;
    setActionLoadingId(friendUid);
    setOpenMenuFriendId(null);
    try {
      await toggleBlockUser(profile.uid, friendUid, true);
      await removeFriend(profile.uid, friendUid);
      await refreshProfile();
    } catch (err) {
      console.error('Failed to block friend:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleChatWithFriend = async (friend: UserProfile) => {
    if (!profile) return;
    try {
      const conv = await getOrCreateDirectConversation(profile, friend, true);
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
      {/* Header */}
      <div
        className="p-4 border-b flex items-center justify-between"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:opacity-80 md:hidden cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold tracking-tight">
              Friends
            </h1>
            <p className="text-xs text-stone-400">
              Manage your connections and friend requests.
            </p>
          </div>
        </div>
      </div>

      {/* Main Tabs: Friends vs Requests */}
      <div
        className="flex border-b"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
      >
        <button
          onClick={() => setActiveTab('friends')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'friends'
              ? 'border-[#7057E8] text-[#7057E8]'
              : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Friends ({friendsList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('requests')}
          className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-2 transition cursor-pointer ${
            activeTab === 'requests'
              ? 'border-[#7057E8] text-[#7057E8]'
              : 'border-transparent text-stone-400 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          <span>Requests</span>
          {incomingRequests.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-red-500 text-white font-bold">
              {incomingRequests.length}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: Friends List */}
      {activeTab === 'friends' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Search bar within friends */}
          <div
            className="p-3 border-b"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            <div className="relative">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search friends..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border focus:outline-none focus:ring-2"
                style={{
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {loadingFriends ? (
              <div className="py-12 flex flex-col items-center justify-center text-stone-400 text-xs">
                <Loader2 className="w-6 h-6 animate-spin mb-2 text-[#7057E8]" />
                <span>Loading friends...</span>
              </div>
            ) : filteredFriends.length === 0 ? (
              <div className="py-12 text-center text-stone-400 space-y-2">
                <UserCheck className="w-10 h-10 mx-auto opacity-40" />
                <p className="text-sm font-semibold">
                  {searchQuery ? 'No friends match your search.' : 'No friends yet.'}
                </p>
                <p className="text-xs max-w-xs mx-auto">
                  Send friend requests or accept pending requests to connect and chat.
                </p>
              </div>
            ) : (
              filteredFriends.map((friend) => (
                <div
                  key={friend.uid}
                  className="p-3 rounded-2xl border flex items-center justify-between gap-3 shadow-xs transition hover:shadow-sm relative"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border
                  }}
                >
                  <div
                    onClick={() => onOpenProfile(friend)}
                    className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                  >
                    <img
                      src={friend.avatarUrl}
                      alt={friend.displayName}
                      className="w-11 h-11 rounded-full object-cover border"
                      style={{ borderColor: theme.colors.border }}
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-sm block leading-tight text-left">
                        {friend.displayName}
                      </span>
                      <span className="text-xs text-stone-400 block text-left mt-0.5">
                        @{friend.username}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleChatWithFriend(friend)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white shadow-xs hover:opacity-90 transition flex items-center gap-1.5 cursor-pointer"
                      style={{ backgroundColor: theme.colors.primary }}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Chat</span>
                    </button>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenuFriendId(openMenuFriendId === friend.uid ? null : friend.uid)}
                        className="p-2 rounded-xl hover:opacity-80 transition cursor-pointer text-stone-400"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuFriendId === friend.uid && (
                        <>
                          <div
                            className="fixed inset-0 z-30"
                            onClick={() => setOpenMenuFriendId(null)}
                          />
                          <div
                            className="absolute right-0 mt-1 w-36 rounded-2xl shadow-xl border p-1 z-40 animate-in fade-in zoom-in-95 text-xs"
                            style={{
                              backgroundColor: theme.colors.surface,
                              borderColor: theme.colors.border,
                              color: theme.colors.text
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleUnfriend(friend.uid)}
                              className="w-full text-left px-3 py-2 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 cursor-pointer"
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                              <span>Unfriend</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleBlockFriend(friend.uid)}
                              className="w-full text-left px-3 py-2 rounded-xl text-red-500 hover:bg-red-500/10 flex items-center gap-2 cursor-pointer"
                            >
                              <Ban className="w-3.5 h-3.5" />
                              <span>Block</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Requests (Received & Sent) */}
      {activeTab === 'requests' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Subtabs: Incoming vs Outgoing */}
          <div
            className="flex p-2 gap-2 border-b"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
          >
            <button
              onClick={() => setRequestSubtab('incoming')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                requestSubtab === 'incoming'
                  ? 'bg-[#7057E8] text-white shadow-xs'
                  : 'text-stone-500 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Received ({incomingRequests.length})
            </button>
            <button
              onClick={() => setRequestSubtab('outgoing')}
              className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                requestSubtab === 'outgoing'
                  ? 'bg-[#7057E8] text-white shadow-xs'
                  : 'text-stone-500 hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              Sent ({pendingOutgoing.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {requestSubtab === 'incoming' ? (
              incomingRequests.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <UserPlus className="w-10 h-10 mx-auto opacity-40" />
                  <p className="text-sm font-semibold">No pending friend requests</p>
                  <p className="text-xs">When someone sends you a friend request, it will appear here.</p>
                </div>
              ) : (
                incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border space-y-3 shadow-xs"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={req.senderAvatar}
                        alt={req.senderDisplayName}
                        className="w-12 h-12 rounded-full object-cover border"
                        style={{ borderColor: theme.colors.border }}
                      />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-sm block leading-tight">
                          {req.senderDisplayName}
                        </span>
                        <span className="text-xs text-stone-400 block mt-0.5">
                          @{req.senderUsername}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        disabled={actionLoadingId === req.id}
                        onClick={() => handleDecline(req.id)}
                        className="flex-1 py-2 rounded-xl border text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                        style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={actionLoadingId === req.id}
                        onClick={() => handleAccept(req)}
                        className="flex-1 py-2 rounded-xl bg-[#7057E8] hover:bg-[#5E44D9] text-white text-xs font-bold shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {actionLoadingId === req.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Accept</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              pendingOutgoing.length === 0 ? (
                <div className="py-12 text-center text-stone-400 space-y-2">
                  <Clock className="w-10 h-10 mx-auto opacity-40" />
                  <p className="text-sm font-semibold">No sent requests pending</p>
                  <p className="text-xs">Requests you send to others will appear here until accepted.</p>
                </div>
              ) : (
                pendingOutgoing.map((req) => (
                  <div
                    key={req.id}
                    className="p-4 rounded-2xl border flex items-center justify-between gap-3 shadow-xs"
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.border
                    }}
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-stone-500 dark:text-stone-400 block">
                        Friend request sent
                      </span>
                      <span className="text-xs text-stone-400 mt-0.5 block">
                        Waiting for response...
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={actionLoadingId === req.id}
                      onClick={() => handleCancel(req.id)}
                      className="px-3.5 py-1.5 rounded-xl border text-xs font-medium text-stone-500 hover:text-red-500 hover:border-red-300 transition cursor-pointer"
                      style={{ borderColor: theme.colors.border }}
                    >
                      {actionLoadingId === req.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Cancel Request'
                      )}
                    </button>
                  </div>
                ))
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
};
