export interface UserProfile {
  uid: string;
  duoraId: string; // Immutable, e.g. DUR-9F4K-3L7P
  username: string; // e.g. alex_rivers
  usernameLower: string; // for searching
  displayName: string;
  avatarUrl: string;
  bio?: string;
  isDiscoverable: boolean;
  showOnlineStatus: boolean;
  showLastSeen: boolean;
  readReceipts: boolean;
  isOnline?: boolean;
  themeId?: string;
  wallpaper?: string;
  accentColor?: string;
  createdAt?: any;
  updatedAt?: any;
  lastSeenAt?: any;
}

export interface UserPrivateInfo {
  email: string;
  emailVerified: boolean;
  fcmToken?: string;
  blockedUserIds: string[];
  updatedAt?: any;
}

export interface ConversationParticipant {
  uid: string;
  displayName: string;
  username: string;
  duoraId: string;
  avatarUrl: string;
  bio?: string;
  role?: 'admin' | 'member';
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  participantIds: string[];
  participants: Record<string, ConversationParticipant>;
  lastMessage?: string;
  lastMessageSenderId?: string;
  lastMessageTimestamp?: any;
  unreadCount?: Record<string, number>;
  isAccepted: boolean;
  groupName?: string;
  groupAvatar?: string;
  groupDescription?: string;
  groupAdminIds?: string[];
  hiddenFor?: string[]; // IDs of users who deleted this chat from their list
  createdAt?: any;
  updatedAt?: any;
}

export type MessageType = 'text' | 'image' | 'audio' | 'file';

export interface MessageReply {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  type?: MessageType;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  type: MessageType;
  mediaUrl?: string;
  mediaName?: string;
  mediaSize?: number;
  audioDuration?: number;
  replyTo?: MessageReply;
  reactions?: Record<string, string[]>; // emoji -> array of uids
  isEdited?: boolean;
  editedAt?: any;
  isDeleted?: boolean;
  deletedFor?: string[]; // uids who deleted for themselves
  readBy?: string[];
  createdAt?: any;
  pending?: boolean;
  failed?: boolean;
}

export interface MessageRequest {
  id: string;
  senderId: string;
  receiverId: string;
  senderDuoraId: string;
  senderUsername: string;
  senderDisplayName: string;
  senderAvatar: string;
  receiverDuoraId: string;
  previewMessage: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: any;
  updatedAt?: any;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';

export interface CallRecord {
  id: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  callerDuoraId: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar: string;
  receiverDuoraId: string;
  type: CallType;
  status: CallStatus;
  duration?: number;
  offer?: { type: string; sdp: string };
  answer?: { type: string; sdp: string };
  createdAt?: any;
  endedAt?: any;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  type: 'message_request' | 'request_accepted' | 'call_missed' | 'alert';
  title: string;
  body: string;
  read: boolean;
  link?: string;
  createdAt?: any;
}

export interface ThemeConfig {
  id: string;
  name: string;
  isDark: boolean;
  colors: {
    primary: string;
    primaryHover: string;
    background: string;
    surface: string;
    surfaceHover: string;
    card: string;
    border: string;
    text: string;
    textMuted: string;
    lilac: string;
    accent: string;
    bubbleSender: string;
    bubbleSenderText: string;
    bubbleReceiver: string;
    bubbleReceiverText: string;
  };
}
