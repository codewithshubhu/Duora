import {
  MessageSquare,
  Phone,
  Search,
  Settings,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

export type NavTab = 'chats' | 'friends' | 'calls' | 'search' | 'settings' | 'requests';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadChatsCount: number;
  friendsPendingCount?: number;
  onOpenProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  unreadChatsCount,
  friendsPendingCount = 0,
  onOpenProfile
}) => {
  const { profile } = useAuth();
  const { theme } = useTheme();

  const navItems = [
    {
      id: 'chats' as NavTab,
      label: 'Chats',
      icon: MessageSquare,
      badge: unreadChatsCount,
    },
    {
      id: 'friends' as NavTab,
      label: 'Friends',
      icon: UserCheck,
      badge: friendsPendingCount,
    },
    {
      id: 'calls' as NavTab,
      label: 'Calls',
      icon: Phone,
    },
    {
      id: 'search' as NavTab,
      label: 'Discover',
      icon: Search,
    },
    {
      id: 'settings' as NavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  return (
    <aside
      className="hidden md:flex flex-col justify-between w-64 border-r p-4 select-none shrink-0"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text
      }}
    >
      {/* Top Nav Items */}
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-bold tracking-wider text-stone-400 uppercase">
          Navigation
        </div>

        {navItems.map((item) => {
          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition cursor-pointer ${
                isActive
                  ? 'text-white shadow-md'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: isActive ? theme.colors.primary : 'transparent',
                color: isActive ? '#FFFFFF' : theme.colors.text
              }}
            >
              <div className="flex items-center gap-3">
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </div>

              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{
                    backgroundColor: isActive ? '#FFFFFF' : theme.colors.primary,
                    color: isActive ? theme.colors.primary : '#FFFFFF'
                  }}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User profile dock at bottom */}
      {profile && (
        <div className="pt-4 border-t" style={{ borderColor: theme.colors.border }}>
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-3 p-2 rounded-2xl hover:opacity-85 cursor-pointer transition"
            style={{ backgroundColor: theme.colors.surfaceHover }}
          >
            <img
              src={profile.avatarUrl}
              alt={profile.displayName}
              className="w-10 h-10 rounded-full object-cover border"
              style={{ borderColor: theme.colors.primary }}
            />
            <div className="flex flex-col min-w-0">
              <span className="font-bold text-xs truncate">{profile.displayName}</span>
              <span className="text-[10px] text-stone-400 truncate">@{profile.username}</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
