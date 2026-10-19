import React, { useState } from 'react';
import { DuoraLogo } from '../common/DuoraLogo';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { NotificationItem, MessageRequest } from '../../types';
import {
  Bell,
  Lock,
  Copy,
  Check,
  Search,
  Settings,
  UserPlus,
  ArrowRight,
  Sparkles,
  CheckCheck
} from 'lucide-react';

interface NavbarProps {
  notifications: NotificationItem[];
  incomingRequests?: MessageRequest[];
  onOpenProfile: () => void;
  onOpenSettings: () => void;
  onOpenSearch: () => void;
  onOpenRequests?: () => void;
  onMarkNotificationRead: (id: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  notifications,
  incomingRequests = [],
  onOpenProfile,
  onOpenSettings,
  onOpenSearch,
  onOpenRequests,
  onMarkNotificationRead
}) => {
  const { profile } = useAuth();
  const { theme } = useTheme();
  const [copiedId, setCopiedId] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);

  const unreadNotifs = notifications.filter(n => !n.read);
  const totalAlerts = unreadNotifs.length + incomingRequests.length;

  const handleCopyDuoraId = () => {
    if (profile?.duoraId) {
      navigator.clipboard.writeText(profile.duoraId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  return (
    <header
      className="h-16 px-4 sm:px-6 border-b flex items-center justify-between z-30 select-none backdrop-blur-md"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text
      }}
    >
      {/* Brand logo */}
      <div className="flex items-center gap-3">
        <DuoraLogo size="sm" showTagline={true} />
      </div>

      {/* Middle & Right status and quick actions */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Permanent Duora ID pill */}
        {profile && (
          <button
            type="button"
            onClick={handleCopyDuoraId}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border hover:opacity-80 transition cursor-pointer shadow-2xs"
            style={{
              backgroundColor: theme.colors.lilac,
              borderColor: theme.colors.border,
              color: theme.colors.primary
            }}
            title="Click to copy your immutable Duora ID"
          >
            <Lock className="w-3.5 h-3.5" />
            <span className="font-mono text-xs font-bold">{profile.duoraId}</span>
            {copiedId ? (
              <Check className="w-3.5 h-3.5 text-emerald-500" />
            ) : (
              <Copy className="w-3.5 h-3.5 opacity-60" />
            )}
          </button>
        )}

        {/* Search quick button */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="p-2 rounded-xl hover:opacity-80 transition cursor-pointer"
          style={{ color: theme.colors.textMuted }}
          title="Discover Users"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Notifications Bar Dropdown (Includes Message Requests on home page & notification bar) */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2 rounded-xl hover:opacity-80 transition relative cursor-pointer"
            style={{ color: theme.colors.textMuted }}
            title="Notifications & Requests"
          >
            <Bell className="w-5 h-5" />
            {totalAlerts > 0 && (
              <span className="absolute top-1 right-1 px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-bold shadow-xs">
                {totalAlerts}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {showNotifMenu && (
            <div
              className="absolute right-0 mt-2 w-80 sm:w-88 rounded-3xl shadow-2xl border p-3 z-50 animate-in fade-in zoom-in-95"
              style={{
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text
              }}
            >
              <div
                className="flex items-center justify-between pb-2 border-b mb-2 px-1"
                style={{ borderColor: theme.colors.border }}
              >
                <span className="text-xs font-bold">
                  Notification Center
                </span>
                <span className="text-[10px] font-bold" style={{ color: theme.colors.primary }}>
                  Duora Realtime
                </span>
              </div>

              {/* Message Requests in Notification Bar */}
              {incomingRequests.length > 0 && (
                <div
                  className="mb-3 p-3 rounded-2xl border"
                  style={{
                    backgroundColor: theme.colors.lilac,
                    borderColor: theme.colors.border
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: theme.colors.primary }}>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Message Requests ({incomingRequests.length})</span>
                    </span>
                    {onOpenRequests && (
                      <button
                        onClick={() => {
                          setShowNotifMenu(false);
                          onOpenRequests();
                        }}
                        className="text-[11px] font-bold hover:underline"
                        style={{ color: theme.colors.primary }}
                      >
                        View all
                      </button>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    {incomingRequests.slice(0, 2).map(req => (
                      <div
                        key={req.id}
                        onClick={() => {
                          setShowNotifMenu(false);
                          onOpenRequests?.();
                        }}
                        className="p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer hover:opacity-85"
                        style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={req.senderAvatar}
                            alt={req.senderDisplayName}
                            className="w-7 h-7 rounded-full object-cover"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-[11px] block truncate">{req.senderDisplayName}</span>
                            <span className="text-[10px] text-stone-400 truncate block">@{req.senderUsername}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-3 h-3 text-stone-400" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* General Notifications list */}
              <div className="max-h-60 overflow-y-auto space-y-1.5">
                {notifications.length === 0 && incomingRequests.length === 0 ? (
                  <div className="py-6 text-center text-stone-400 text-xs">
                    No new notifications
                  </div>
                ) : (
                  notifications.map(n => (
                    <div
                      key={n.id}
                      onClick={() => onMarkNotificationRead(n.id)}
                      className="p-2.5 rounded-2xl border flex items-start gap-2.5 transition cursor-pointer hover:opacity-80"
                      style={{
                        backgroundColor: n.read ? 'transparent' : theme.colors.surfaceHover,
                        borderColor: theme.colors.border
                      }}
                    >
                      <div
                        className="p-1.5 rounded-xl shrink-0"
                        style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-bold text-xs block truncate">{n.title}</span>
                        <p className="text-[11px] text-stone-400 line-clamp-2 mt-0.5">{n.body}</p>
                      </div>
                      {!n.read && (
                        <span
                          className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                          style={{ backgroundColor: theme.colors.primary }}
                        />
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User avatar button to open Profile */}
        {profile && (
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-2 p-1 pl-1.5 rounded-full border hover:opacity-85 transition cursor-pointer shadow-2xs"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border
            }}
          >
            <span className="hidden md:inline text-xs font-bold max-w-[100px] truncate">
              {profile.displayName}
            </span>
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-8 h-8 rounded-full object-cover border"
              style={{ borderColor: theme.colors.primary }}
            />
          </div>
        )}
      </div>
    </header>
  );
};
