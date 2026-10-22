import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { CallProvider, useCall } from './context/CallContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';
import { VerificationBanner } from './components/auth/VerificationBanner';
import { AuthModal } from './components/auth/AuthModal';
import { ChatList } from './components/chat/ChatList';
import { ChatWindow } from './components/chat/ChatWindow';
import { NewChatModal } from './components/chat/NewChatModal';
import { GroupCreateModal } from './components/chat/GroupCreateModal';
import { GroupJoinModal } from './components/chat/GroupJoinModal';
import { RequestsScreen } from './components/requests/RequestsScreen';
import { FriendsScreen } from './components/friends/FriendsScreen';
import { SearchScreen } from './components/search/SearchScreen';
import { CallHistoryScreen } from './components/call/CallHistoryScreen';
import { SettingsScreen } from './components/settings/SettingsScreen';
import { ProfileModal } from './components/profile/ProfileModal';
import { CallModal } from './components/call/CallModal';
import { DuoraLogo, DuoraWatermark } from './components/common/DuoraLogo';
import {
  Conversation,
  MessageRequest,
  NotificationItem,
  UserProfile
} from './types';
import {
  subscribeToConversations,
  getOrCreateDirectConversation
} from './services/chatService';
import {
  subscribeToIncomingRequests,
  subscribeToOutgoingRequests
} from './services/requestService';
import {
  subscribeToNotifications,
  markNotificationAsRead
} from './services/notificationService';
import { testFirestoreConnection } from './firebase/config';
import { ShieldCheck, MessageSquare, Lock, Sparkles } from 'lucide-react';

