import React, { useState } from 'react';
import { MessageRequest, UserProfile, Conversation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { acceptMessageRequest, declineMessageRequest } from '../../services/requestService';
import { getUserProfile, toggleBlockUser } from '../../services/userService';
import { getOrCreateDirectConversation } from '../../services/chatService';
import { UserPlus, Check, X, ShieldAlert, ArrowLeft, MessageSquare, Ban } from 'lucide-react';

interface RequestsScreenProps {
  incomingRequests: MessageRequest[];
  outgoingRequests: MessageRequest[];
  onBack: () => void;
  onOpenConversation: (conv: Conversation) => void;
  onOpenProfile: (user: UserProfile) => void;
}

export const RequestsScreen: React.FC<RequestsScreenProps> = ({
  incomingRequests,
  outgoingRequests,
  onBack,
  onOpenConversation,
  onOpenProfile
}) => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [tab, setTab] = useState<'incoming' | 'outgoing'>('incoming');
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleAccept = async (req: MessageRequest) => {
    if (!profile) return;
    setActionLoadingId(req.id);
    try {
      const senderUser = await getUserProfile(req.senderId);
      if (senderUser) {
        await acceptMessageRequest(req, profile, senderUser);
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
    } catch (err) {
      console.error('Failed to decline request:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleBlock = async (req: MessageRequest) => {
    if (!profile) return;
    try {
      setActionLoadingId(req.id);
      await toggleBlockUser(profile.uid, req.senderId, true);
      await declineMessageRequest(req.id);
    } catch (err) {
      console.error('Failed to block sender:', err);
    } finally {
      setActionLoadingId(null);
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
              Message Requests
            </h1>
            <p className="text-xs text-stone-400">
              Review connection invitations from new users.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        className="flex border-b"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
      >
        <button
          onClick={() => setTab('incoming')}
          className="flex-1 py-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-2 cursor-pointer"
          style={{
            borderColor: tab === 'incoming' ? theme.colors.primary : 'transparent',
            color: tab === 'incoming' ? theme.colors.primary : theme.colors.textMuted
          }}
        >
          <span>Incoming</span>
          {incomingRequests.length > 0 && (
            <span
              className="px-1.5 py-0.2 rounded-full text-white text-[10px]"
              style={{ backgroundColor: theme.colors.primary }}
            >
              {incomingRequests.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setTab('outgoing')}
          className="flex-1 py-3 text-xs font-bold border-b-2 transition flex items-center justify-center gap-2 cursor-pointer"
          style={{
            borderColor: tab === 'outgoing' ? theme.colors.primary : 'transparent',
            color: tab === 'outgoing' ? theme.colors.primary : theme.colors.textMuted
          }}
        >
          <span>Sent Requests</span>
          <span className="text-stone-400 text-[10px]">({outgoingRequests.length})</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === 'incoming' ? (
          incomingRequests.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-1" />
              <p className="font-semibold text-sm">
                No pending requests
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                When new users search your permanent Duora ID or username, their requests will appear here.
              </p>
            </div>
          ) : (
            incomingRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl border shadow-sm flex flex-col gap-3"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={async () => {
                      const u = await getUserProfile(req.senderId);
                      if (u) onOpenProfile(u);
                    }}
                    className="flex items-center gap-3 cursor-pointer min-w-0"
                  >
                    <img
                      src={req.senderAvatar}
                      alt={req.senderDisplayName}
                      className="w-12 h-12 rounded-full object-cover border"
                      style={{ borderColor: theme.colors.border }}
                    />
                    <div className="min-w-0">
                      <span className="font-bold text-sm block truncate">{req.senderDisplayName}</span>
                      <div className="flex items-center gap-1.5 text-xs text-stone-400">
                        <span className="font-mono font-medium" style={{ color: theme.colors.primary }}>
                          {req.senderDuoraId}
                        </span>
                        <span>•</span>
                        <span>@{req.senderUsername}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleBlock(req)}
                    className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-stone-100 dark:hover:bg-stone-800 transition"
                    title="Block User"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                </div>

                <div
                  className="p-3 rounded-xl border text-xs leading-relaxed italic"
                  style={{
                    backgroundColor: theme.colors.background,
                    borderColor: theme.colors.border
                  }}
                >
                  "{req.previewMessage}"
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleDecline(req.id)}
                    disabled={actionLoadingId === req.id}
                    className="flex-1 py-2 rounded-xl border text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                    style={{ borderColor: theme.colors.border }}
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleAccept(req)}
                    disabled={actionLoadingId === req.id}
                    className="flex-1 py-2 rounded-xl text-white text-xs font-bold shadow-sm hover:opacity-90 transition flex items-center justify-center gap-1.5 cursor-pointer"
                    style={{ backgroundColor: theme.colors.primary }}
                  >
                    <Check className="w-4 h-4" />
                    <span>{actionLoadingId === req.id ? 'Connecting...' : 'Accept'}</span>
                  </button>
                </div>
              </div>
            ))
          )
        ) : (
          outgoingRequests.length === 0 ? (
            <div className="py-16 text-center text-stone-400">
              <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-1" />
              <p className="font-semibold text-sm">No sent requests</p>
              <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
                Invitations you send to other users will be listed here until accepted.
              </p>
            </div>
          ) : (
            outgoingRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-2xl border shadow-sm flex items-center justify-between gap-3"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border
                }}
              >
                <div>
                  <span className="font-bold text-xs block">Request to {req.receiverDuoraId}</span>
                  <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">"{req.previewMessage}"</p>
                  <span
                    className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                    style={{
                      backgroundColor: req.status === 'accepted' ? '#10B98120' : theme.colors.lilac,
                      color: req.status === 'accepted' ? '#10B981' : theme.colors.primary
                    }}
                  >
                    {req.status === 'pending' ? 'Pending Acceptance' : req.status}
                  </span>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
