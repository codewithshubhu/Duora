import React, { useState, useEffect, useRef } from 'react';
import {
  Phone,
  Video,
  Search,
  MoreVertical,
  Paperclip,
  Smile,
  Mic,
  Send,
  Check,
  CheckCheck,
  ArrowLeft,
  X,
  Reply,
  Copy,
  Edit2,
  Trash2,
  Download,
  AlertCircle,
  Play,
  Pause,
  Image as ImageIcon,
  RotateCcw,
  Camera,
  LogOut,
  Loader2,
  Info,
  Plus,
  UserPlus,
  Ban,
  UserCheck
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCall } from '../../context/CallContext';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/config';
import {
  subscribeToMessages,
  subscribeToTyping,
  sendMessage,
  setTypingState,
  toggleMessageReaction,
  editMessage,
  unsendMessage,
  deleteMessage,
  markConversationAsRead,
  deleteConversation,
  leaveGroupConversation
} from '../../services/chatService';
import { getUserProfile, toggleBlockUser } from '../../services/userService';
import {
  sendMessageRequest,
  acceptMessageRequest,
  declineMessageRequest,
  cancelMessageRequest
} from '../../services/requestService';
import { compressImageToDataUrl } from '../../services/storageService';
import { sound } from '../../utils/sound';
import { VoiceRecorder } from './VoiceRecorder';
import { CameraModal } from './CameraModal';
import { MessageRow } from './MessageRow';
import { EmojiPickerModal } from './EmojiPickerModal';
import { ChatSettingsModal } from './ChatSettingsModal';
import { GroupSettingsModal } from './GroupSettingsModal';

interface ChatWindowProps {
  conversation: Conversation;
  onBack: () => void;
  onOpenProfile: (user: UserProfile) => void;
}

