import React from 'react';
import { useCall } from '../../context/CallContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { CallRecord, UserProfile } from '../../types';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  ArrowLeft,
  Clock
} from 'lucide-react';

interface CallHistoryScreenProps {
  onBack: () => void;
  onOpenProfile: (user: UserProfile) => void;
}

export const CallHistoryScreen: React.FC<CallHistoryScreenProps> = ({ onBack, onOpenProfile }) => {
  const { callHistory, initiateCall } = useCall();
  const { profile } = useAuth();
  const { theme } = useTheme();

  const formatDuration = (secs?: number) => {
    if (!secs) return '0s';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const formatCallDate = (timestamp: any) => {
    if (!timestamp) return '';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds ? timestamp.seconds * 1000 : timestamp);
      const now = new Date();
      const isToday = date.toDateString() === now.toDateString();
      const timeStr = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(date);
      if (isToday) return `Today, ${timeStr}`;
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' }).format(date);
    } catch {
      return '';
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
              Calls
            </h1>
            <p className="text-xs text-stone-400">
              Recent voice & video calls.
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 divide-y" style={{ borderColor: theme.colors.border }}>
        {callHistory.length === 0 ? (
          <div className="py-16 text-center text-stone-400">
            <Phone className="w-12 h-12 mx-auto mb-2 opacity-30 stroke-1" />
            <p className="font-semibold text-sm">
              No recent calls
            </p>
            <p className="text-xs text-stone-400 mt-1 max-w-xs mx-auto">
              Make or receive voice and video calls with your friends.
            </p>
          </div>
        ) : (
          callHistory.map((call) => {
            const isCaller = call.callerId === profile?.uid;
            const otherName = isCaller ? call.receiverName : call.callerName;
            const otherAvatar = isCaller ? call.receiverAvatar : call.callerAvatar;
            const otherDuoraId = isCaller ? call.receiverDuoraId : call.callerDuoraId;
            const isMissed = call.status === 'missed';
            const timestampStr = formatCallDate(call.createdAt);

            return (
              <div key={call.id} className="py-3.5 flex items-center justify-between gap-3">
                <div
                  onClick={() => {
                    onOpenProfile({
                      uid: isCaller ? call.receiverId : call.callerId,
                      duoraId: otherDuoraId,
                      username: otherName.toLowerCase().replace(/\s+/g, '_'),
                      usernameLower: otherName.toLowerCase().replace(/\s+/g, '_'),
                      displayName: otherName,
                      avatarUrl: otherAvatar,
                      isDiscoverable: true,
                      showOnlineStatus: true,
                      showLastSeen: true,
                      readReceipts: true,
                    });
                  }}
                  className="flex items-center gap-3 cursor-pointer min-w-0 flex-1 hover:opacity-85"
                >
                  <img
                    src={otherAvatar}
                    alt={otherName}
                    className="w-12 h-12 rounded-full object-cover border shadow-2xs"
                    style={{ borderColor: theme.colors.border }}
                  />
                  <div className="min-w-0">
                    <span className="font-bold text-sm block truncate">
                      {otherName}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-stone-400 mt-0.5">
                      {isMissed ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      ) : isCaller ? (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <PhoneIncoming className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      )}
                      <span className="capitalize">{call.type} Call</span>
                      <span>•</span>
                      <span>{call.duration ? formatDuration(call.duration) : call.status}</span>
                      {timestampStr && (
                        <>
                          <span>•</span>
                          <span className="text-[11px] font-mono">{timestampStr}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      initiateCall({
                        uid: isCaller ? call.receiverId : call.callerId,
                        duoraId: otherDuoraId,
                        username: otherName.toLowerCase().replace(/\s+/g, '_'),
                        usernameLower: otherName.toLowerCase().replace(/\s+/g, '_'),
                        displayName: otherName,
                        avatarUrl: otherAvatar,
                        isDiscoverable: true,
                        showOnlineStatus: true,
                        showLastSeen: true,
                        readReceipts: true,
                      }, call.type);
                    }}
                    className="p-2.5 rounded-xl hover:opacity-85 transition cursor-pointer"
                    style={{ color: theme.colors.primary }}
                    title={`Call back (${call.type})`}
                  >
                    {call.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
