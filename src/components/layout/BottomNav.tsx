import {
  MessageSquare,
  Phone,
  Search,
  Settings,
  UserCheck
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { useTheme } from '../../context/ThemeContext';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unreadChatsCount: number;
  friendsPendingCount?: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  unreadChatsCount,
  friendsPendingCount = 0
}) => {
  const { theme } = useTheme();

  const items = [
    { id: 'chats' as NavTab, label: 'Chats', icon: MessageSquare, badge: unreadChatsCount },
    { id: 'friends' as NavTab, label: 'Friends', icon: UserCheck, badge: friendsPendingCount },
    { id: 'calls' as NavTab, label: 'Calls', icon: Phone },
    { id: 'search' as NavTab, label: 'Discover', icon: Search },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 h-16 backdrop-blur-md border-t flex items-center justify-around z-30 select-none pb-safe"
      style={{
        backgroundColor: theme.colors.surface,
        borderColor: theme.colors.border,
        color: theme.colors.text
      }}
    >
      {items.map((item) => {
        const isActive = currentTab === item.id;
        const Icon = item.icon;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className="flex flex-col items-center justify-center flex-1 h-full relative py-1 transition cursor-pointer"
            style={{
              color: isActive ? theme.colors.primary : theme.colors.textMuted
            }}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge !== undefined && item.badge > 0 && (
                <span
                  className="absolute -top-1 -right-2 px-1.5 py-0.2 rounded-full text-white text-[9px] font-bold"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-1 ${isActive ? 'font-bold' : 'font-medium'}`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
