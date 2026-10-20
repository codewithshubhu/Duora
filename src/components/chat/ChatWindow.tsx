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
  RotateCcw
} from 'lucide-react';
import { Conversation, Message, UserProfile } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { useCall } from '../../context/CallContext';
import {
  subscribeToMessages,
  subscribeToTyping,
  sendMessage,
  setTypingState,
  toggleMessageReaction,
  editMessage,
  unsendMessage,
  deleteMessage,
  markConversationAsRead
} from '../../services/chatService';
import { getUserProfile } from '../../services/userService';
import { sound } from '../../utils/sound';
import { VoiceRecorder } from './VoiceRecorder';

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
  const { profile } = useAuth();
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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const activeOtherDisplayName = liveOtherUser?.displayName || otherParticipant?.displayName || 'Duora Member';
  const activeOtherUsername = liveOtherUser?.username || otherParticipant?.username || 'user';
  const activeOtherDuoraId = liveOtherUser?.duoraId || otherParticipant?.duoraId || '';
  const activeOtherAvatar = liveOtherUser?.avatarUrl || otherParticipant?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user';

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
    // Within 120px is considered near bottom
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 120;
  };

  // Scroll to bottom ONLY if already near bottom (preserves reading position when scrolling up)
  useEffect(() => {
    if (isNearBottomRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

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

  // Upload photo or file from phone
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !conversation?.id) return;

    const isImg = file.type.startsWith('image/');
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      sound.playMessageSent();
      try {
        await sendMessage(
          conversation.id,
          profile,
          isImg ? 'Photo' : file.name,
          isImg ? 'image' : 'file',
          {
            mediaUrl: dataUrl,
            mediaName: file.name,
            mediaSize: file.size
          }
        );
      } catch (err) {
        console.error('Failed to upload file:', err);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
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
              if (liveOtherUser) {
                onOpenProfile(liveOtherUser);
              } else if (otherParticipant) {
                onOpenProfile({
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
              }
            }}
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 transition min-w-0"
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

            <div className="flex flex-col min-w-0">
              <span className="font-bold text-sm truncate" style={{ color: theme.colors.text }}>
                {conversation.type === 'group' ? conversation.groupName : activeOtherDisplayName}
              </span>
              <div className="flex items-center gap-1.5 text-xs" style={{ color: theme.colors.textMuted }}>
                {conversation.type === 'direct' ? (
                  <>
                    <span className="font-mono text-[11px] font-bold" style={{ color: theme.colors.primary }}>
                      {activeOtherDuoraId}
                    </span>
                    <span>•</span>
                    <span className="truncate">@{activeOtherUsername}</span>
                  </>
                ) : (
                  <span>{conversation.participantIds.length} members</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {conversation.type === 'direct' && otherParticipant && (
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
        {/* Security assurance banner */}
        <div className="flex justify-center my-2">
          <div
            className="px-4 py-1.5 rounded-full border text-[11px] text-center max-w-sm shadow-2xs"
            style={{
              backgroundColor: theme.colors.lilac,
              borderColor: theme.colors.border,
              color: theme.colors.primary
            }}
          >
            🔒 End-to-end transport with verified Duora identity keys.
          </div>
        </div>

        {filteredMessages.map((msg) => {
          const isSender = msg.senderId === profile?.uid;
          const isRead = (msg.readBy?.length || 0) > 1;

          return (
            <div
              key={msg.id}
              className={`flex flex-col group relative ${isSender ? 'items-end' : 'items-start'}`}
            >
              {/* Group sender tag */}
              {conversation.type === 'group' && !isSender && (
                <span className="text-[10px] font-semibold ml-1 mb-1" style={{ color: theme.colors.textMuted }}>
                  {msg.senderName}
                </span>
              )}

              <div className="relative max-w-[85%] sm:max-w-[70%]">
                
                {/* Quoted Reply Preview */}
                {msg.replyTo && (
                  <div
                    className="text-xs px-3 py-1.5 mb-1 rounded-xl border-l-4 shadow-2xs opacity-90"
                    style={{
                      borderLeftColor: theme.colors.primary,
                      backgroundColor: isSender ? 'rgba(0,0,0,0.15)' : theme.colors.surfaceHover,
                      color: isSender ? '#FFFFFF' : theme.colors.text
                    }}
                  >
                    <span className="font-bold block text-[10px]" style={{ color: isSender ? '#FFFFFF' : theme.colors.primary }}>
                      {msg.replyTo.senderName}
                    </span>
                    <span className="line-clamp-1 italic text-[11px]">
                      {msg.replyTo.content}
                    </span>
                  </div>
                )}

                {/* Message Bubble */}
                <div
                  onClick={() => setSelectedActionMessage(selectedActionMessage?.id === msg.id ? null : msg)}
                  className={`p-3 rounded-2xl shadow-sm text-sm relative break-words cursor-pointer transition ${
                    isSender
                      ? 'rounded-br-xs'
                      : 'rounded-bl-xs border'
                  }`}
                  style={{
                    backgroundColor: isSender ? theme.colors.bubbleSender : theme.colors.bubbleReceiver,
                    color: isSender ? theme.colors.bubbleSenderText : theme.colors.bubbleReceiverText,
                    borderColor: isSender ? 'transparent' : theme.colors.border
                  }}
                >
                  {/* Deleted message indicator */}
                  {msg.isDeleted ? (
                    <span className="italic text-xs opacity-70">
                      🚫 This message was unsent
                    </span>
                  ) : editingMessageId === msg.id ? (
                    <div className="flex flex-col gap-2 min-w-[220px]">
                      <input
                        type="text"
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg bg-white text-stone-900 border focus:outline-none"
                        autoFocus
                      />
                      <div className="flex justify-end gap-1.5 text-[11px]">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setEditingMessageId(null); }}
                          className="px-2.5 py-1 rounded bg-black/20 text-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleEditSubmit(msg.id); }}
                          className="px-3 py-1 rounded bg-white text-[#7057E8] font-bold shadow"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Photo Image */}
                      {msg.type === 'image' && msg.mediaUrl && (
                        <div
                          className="mb-2 rounded-xl overflow-hidden cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); setPreviewImage(msg.mediaUrl || null); }}
                        >
                          <img
                            src={msg.mediaUrl}
                            alt="Attachment"
                            className="max-h-64 w-full object-cover hover:scale-102 transition duration-200"
                          />
                        </div>
                      )}

                      {/* Voice Note Audio */}
                      {msg.type === 'audio' && msg.mediaUrl && (
                        <div className="flex items-center gap-3 py-1 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => handleAudioToggle(msg.id, msg.mediaUrl!)}
                            className={`p-2.5 rounded-full shadow transition hover:scale-105 cursor-pointer ${
                              isSender ? 'bg-white text-[#7057E8]' : 'bg-[#7057E8] text-white'
                            }`}
                          >
                            {playingAudioId === msg.id ? (
                              <Pause className="w-4 h-4 fill-current" />
                            ) : (
                              <Play className="w-4 h-4 fill-current" />
                            )}
                          </button>
                          <div className="flex flex-col flex-1">
                            <div className="h-1.5 rounded-full bg-current opacity-30 w-full" />
                            <span className="text-[10px] mt-1 opacity-80 font-mono">
                              Voice note {msg.audioDuration ? `(${msg.audioDuration}s)` : ''}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* File Attachment */}
                      {msg.type === 'file' && (
                        <a
                          href={msg.mediaUrl}
                          download={msg.mediaName || 'file'}
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center gap-2 p-2 rounded-xl mb-1 ${
                            isSender ? 'bg-white/10' : 'bg-stone-100 dark:bg-stone-800'
                          } hover:opacity-90 transition`}
                        >
                          <Paperclip className="w-4 h-4 shrink-0" />
                          <span className="truncate flex-1 text-xs">{msg.mediaName || 'Attachment'}</span>
                          <Download className="w-3.5 h-3.5 shrink-0" />
                        </a>
                      )}

                      {/* Text Content */}
                      {msg.content && msg.type === 'text' && (
                        <p className="whitespace-pre-wrap leading-relaxed text-[13.5px]">
                          {msg.content}
                        </p>
                      )}

                      {/* Edited flag */}
                      {msg.isEdited && (
                        <span className="text-[9px] opacity-65 ml-1.5 italic">(edited)</span>
                      )}
                    </>
                  )}

                  {/* Timestamp & Read Status Checkmark */}
                  <div className={`flex items-center justify-end gap-1 mt-1 text-[10px] ${
                    isSender ? 'text-white/80' : 'opacity-70'
                  }`}>
                    <span>
                      {msg.createdAt?.toDate
                        ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(msg.createdAt.toDate())
                        : 'Just now'}
                    </span>
                    {isSender && (
                      isRead ? (
                        <span title="Read by recipient"><CheckCheck className="w-3.5 h-3.5 text-white stroke-[2.5]" /></span>
                      ) : (
                        <span title="Sent"><Check className="w-3.5 h-3.5 text-white/70" /></span>
                      )
                    )}
                  </div>
                </div>

                {/* Reactions badge */}
                {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {Object.entries(msg.reactions).map(([emoji, uids]) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (profile) toggleMessageReaction(conversation.id, msg.id, emoji, profile.uid);
                        }}
                        className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition cursor-pointer ${
                          profile && uids.includes(profile.uid)
                            ? 'font-bold shadow-xs'
                            : ''
                        }`}
                        style={{
                          backgroundColor: profile && uids.includes(profile.uid) ? theme.colors.lilac : theme.colors.surface,
                          borderColor: profile && uids.includes(profile.uid) ? theme.colors.primary : theme.colors.border,
                          color: theme.colors.text
                        }}
                      >
                        <span>{emoji}</span>
                        <span className="text-[10px] opacity-75">{uids.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Floating Desktop Hover Action Bar */}
                <div
                  className={`hidden md:flex absolute top-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 items-center gap-1 shadow-md border rounded-full px-2 py-1 z-20 ${
                    isSender ? '-left-32 -top-3' : '-right-32 -top-3'
                  }`}
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.text
                  }}
                >
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setReplyingTo(msg); }}
                    className="p-1 hover:opacity-75 transition"
                    title="Reply"
                  >
                    <Reply className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id);
                    }}
                    className="p-1 hover:opacity-75 transition"
                    title="React"
                  >
                    <Smile className="w-3.5 h-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(msg.content || '');
                    }}
                    className="p-1 hover:opacity-75 transition"
                    title="Copy"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>

                  {isSender && !msg.isDeleted && (
                    <>
                      {msg.type === 'text' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingMessageId(msg.id);
                            setEditContent(msg.content || '');
                          }}
                          className="p-1 hover:opacity-75 transition"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmUnsendMessageId(msg.id);
                        }}
                        className="p-1 hover:text-red-500 transition"
                        title="Unsend"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Reaction Picker Popover */}
                {activeReactionMessageId === msg.id && (
                  <div
                    className="absolute -top-11 left-0 border shadow-2xl rounded-full px-2.5 py-1.5 flex items-center gap-1.5 z-30 animate-in fade-in zoom-in-95"
                    style={{ backgroundColor: theme.colors.surface, borderColor: theme.colors.border }}
                  >
                    {QUICK_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (profile) toggleMessageReaction(conversation.id, msg.id, emoji, profile.uid);
                          setActiveReactionMessageId(null);
                        }}
                        className="text-base hover:scale-125 transition transform cursor-pointer"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
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
            <span>Typing a secure response...</span>
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
              {QUICK_EMOJIS.slice(0, 6).map((emoji) => (
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
                Replying to {replyingTo.senderName}
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

      {/* Voice Recording Active Bar */}
      {isRecordingVoice ? (
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

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl hover:opacity-80 transition cursor-pointer"
            style={{ color: theme.colors.textMuted }}
            title="Attach Photo or File from Phone"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <input
            type="text"
            placeholder="Type a private message..."
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
    </div>
  );
};