const DuoraApp: React.FC = () => {
  const { currentUser, profile, loading } = useAuth();
  const { theme } = useTheme();

  const [currentTab, setCurrentTab] = useState<NavTab>('chats');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<MessageRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<MessageRequest[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Modals state
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showJoinGroupModal, setShowJoinGroupModal] = useState(false);
  const [viewingProfileUser, setViewingProfileUser] = useState<UserProfile | null>(null);
  const [showSelfProfile, setShowSelfProfile] = useState(false);
  const [showIntroSplash, setShowIntroSplash] = useState(true);

  // Cold start splash effect
  useEffect(() => {
    testFirestoreConnection();
    const timer = setTimeout(() => {
      setShowIntroSplash(false);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  // Subscribe to real-time collections when logged in
  useEffect(() => {
    if (!profile) {
      setConversations([]);
      setIncomingRequests([]);
      setOutgoingRequests([]);
      setNotifications([]);
      return;
    }

    const unsubConvs = subscribeToConversations(profile.uid, (convs) => {
      setConversations(convs);
      // Keep selected conversation in sync
      if (selectedConversation) {
        const updated = convs.find(c => c.id === selectedConversation.id);
        if (updated) setSelectedConversation(updated);
      }
    });

    const unsubIncomingReqs = subscribeToIncomingRequests(profile.uid, (reqs) => {
      setIncomingRequests(reqs);
    });

    const unsubOutgoingReqs = subscribeToOutgoingRequests(profile.uid, (reqs) => {
      setOutgoingRequests(reqs);
    });

    const unsubNotifs = subscribeToNotifications(profile.uid, (notifs) => {
      setNotifications(notifs);
    });

    return () => {
      unsubConvs();
      unsubIncomingReqs();
      unsubOutgoingReqs();
      unsubNotifs();
    };
  }, [profile, selectedConversation?.id]);

  // Compute unread badges
  const unreadChatsCount = conversations.reduce((total, conv) => {
    if (!profile) return total;
    return total + (conv.unreadCount?.[profile.uid] || 0);
  }, 0);

  const pendingRequestsCount = incomingRequests.length;

  // Initial Splash Screen
  if (showIntroSplash || loading) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#F7F7FB] dark:bg-[#12111A] text-center p-6 select-none animate-in fade-in">
        <DuoraLogo size="xl" showTagline={true} />
        <div className="mt-8 flex flex-col items-center">
          <div className="w-8 h-8 border-3 border-[#7057E8] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-stone-400 mt-4 font-medium tracking-wide">
            Initializing secure private session...
          </span>
        </div>
        <div className="absolute bottom-6">
          <DuoraWatermark />
        </div>
      </div>
    );
  }

  // If user is not authenticated, render AuthModal over Duora Hero Canvas
  if (!currentUser) {
    return (
      <div className="relative min-h-screen flex flex-col items-center justify-between bg-gradient-to-br from-[#F7F7FB] via-[#EDE8FF]/40 to-[#F2EFFF] dark:from-[#12111A] dark:to-[#1C182B] text-stone-900 dark:text-stone-100 p-6 select-none overflow-hidden">
        {/* Subtle background ambient glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#7057E8]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="pt-8">
          <DuoraLogo size="lg" showTagline={true} />
        </div>

        <AuthModal />

        <div className="pb-4">
          <DuoraWatermark />
        </div>
      </div>
    );
  }

  // Handle opening conversation directly from requests or search
  const handleOpenConversation = (conv: Conversation) => {
    setSelectedConversation(conv);
    setCurrentTab('chats');
  };

  return (
    <div
      className="flex flex-col h-screen w-screen overflow-hidden transition-colors duration-200"
      style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}
    >
      
      {/* Top mandatory verification warning */}
      <VerificationBanner />

      {/* Top Navbar */}
      <Navbar
        notifications={notifications}
        incomingRequests={incomingRequests}
        onOpenProfile={() => setShowSelfProfile(true)}
        onOpenSettings={() => setCurrentTab('settings')}
        onOpenSearch={() => setCurrentTab('search')}
        onOpenRequests={() => setCurrentTab('requests')}
        onMarkNotificationRead={markNotificationAsRead}
      />

      {/* Main Workspace Frame */}
      <div className="flex flex-1 overflow-hidden relative">
        
        {/* Desktop Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
          }}
          unreadChatsCount={unreadChatsCount}
          friendsPendingCount={pendingRequestsCount}
          onOpenProfile={() => setShowSelfProfile(true)}
        />

        {/* Content Pane (Left or full depending on mobile vs desktop) */}
        <div
          className={`h-full flex-1 md:flex overflow-hidden ${
            selectedConversation ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Column A: Primary Tab Content (List) */}
          <div
            className="w-full md:w-96 md:min-w-[340px] md:max-w-md h-full shrink-0 border-r"
            style={{ borderColor: theme.colors.border }}
          >
            {currentTab === 'chats' && (
              <ChatList
                conversations={conversations}
                incomingRequests={incomingRequests}
                selectedConversationId={selectedConversation?.id}
                onSelectConversation={(conv) => setSelectedConversation(conv)}
                onOpenRequests={() => setCurrentTab('friends')}
                onNewChat={() => setShowNewChatModal(true)}
                onNewGroup={() => setShowNewGroupModal(true)}
                onJoinGroup={() => setShowJoinGroupModal(true)}
                onConversationDeleted={(convId) => {
                  if (selectedConversation?.id === convId) {
                    setSelectedConversation(null);
                  }
                }}
              />
            )}

            {(currentTab === 'friends' || currentTab === 'requests') && (
              <FriendsScreen
                incomingRequests={incomingRequests}
                outgoingRequests={outgoingRequests}
                onBack={() => setCurrentTab('chats')}
                onOpenConversation={handleOpenConversation}
                onOpenProfile={(u) => setViewingProfileUser(u)}
              />
            )}

            {currentTab === 'calls' && (
              <CallHistoryScreen
                onBack={() => setCurrentTab('chats')}
                onOpenProfile={(u) => setViewingProfileUser(u)}
              />
            )}

            {currentTab === 'search' && (
              <SearchScreen
                onBack={() => setCurrentTab('chats')}
                onOpenConversation={handleOpenConversation}
                onOpenProfile={(u) => setViewingProfileUser(u)}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsScreen
                onBack={() => setCurrentTab('chats')}
                onOpenProfile={() => setShowSelfProfile(true)}
                onOpenRequests={() => setCurrentTab('friends')}
                pendingRequestsCount={pendingRequestsCount}
              />
            )}
          </div>

          {/* Column B: Active Chat Window or Empty State (Desktop) */}
          <div
            className="hidden md:flex flex-1 h-full flex-col"
            style={{ backgroundColor: theme.colors.surface }}
          >
            {selectedConversation ? (
              <ChatWindow
                conversation={selectedConversation}
                onBack={() => setSelectedConversation(null)}
                onOpenProfile={(u) => setViewingProfileUser(u)}
              />
            ) : (
              <div
                className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none"
                style={{ backgroundColor: theme.colors.background }}
              >
                <div
                  className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4 shadow-inner"
                  style={{ backgroundColor: theme.colors.lilac, color: theme.colors.primary }}
                >
                  <MessageSquare className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold">
                  Select a Conversation
                </h3>
                <p className="text-xs text-stone-400 max-w-sm mt-1">
                  Connect privately using end-to-end transport and permanent Duora IDs. No phone numbers required.
                </p>
                <button
                  onClick={() => setShowNewChatModal(true)}
                  className="mt-5 px-4 py-2 rounded-xl text-white text-xs font-bold transition shadow-md cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  Start New Chat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile View: Fullscreen Active Chat Window */}
        {selectedConversation && (
          <div className="md:hidden fixed inset-0 z-40 bg-white dark:bg-[#12111A] flex flex-col">
            <ChatWindow
              conversation={selectedConversation}
              onBack={() => setSelectedConversation(null)}
              onOpenProfile={(u) => setViewingProfileUser(u)}
            />
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {!selectedConversation && (
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
          }}
          unreadChatsCount={unreadChatsCount}
          friendsPendingCount={pendingRequestsCount}
        />
      )}

      {/* Modals & Overlays */}
      {showNewChatModal && (
        <NewChatModal
          onClose={() => setShowNewChatModal(false)}
          onOpenConversation={handleOpenConversation}
        />
      )}

      {showNewGroupModal && (
        <GroupCreateModal
          onClose={() => setShowNewGroupModal(false)}
          onGroupCreated={handleOpenConversation}
        />
      )}

      {showJoinGroupModal && (
        <GroupJoinModal
          onClose={() => setShowJoinGroupModal(false)}
          onGroupJoined={handleOpenConversation}
          onOpenCreateGroup={() => {
            setShowJoinGroupModal(false);
            setShowNewGroupModal(true);
          }}
        />
      )}

      {viewingProfileUser && (
        <ProfileModal
          user={viewingProfileUser}
          isSelf={viewingProfileUser.uid === profile?.uid}
          onClose={() => setViewingProfileUser(null)}
          onStartChat={async (target) => {
            setViewingProfileUser(null);
            if (!profile) return;
            try {
              const conv = await getOrCreateDirectConversation(profile, target, true);
              handleOpenConversation(conv);
            } catch (err) {
              console.error('Failed to open direct conversation:', err);
            }
          }}
        />
      )}

      {showSelfProfile && profile && (
        <ProfileModal
          user={profile}
          isSelf={true}
          onClose={() => setShowSelfProfile(false)}
        />
      )}

      {/* WebRTC Video & Audio Active Call Overlay */}
      <CallModal />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <DuoraApp />
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