const QUICK_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔥', '🙏', '🎉'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  conversation,
  onBack,
  onOpenProfile
}) => {
  const { profile, refreshProfile } = useAuth();
  const { theme, wallpaper } = useTheme();
  const { initiateCall } = useCall();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<string | null>(null);
  const [selectedActionMessage, setSelectedActionMessage] = useState<Message | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [confirmUnsendMessageId, setConfirmUnsendMessageId] = useState<string | null>(null);
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState<string | null>(null);
  const [liveOtherUser, setLiveOtherUser] = useState<UserProfile | null>(null);

  // Modals & settings state
  const [showHeaderMenu, setShowHeaderMenu] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [emojiPickerTargetMessage, setEmojiPickerTargetMessage] = useState<Message | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveGroupConfirm, setShowLeaveGroupConfirm] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [isLeavingGroup, setIsLeavingGroup] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);

  // Friend request state for direct chat
  const [incomingReq, setIncomingReq] = useState<any>(null);
  const [outgoingReq, setOutgoingReq] = useState<any>(null);
  const [isReqLoading, setIsReqLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraCaptureRef = useRef<HTMLInputElement>(null);
  const audioElementsRef = useRef<Record<string, HTMLAudioElement>>({});
  const typingTimeoutRef = useRef<number | null>(null);

  // Identify other participant for 1-to-1 chats
  const otherParticipant = Object.values(conversation.participants || {}).find(
    p => p.uid !== profile?.uid
  );

  // Synchronize live profile info for the other participant
  useEffect(() => {
    if (otherParticipant?.uid) {
      getUserProfile(otherParticipant.uid)
        .then(u => {
          if (u) setLiveOtherUser(u);
        })
        .catch(console.error);
    }
  }, [otherParticipant?.uid]);

  // Subscribe to real-time friend request state between users for direct chats
  useEffect(() => {
    if (!profile || conversation.type !== 'direct' || !otherParticipant?.uid) return;
    const outRef = doc(db, 'messageRequests', `req_${profile.uid}_${otherParticipant.uid}`);
    const inRef = doc(db, 'messageRequests', `req_${otherParticipant.uid}_${profile.uid}`);

    const unsubOut = onSnapshot(outRef, (snap) => {
      setOutgoingReq(snap.exists() ? { ...snap.data(), id: snap.id } : null);
    }, () => {});

    const unsubIn = onSnapshot(inRef, (snap) => {
      setIncomingReq(snap.exists() ? { ...snap.data(), id: snap.id } : null);
    }, () => {});

    return () => {
      unsubOut();
      unsubIn();
    };
  }, [profile, conversation.type, otherParticipant?.uid]);

  const activeOtherDisplayName = liveOtherUser?.displayName || otherParticipant?.displayName || 'Duora Member';
  const activeOtherUsername = liveOtherUser?.username || otherParticipant?.username || 'user';
  const activeOtherDuoraId = liveOtherUser?.duoraId || otherParticipant?.duoraId || '';
  const activeOtherAvatar = liveOtherUser?.avatarUrl || otherParticipant?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user';

  // Privacy & Relationship statuses
  const isFriend = conversation.type === 'group' ||
    Boolean(profile?.friends?.includes(otherParticipant?.uid || '')) ||
    conversation.isAccepted ||
    incomingReq?.status === 'accepted' ||
    outgoingReq?.status === 'accepted';

  const isBlockedByMe = profile?.blockedUserIds?.includes(otherParticipant?.uid || '') || false;
  const isBlockedByOther = liveOtherUser?.blockedUserIds?.includes(profile?.uid || '') || false;
  const canCommunicate = isFriend && !isBlockedByMe && !isBlockedByOther;

  // Mark conversation as read on mount and update
  useEffect(() => {
    if (profile && conversation?.id) {
      markConversationAsRead(conversation.id, profile.uid);
    }
  }, [conversation?.id, profile]);

  // Subscribe to real-time messages
  useEffect(() => {
    if (!conversation?.id) return;

    const unsubscribe = subscribeToMessages(conversation.id, (msgs) => {
      setMessages(msgs);
      if (profile) {
        markConversationAsRead(conversation.id, profile.uid);
      }
    });

    return () => unsubscribe();
  }, [conversation?.id, profile]);

  // Subscribe to typing indicators
  useEffect(() => {
    if (!profile || !conversation?.id) return;
    const unsub = subscribeToTyping(conversation.id, profile.uid, (users) => {
      setTypingUsers(users);
    });
    return () => unsub();
  }, [conversation?.id, profile]);

  // Track if user is scrolled near bottom
  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  // Auto-scroll to newest message immediately when opening chat, then smooth scroll on new incoming messages
  useEffect(() => {
    initialScrollDoneRef.current = false;
    isNearBottomRef.current = true;
  }, [conversation?.id]);

  useEffect(() => {
    if (!messages.length) return;
    if (!initialScrollDoneRef.current) {
      initialScrollDoneRef.current = true;
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
      }
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    } else if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, conversation?.id]);

  // Compute ID of latest sent message so Sent/Seen only renders once
  const latestSentMessageId = React.useMemo(() => {
    if (!profile) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].senderId === profile.uid && !messages[i].isDeleted) {
        return messages[i].id;
      }
    }
    return null;
  }, [messages, profile?.uid]);

  // Typing debounce
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    if (!profile || !conversation?.id) return;

    setTypingState(conversation.id, profile.uid, true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      setTypingState(conversation.id, profile.uid, false);
    }, 2000);
  };

  // Send text message (with optional reply quote)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!inputText.trim() || !profile || !conversation?.id) return;

    const text = inputText.trim();
    setInputText('');

    const reply = replyingTo ? {
      id: replyingTo.id,
      senderId: replyingTo.senderId,
      senderName: replyingTo.senderName,
      content: replyingTo.content || (replyingTo.type === 'image' ? '📷 Photo' : 'Voice note'),
      type: replyingTo.type,
      mediaUrl: replyingTo.mediaUrl || null
    } : null;

    setReplyingTo(null);
    sound.playMessageSent();
    setTypingState(conversation.id, profile.uid, false);

    // Scroll to bottom immediately on user send
    isNearBottomRef.current = true;
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    try {
      await sendMessage(conversation.id, profile, text, 'text', { replyTo: reply });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  // Send voice note
  const handleVoiceSend = async (audioDataUrl: string, duration: number) => {
    if (!profile || !conversation?.id) return;
    setIsRecordingVoice(false);
    sound.playMessageSent();
    try {
      await sendMessage(conversation.id, profile, 'Voice note', 'audio', {
        mediaUrl: audioDataUrl,
        audioDuration: duration
      });
    } catch (err) {
      console.error('Failed to send voice note:', err);
    }
  };

  // Upload photo or file from phone with guaranteed compression
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !conversation?.id) return;

    const isImg = file.type.startsWith('image/');
    try {
      let dataUrl: string;
      if (isImg) {
        // Compress to 1024px max dimension, 0.82 JPEG (~40-60KB) to ensure reliable instant Firestore delivery
        dataUrl = await compressImageToDataUrl(file, 1024, 0.82);
      } else {
        dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });
      }

      sound.playMessageSent();
      await sendMessage(
        conversation.id,
        profile,
        isImg ? 'Photo' : file.name,
        isImg ? 'image' : 'file',
        {
          mediaUrl: dataUrl,
          mediaName: file.name,
          mediaSize: file.size,
          replyTo: replyingTo ? {
            id: replyingTo.id,
            senderId: replyingTo.senderId,
            senderName: replyingTo.senderName,
            content: replyingTo.content,
            type: replyingTo.type || 'text'
          } : undefined
        }
      );
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to upload file:', err);
    } finally {
      e.target.value = '';
    }
  };

  // Capture photo directly with camera
  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !conversation?.id) return;

    try {
      // Compress camera photo to ~50KB to guarantee it never exceeds Firestore document limits
      const dataUrl = await compressImageToDataUrl(file, 1024, 0.82);
      sound.playMessageSent();
      await sendMessage(
        conversation.id,
        profile,
        'Photo',
        'image',
        {
          mediaUrl: dataUrl,
          mediaName: `photo_${Date.now()}.jpg`,
          mediaSize: file.size,
          replyTo: replyingTo ? {
            id: replyingTo.id,
            senderId: replyingTo.senderId,
            senderName: replyingTo.senderName,
            content: replyingTo.content,
            type: replyingTo.type || 'text'
          } : undefined
        }
      );
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to send camera photo:', err);
    } finally {
      e.target.value = '';
    }
  };

  const handleCameraModalCapture = async (dataUrl: string) => {
    if (!profile || !conversation?.id) return;
    try {
      sound.playMessageSent();
      await sendMessage(
        conversation.id,
        profile,
        'Photo',
        'image',
        {
          mediaUrl: dataUrl,
          mediaName: `camera_${Date.now()}.jpg`,
          replyTo: replyingTo ? {
            id: replyingTo.id,
            senderId: replyingTo.senderId,
            senderName: replyingTo.senderName,
            content: replyingTo.content,
            type: replyingTo.type || 'text'
          } : undefined
        }
      );
      setReplyingTo(null);
    } catch (err) {
      console.error('Failed to send captured camera photo:', err);
    }
  };

  const handleDeleteChatSubmit = async () => {
    if (!profile || !conversation?.id) return;
    setIsDeletingChat(true);
    try {
      await deleteConversation(conversation.id, profile.uid);
      onBack();
    } catch (err) {
      console.error('Failed to delete chat:', err);
    } finally {
      setIsDeletingChat(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleLeaveGroupSubmit = async () => {
    if (!profile || !conversation?.id) return;
    setIsLeavingGroup(true);
    try {
      await leaveGroupConversation(conversation.id, profile);
      onBack();
    } catch (err) {
      console.error('Failed to leave group:', err);
    } finally {
      setIsLeavingGroup(false);
      setShowLeaveGroupConfirm(false);
    }
  };

  // Play / pause audio notes
  const handleAudioToggle = (msgId: string, url: string) => {
    if (playingAudioId === msgId) {
      audioElementsRef.current[msgId]?.pause();
      setPlayingAudioId(null);
    } else {
      if (playingAudioId && audioElementsRef.current[playingAudioId]) {
        audioElementsRef.current[playingAudioId].pause();
      }
      if (!audioElementsRef.current[msgId]) {
        const audio = new Audio(url);
        audio.onended = () => setPlayingAudioId(null);
        audioElementsRef.current[msgId] = audio;
      }
      audioElementsRef.current[msgId].play();
      setPlayingAudioId(msgId);
    }
  };

  // Save edited message
  const handleEditSubmit = async (msgId: string) => {
    if (!editContent.trim() || !profile || !conversation?.id) return;
    try {
      await editMessage(conversation.id, msgId, editContent, profile.uid);
      setEditingMessageId(null);
      setEditContent('');
      setSelectedActionMessage(null);
    } catch (err) {
      console.error('Failed to edit message:', err);
    }
  };

  // Unsend message for everyone
  const handleConfirmUnsend = async (msgId: string) => {
    if (!conversation?.id || !profile) return;
    try {
      await unsendMessage(conversation.id, msgId, profile.uid);
      setConfirmUnsendMessageId(null);
      setSelectedActionMessage(null);
    } catch (err) {
      console.error('Failed to unsend message:', err);
    }
  };

  // Delete message
  const handleConfirmDelete = async (msgId: string) => {
    if (!conversation?.id || !profile) return;
    try {
      await deleteMessage(conversation.id, msgId, profile.uid);
      setConfirmDeleteMessageId(null);
      setSelectedActionMessage(null);
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => (m.content || '').toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  // Chat Wallpaper background styling
  const getWallpaperStyle = () => {
    switch (wallpaper) {
      case 'constellation':
        return {
          backgroundImage: 'radial-gradient(rgba(142, 120, 255, 0.25) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        };
      case 'geometric':
        return {
          backgroundImage: 'linear-gradient(to right, rgba(128,128,128,0.1) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.1) 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        };
      case 'waves':
        return {
          backgroundImage: 'radial-gradient(ellipse 80% 80% at 50% -20%, rgba(112,87,232,0.18), transparent)',
        };
      case 'dots':
        return {
          backgroundImage: 'radial-gradient(rgba(112, 87, 232, 0.2) 1.5px, transparent 1.5px)',
          backgroundSize: '16px 16px'
        };
      default:
        return {};
    }
  };

  return (
    <div
      className="flex flex-col h-full relative overflow-hidden"
      style={{ backgroundColor: theme.colors.background, color: theme.colors.text }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b z-10 backdrop-blur-md shadow-xs"
        style={{
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onBack}
            className="p-1.5 rounded-full hover:opacity-80 md:hidden cursor-pointer"
            style={{ color: theme.colors.text }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div
            onClick={() => {
              if (conversation.type === 'direct') {
                setShowChatSettings(true);
              } else {
                setShowGroupSettings(true);
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition min-w-0"
            title="Open Chat Settings"
          >
            <div className="relative shrink-0">
              <img
                src={
                  conversation.type === 'group'
                    ? (conversation.groupAvatar || 'https://api.dicebear.com/7.x/identicon/svg?seed=group')
                    : activeOtherAvatar
                }
                alt="Avatar"
                className="w-10 h-10 rounded-full object-cover border shadow-xs"
                style={{ borderColor: theme.colors.primary }}
              />
              {conversation.type === 'direct' && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white dark:border-[#1A1826]" />
              )}
            </div>

            <div className="flex flex-col min-w-0 text-left">
              <span className="font-bold text-sm leading-tight" style={{ color: theme.colors.text }}>
                {conversation.type === 'group' ? conversation.groupName : activeOtherDisplayName}
              </span>
              <div className="flex items-center text-xs mt-0.5" style={{ color: theme.colors.textMuted }}>
                {conversation.type === 'direct' ? (
                  <span>@{activeOtherUsername}</span>
                ) : (
                  <span>{conversation.participantIds.length} members</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {conversation.type === 'direct' && otherParticipant && canCommunicate && (
            <>
              <button
                type="button"
                onClick={() => {
                  const targetUser: UserProfile = liveOtherUser || {
                    uid: otherParticipant.uid,
                    duoraId: otherParticipant.duoraId,
                    username: otherParticipant.username,
                    usernameLower: otherParticipant.username.toLowerCase(),
                    displayName: otherParticipant.displayName,
                    avatarUrl: otherParticipant.avatarUrl,
                    bio: otherParticipant.bio || '',
                    isDiscoverable: true,
                    showOnlineStatus: true,
                    showLastSeen: true,
                    readReceipts: true,
                  };
                  initiateCall(targetUser, 'audio');
                }}
                className="p-2.5 rounded-xl hover:opacity-80 transition cursor-pointer"
                style={{ color: theme.colors.primary }}
                title="Voice Call"
              >
                <Phone className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => {
                  const targetUser: UserProfile = liveOtherUser || {
                    uid: otherParticipant.uid,
                    duoraId: otherParticipant.duoraId,
                    username: otherParticipant.username,
                    usernameLower: otherParticipant.username.toLowerCase(),
                    displayName: otherParticipant.displayName,
                    avatarUrl: otherParticipant.avatarUrl,
                    bio: otherParticipant.bio || '',
                    isDiscoverable: true,
                    showOnlineStatus: true,
                    showLastSeen: true,
                    readReceipts: true,
                  };
                  initiateCall(targetUser, 'video');
                }}
                className="p-2.5 rounded-xl hover:opacity-80 transition cursor-pointer"
                style={{ color: theme.colors.primary }}
                title="Video Call"
              >
                <Video className="w-5 h-5" />
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsSearching(!isSearching)}
            className="p-2.5 rounded-xl hover:opacity-80 transition cursor-pointer"
            style={{ color: theme.colors.textMuted }}
            title="Search Messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Options Dropdown Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowHeaderMenu(!showHeaderMenu)}
              className="p-2.5 rounded-xl hover:opacity-80 transition cursor-pointer"
              style={{ color: theme.colors.textMuted }}
              title="Chat Options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {showHeaderMenu && (
              <div
                className="absolute right-0 mt-2 w-52 rounded-2xl shadow-xl border p-1.5 z-50 animate-in fade-in zoom-in-95"
                style={{
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  color: theme.colors.text
                }}
              >
                {conversation.type === 'direct' && otherParticipant && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      onOpenProfile(liveOtherUser || {
                        uid: otherParticipant.uid,
                        duoraId: otherParticipant.duoraId,
                        username: otherParticipant.username,
                        usernameLower: otherParticipant.username.toLowerCase(),
                        displayName: otherParticipant.displayName,
                        avatarUrl: otherParticipant.avatarUrl,
                        bio: otherParticipant.bio || '',
                        isDiscoverable: true,
                        showOnlineStatus: true,
                        showLastSeen: true,
                        readReceipts: true,
                      });
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                  >
                    <Info className="w-4 h-4 text-stone-400" />
                    <span>View Contact Profile</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    setIsSearching(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition cursor-pointer"
                >
                  <Search className="w-4 h-4 text-stone-400" />
                  <span>Search in Conversation</span>
                </button>

                <div className="my-1 border-t" style={{ borderColor: theme.colors.border }} />

                {conversation.type === 'group' && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowHeaderMenu(false);
                      setShowLeaveGroupConfirm(true);
                    }}
                    className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-amber-500 hover:bg-amber-500/10 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Leave Group</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowHeaderMenu(false);
                    setShowDeleteConfirm(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs flex items-center gap-2 text-red-500 hover:bg-red-500/10 transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Chat</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-chat search bar */}
      {isSearching && (
        <div
          className="px-4 py-2 border-b flex items-center gap-2"
          style={{ backgroundColor: theme.colors.surfaceHover, borderColor: theme.colors.border }}
        >
          <Search className="w-4 h-4" style={{ color: theme.colors.textMuted }} />
          <input
            type="text"
            placeholder="Search messages in this chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent text-xs focus:outline-none"
            style={{ color: theme.colors.text }}
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="hover:opacity-75">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => { setIsSearching(false); setSearchQuery(''); }}
            className="text-xs font-bold"
            style={{ color: theme.colors.primary }}
          >
            Done
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
        style={getWallpaperStyle()}
      >
        {filteredMessages.map((msg) => {
          const isSender = msg.senderId === profile?.uid;
          const isRead = (msg.readBy?.length || 0) > 1;

          return (
            <MessageRow
              key={msg.id}
              msg={msg}
              isSender={isSender}
              isRead={isRead}
              isLatestSentMessage={msg.id === latestSentMessageId}
              theme={theme}
              onReply={(m) => setReplyingTo(m)}
              onActionClick={(m) => setSelectedActionMessage(selectedActionMessage?.id === m.id ? null : m)}
              onImageClick={(url) => setPreviewImage(url)}
              onAudioToggle={(id, url) => handleAudioToggle(id, url)}
              isPlayingAudio={playingAudioId === msg.id}
              editingMessageId={editingMessageId}
              editContent={editContent}
              setEditContent={setEditContent}
              onEditSubmit={(id) => handleEditSubmit(id)}
              onCancelEdit={() => setEditingMessageId(null)}
              onReact={(emoji) => {
                if (profile) toggleMessageReaction(conversation.id, msg.id, emoji, profile.uid);
              }}
              onOpenEmojiPicker={(m) => setEmojiPickerTargetMessage(m)}
              currentUserId={profile?.uid}
              showSenderName={conversation.type === 'group' && !isSender}
            />
          );
        })}
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-xs italic py-1 text-stone-400">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7057E8] animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7057E8] animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#7057E8] animate-bounce [animation-delay:0.4s]" />
            </div>
            <span>Typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Mobile/Touch Message Action Bottom Sheet */}
      {selectedActionMessage && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-3 animate-in fade-in"
          onClick={() => setSelectedActionMessage(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-4 shadow-2xl border space-y-3 animate-in slide-in-from-bottom-4"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}
          >
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: theme.colors.border }}>
              <span className="text-xs font-bold">Message Options</span>
              <button onClick={() => setSelectedActionMessage(null)}>
                <X className="w-4 h-4 text-stone-400" />
              </button>
            </div>

            {/* Quick emoji reactions */}
            <div className="flex items-center justify-around py-1">
              {QUICK_EMOJIS.slice(0, 5).map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    if (profile) toggleMessageReaction(conversation.id, selectedActionMessage.id, emoji, profile.uid);
                    setSelectedActionMessage(null);
                  }}
                  className="text-2xl hover:scale-125 transition transform"
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  const targetMsg = selectedActionMessage;
                  setSelectedActionMessage(null);
                  setEmojiPickerTargetMessage(targetMsg);
                }}
                className="w-9 h-9 rounded-full border flex items-center justify-center text-stone-500 hover:opacity-80 transition cursor-pointer"
                style={{ borderColor: theme.colors.border, backgroundColor: theme.colors.background }}
                title="All emojis"
              >
                <Plus className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1 pt-1">
              {/* Reply */}
              <button
                type="button"
                onClick={() => {
                  setReplyingTo(selectedActionMessage);
                  setSelectedActionMessage(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:opacity-80 text-xs font-medium"
              >
                <Reply className="w-4 h-4" style={{ color: theme.colors.primary }} />
                <span>Reply to message</span>
              </button>

              {/* Copy */}
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(selectedActionMessage.content || '');
                  setSelectedActionMessage(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:opacity-80 text-xs font-medium"
              >
                <Copy className="w-4 h-4" />
                <span>Copy text</span>
              </button>

              {/* Edit (if sender and text) */}
              {selectedActionMessage.senderId === profile?.uid && !selectedActionMessage.isDeleted && selectedActionMessage.type === 'text' && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingMessageId(selectedActionMessage.id);
                    setEditContent(selectedActionMessage.content || '');
                    setSelectedActionMessage(null);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:opacity-80 text-xs font-medium"
                >
                  <Edit2 className="w-4 h-4" style={{ color: theme.colors.primary }} />
                  <span>Edit message</span>
                </button>
              )}

              {/* Unsend for everyone (if sender) */}
              {selectedActionMessage.senderId === profile?.uid && !selectedActionMessage.isDeleted && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmUnsendMessageId(selectedActionMessage.id);
                    setSelectedActionMessage(null);
                  }}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Unsend for everyone</span>
                </button>
              )}

              {/* Delete message */}
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteMessageId(selectedActionMessage.id);
                  setSelectedActionMessage(null);
                }}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 text-xs font-medium"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete message</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Unsend */}
      {confirmUnsendMessageId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center space-y-4"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-500 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Unsend Message?</h3>
              <p className="text-xs text-stone-400 mt-1">
                This will remove the message for all participants in this chat.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmUnsendMessageId(null)}
                className="flex-1 py-2.5 rounded-xl border text-xs font-semibold"
                style={{ borderColor: theme.colors.border }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmUnsend(confirmUnsendMessageId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition"
              >
                Unsend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Delete */}
      {confirmDeleteMessageId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center space-y-4"
            style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border, color: theme.colors.text }}
          >
            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-500 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-base">Delete Message?</h3>
              <p className="text-xs text-stone-400 mt-1">
                Are you sure you want to permanently delete this message?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setConfirmDeleteMessageId(null)}
                className="flex-1 py-2.5 rounded-xl border text-xs font-semibold"
                style={{ borderColor: theme.colors.border }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfirmDelete(confirmDeleteMessageId)}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-md transition"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quoted reply banner above composer */}
      {replyingTo && (
        <div
          className="px-4 py-2 border-t flex items-center justify-between text-xs"
          style={{
            backgroundColor: theme.colors.lilac,
            borderColor: theme.colors.border,
            color: theme.colors.text
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <Reply className="w-4 h-4 shrink-0" style={{ color: theme.colors.primary }} />
            <div className="min-w-0">
              <span className="font-bold block text-[11px]" style={{ color: theme.colors.primary }}>
                Replying to {replyingTo.senderId === profile?.uid ? 'yourself' : replyingTo.senderName}
              </span>
              <span className="truncate block text-[11px] opacity-75">
                {replyingTo.content || (replyingTo.type === 'image' ? 'Photo' : 'Voice note')}
              </span>
            </div>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 hover:opacity-75"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Barrier when user is blocked or friend request is pending */}
      {conversation.type === 'direct' && !canCommunicate ? (
        <div
          className="p-4 border-t z-10 flex flex-col items-center justify-center text-center space-y-2.5"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }}
        >
          {isBlockedByMe ? (
            <>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                You blocked this user. Unblock to send messages and make calls.
              </p>
              <button
                type="button"
                onClick={async () => {
                  if (!profile || !otherParticipant) return;
                  await toggleBlockUser(profile.uid, otherParticipant.uid, false);
                  refreshProfile();
                }}
                className="px-4 py-1.5 rounded-xl border text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                style={{ borderColor: theme.colors.border, color: theme.colors.text }}
              >
                Unblock User
              </button>
            </>
          ) : isBlockedByOther ? (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              You cannot message or call this user.
            </p>
          ) : incomingReq && incomingReq.status === 'pending' ? (
            <>
              <p className="text-xs font-medium" style={{ color: theme.colors.text }}>
                <strong className="font-semibold">{activeOtherDisplayName}</strong> sent you a friend request. Accept to start chatting and calling.
              </p>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  disabled={isReqLoading}
                  onClick={async () => {
                    setIsReqLoading(true);
                    await declineMessageRequest(incomingReq.id);
                    setIsReqLoading(false);
                  }}
                  className="px-4 py-2 rounded-xl border text-xs font-semibold hover:opacity-80 transition cursor-pointer"
                  style={{ borderColor: theme.colors.border, color: theme.colors.text }}
                >
                  Decline
                </button>
                <button
                  type="button"
                  disabled={isReqLoading}
                  onClick={async () => {
                    setIsReqLoading(true);
                    if (profile && otherParticipant) {
                      const senderUser: UserProfile = liveOtherUser || {
                        uid: otherParticipant.uid,
                        duoraId: otherParticipant.duoraId,
                        username: otherParticipant.username,
                        usernameLower: otherParticipant.username.toLowerCase(),
                        displayName: otherParticipant.displayName,
                        avatarUrl: otherParticipant.avatarUrl,
                        bio: otherParticipant.bio || '',
                        isDiscoverable: true,
                        showOnlineStatus: true,
                        showLastSeen: true,
                        readReceipts: true,
                      };
                      await acceptMessageRequest(incomingReq, profile, senderUser);
                      refreshProfile();
                    }
                    setIsReqLoading(false);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 transition cursor-pointer"
                  style={{ backgroundColor: theme.colors.primary }}
                >
                  Accept
                </button>
              </div>
            </>
          ) : outgoingReq && outgoingReq.status === 'pending' ? (
            <>
              <p className="text-xs font-medium" style={{ color: theme.colors.text }}>
                Friend request sent to <strong className="font-semibold">{activeOtherDisplayName}</strong>. You can chat once they accept.
              </p>
              <button
                type="button"
                disabled={isReqLoading}
                onClick={async () => {
                  setIsReqLoading(true);
                  await cancelMessageRequest(outgoingReq.id);
                  setIsReqLoading(false);
                }}
                className="px-4 py-1.5 rounded-xl border text-xs font-medium text-stone-500 hover:text-red-500 hover:border-red-300 transition cursor-pointer"
                style={{ borderColor: theme.colors.border }}
              >
                Cancel Request
              </button>
            </>
          ) : (
            <>
              <p className="text-xs font-medium" style={{ color: theme.colors.text }}>
                Send a friend request to <strong className="font-semibold">{activeOtherDisplayName}</strong> to start chatting and calling.
              </p>
              <button
                type="button"
                disabled={isReqLoading}
                onClick={async () => {
                  if (!profile || !otherParticipant) return;
                  setIsReqLoading(true);
                  const targetUser: UserProfile = liveOtherUser || {
                    uid: otherParticipant.uid,
                    duoraId: otherParticipant.duoraId,
                    username: otherParticipant.username,
                    usernameLower: otherParticipant.username.toLowerCase(),
                    displayName: otherParticipant.displayName,
                    avatarUrl: otherParticipant.avatarUrl,
                    bio: otherParticipant.bio || '',
                    isDiscoverable: true,
                    showOnlineStatus: true,
                    showLastSeen: true,
                    readReceipts: true,
                  };
                  await sendMessageRequest(profile, targetUser);
                  setIsReqLoading(false);
                }}
                className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md hover:opacity-90 transition cursor-pointer inline-flex items-center gap-2"
                style={{ backgroundColor: theme.colors.primary }}
              >
                <UserPlus className="w-4 h-4" />
                <span>Send Friend Request</span>
              </button>
            </>
          )}
        </div>
      ) : isRecordingVoice ? (
        <VoiceRecorder
          onSend={handleVoiceSend}
          onCancel={() => setIsRecordingVoice(false)}
        />
      ) : (
        /* Standard Composer Dock */
        <form
          onSubmit={handleSendMessage}
          className="p-3 border-t flex items-center gap-2 z-10"
          style={{
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border
          }}
        >
          {/* File input (images, photos, documents) */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*,.pdf,.doc,.docx"
            className="hidden"
          />

          {/* Native Mobile Camera capture fallback */}
          <input
            type="file"
            ref={cameraCaptureRef}
            onChange={handleFileUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl hover:opacity-80 transition cursor-pointer"
            style={{ color: theme.colors.textMuted }}
            title="Attach Photo or File"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowCameraModal(true)}
            className="p-2.5 rounded-xl hover:opacity-80 transition cursor-pointer"
            style={{ color: theme.colors.textMuted }}
            title="Take Photo"
          >
            <Camera className="w-5 h-5" />
          </button>

          <input
            type="text"
            placeholder="Type a message..."
            value={inputText}
            onChange={handleInputChange}
            className="flex-1 py-2.5 px-3.5 text-xs rounded-xl border focus:outline-none focus:ring-2 shadow-2xs"
            style={{
              backgroundColor: theme.colors.background,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          />

          {inputText.trim() ? (
            <button
              type="submit"
              className="p-2.5 rounded-xl text-white shadow-md hover:opacity-90 transition active:scale-95 cursor-pointer"
              style={{ backgroundColor: theme.colors.primary }}
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setIsRecordingVoice(true)}
              className="p-2.5 rounded-xl text-white shadow-md hover:opacity-90 transition active:scale-95 cursor-pointer"
              style={{ backgroundColor: theme.colors.primary }}
              title="Record Voice Note"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}
        </form>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <button
            onClick={() => setPreviewImage(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/20 text-white hover:bg-white/30"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewImage}
            alt="Enlarged"
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}

      {/* In-app Camera Modal for taking and sending live photos */}
      {showCameraModal && (
        <CameraModal
          onCapture={handleCameraModalCapture}
          onClose={() => setShowCameraModal(false)}
        />
      )}

      {/* Delete Chat Confirmation Modal */}
      {showDeleteConfirm && (
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
              Are you sure you want to delete this chat with{' '}
              <strong className="text-stone-800 dark:text-stone-200">
                {conversation.type === 'group' ? conversation.groupName : activeOtherDisplayName}
              </strong>
              ? This will remove the conversation from your messages.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeletingChat}
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
                onClick={handleDeleteChatSubmit}
                disabled={isDeletingChat}
                className="flex-1 py-2.5 rounded-2xl bg-red-500 hover:bg-red-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                {isDeletingChat ? (
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

      {/* Leave Group Confirmation Modal */}
      {showLeaveGroupConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in select-none">
          <div
            className="w-full max-w-sm rounded-3xl p-6 shadow-2xl border text-center animate-in zoom-in-95"
            style={{
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text
            }}
          >
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base mb-1.5">Leave Group?</h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-6 leading-relaxed">
              Are you sure you want to leave{' '}
              <strong className="text-stone-800 dark:text-stone-200">
                {conversation.groupName || 'this group'}
              </strong>
              ? You will no longer receive messages from this group unless you rejoin.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveGroupConfirm(false)}
                disabled={isLeavingGroup}
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
                onClick={handleLeaveGroupSubmit}
                disabled={isLeavingGroup}
                className="flex-1 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-60"
              >
                {isLeavingGroup ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Leaving...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Leave</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Instagram-style Chat Settings Modal */}
      {conversation.type === 'direct' && otherParticipant && (
        <ChatSettingsModal
          isOpen={showChatSettings}
          onClose={() => setShowChatSettings(false)}
          user={liveOtherUser || {
            uid: otherParticipant.uid,
            duoraId: otherParticipant.duoraId,
            username: otherParticipant.username,
            usernameLower: otherParticipant.username.toLowerCase(),
            displayName: otherParticipant.displayName,
            avatarUrl: otherParticipant.avatarUrl,
            bio: otherParticipant.bio || '',
            isDiscoverable: true,
            showOnlineStatus: true,
            showLastSeen: true,
            readReceipts: true,
          }}
          onOpenProfile={(u) => {
            setShowChatSettings(false);
            onOpenProfile(u);
          }}
          onSearchInChat={() => {
            setShowChatSettings(false);
            setIsSearching(true);
          }}
          onDeleteChat={() => {
            setShowChatSettings(false);
            setShowDeleteConfirm(true);
          }}
        />
      )}

      {/* Group Settings Modal */}
      {conversation.type === 'group' && (
        <GroupSettingsModal
          isOpen={showGroupSettings}
          onClose={() => setShowGroupSettings(false)}
          conversation={conversation}
          onOpenProfile={onOpenProfile}
          onLeaveGroup={() => {
            setShowGroupSettings(false);
            setShowLeaveGroupConfirm(true);
          }}
        />
      )}

      {/* Full Emoji Picker Modal for reactions */}
      {emojiPickerTargetMessage && (
        <EmojiPickerModal
          onSelectEmoji={(emoji) => {
            if (profile) toggleMessageReaction(conversation.id, emojiPickerTargetMessage.id, emoji, profile.uid);
            setEmojiPickerTargetMessage(null);
          }}
          onClose={() => setEmojiPickerTargetMessage(null)}
        />
      )}
    </div>
  );
};
