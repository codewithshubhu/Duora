import React, { useState, useRef } from 'react';
import { Message, UserProfile, ThemeConfig } from '../../types';
import { Reply, Play, Pause, Paperclip, Download, Phone, Video, Plus } from 'lucide-react';

interface MessageRowProps {
  msg: Message;
  isSender: boolean;
  isRead: boolean;
  isLatestSentMessage?: boolean;
  theme: ThemeConfig;
  onReply: (msg: Message) => void;
  onActionClick: (msg: Message) => void;
  onImageClick: (url: string) => void;
  onAudioToggle: (id: string, url: string) => void;
  isPlayingAudio: boolean;
  editingMessageId: string | null;
  editContent: string;
  setEditContent: (val: string) => void;
  onEditSubmit: (id: string) => void;
  onCancelEdit: () => void;
  onReact: (emoji: string) => void;
  onOpenEmojiPicker?: (msg: Message) => void;
  currentUserId?: string;
  showSenderName?: boolean;
}

export const MessageRow: React.FC<MessageRowProps> = ({
  msg,
  isSender,
  isRead,
  isLatestSentMessage,
  theme,
  onReply,
  onActionClick,
  onImageClick,
  onAudioToggle,
  isPlayingAudio,
  editingMessageId,
  editContent,
  setEditContent,
  onEditSubmit,
  onCancelEdit,
  onReact,
  onOpenEmojiPicker,
  currentUserId,
  showSenderName
}) => {
  const [swipeOffset, setSwipeOffset] = useState<number>(0);
  const [isSwiping, setIsSwiping] = useState<boolean>(false);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const formattedTime = msg.createdAt?.toDate
    ? new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(msg.createdAt.toDate())
    : 'Just now';

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartXRef.current = e.touches[0].clientX;
    touchStartYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartXRef.current;
    const deltaY = e.touches[0].clientY - touchStartYRef.current;

    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(deltaX) > Math.abs(deltaY);
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    // Swipe right to reply: positive deltaX up to 75px
    // Swipe left to show timestamp: negative deltaX down to -80px
    if (deltaX > 0) {
      setSwipeOffset(Math.min(deltaX, 75));
    } else {
      setSwipeOffset(Math.max(deltaX, -80));
    }
  };

  const handleTouchEnd = () => {
    if (swipeOffset > 42) {
      // Swiped right threshold reached: trigger reply
      onReply(msg);
    }
    // Smooth reset
    setSwipeOffset(0);
    setIsSwiping(false);
    isHorizontalSwipeRef.current = null;
  };

  // Mouse drag handlers for desktop support
  const mouseStartXRef = useRef<number | null>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    // Only left click
    if (e.button !== 0) return;
    mouseStartXRef.current = e.clientX;
    setIsSwiping(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (mouseStartXRef.current === null) return;
    const deltaX = e.clientX - mouseStartXRef.current;
    if (deltaX > 0) {
      setSwipeOffset(Math.min(deltaX, 75));
    } else {
      setSwipeOffset(Math.max(deltaX, -80));
    }
  };

  const handleMouseUp = () => {
    if (mouseStartXRef.current !== null) {
      if (swipeOffset > 42) {
        onReply(msg);
      }
      mouseStartXRef.current = null;
      setSwipeOffset(0);
      setIsSwiping(false);
    }
  };

  const handleMouseLeave = () => {
    if (mouseStartXRef.current !== null) {
      mouseStartXRef.current = null;
      setSwipeOffset(0);
      setIsSwiping(false);
    }
  };

  return (
    <div
      className="relative overflow-visible group my-1 select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    >
      {/* Swipe Right to Reply Indicator (Visible on left when swiping right) */}
      <div
        className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center justify-center transition-opacity"
        style={{
          opacity: swipeOffset > 15 ? Math.min(swipeOffset / 45, 1) : 0,
          transform: `scale(${Math.min(0.6 + swipeOffset / 70, 1.15)})`,
          color: theme.colors.primary
        }}
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shadow-md"
          style={{ backgroundColor: theme.colors.lilac }}
        >
          <Reply className="w-4 h-4" />
        </div>
      </div>

      {/* Swipe Left Timestamp Indicator (Revealed on right edge when swiping left) */}
      <div
        className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center transition-opacity"
        style={{
          opacity: swipeOffset < -15 ? Math.min(Math.abs(swipeOffset) / 45, 1) : 0
        }}
      >
        <span
          className="text-[11px] font-mono font-medium"
          style={{
            color: theme.colors.textMuted
          }}
        >
          {formattedTime}
        </span>
      </div>

      {/* Main Message Container with horizontal translate on swipe */}
      <div
        className={`flex flex-col ${isSender ? 'items-end' : 'items-start'} ${
          isSwiping ? '' : 'transition-transform duration-200 ease-out'
        }`}
        style={{
          transform: `translateX(${swipeOffset}px)`
        }}
      >
        {/* Sender display name for group chats */}
        {showSenderName && (
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
                {msg.replyTo.senderId === currentUserId ? 'Replying to yourself' : msg.replyTo.senderName}
              </span>
              <span className="line-clamp-1 italic text-[11px]">
                {msg.replyTo.content}
              </span>
            </div>
          )}

          {/* Message Bubble - Fully rounded corners */}
          <div
            onClick={() => onActionClick(msg)}
            className="p-3 rounded-2xl shadow-sm text-sm relative break-words cursor-pointer transition"
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
              <div className="flex flex-col gap-2 min-w-[220px]" onClick={(e) => e.stopPropagation()}>
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
                    onClick={(e) => { e.stopPropagation(); onCancelEdit(); }}
                    className="px-2.5 py-1 rounded bg-black/20 text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEditSubmit(msg.id); }}
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
                    className="mb-1 rounded-xl overflow-hidden cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); onImageClick(msg.mediaUrl!); }}
                  >
                    <img
                      src={msg.mediaUrl}
                      alt="Photo"
                      className="max-h-64 w-full object-cover rounded-xl hover:scale-101 transition duration-200"
                    />
                  </div>
                )}

                {/* Voice Note Audio */}
                {msg.type === 'audio' && msg.mediaUrl && (
                  <div className="flex items-center gap-3 py-1 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onAudioToggle(msg.id, msg.mediaUrl!)}
                      className={`p-2.5 rounded-full shadow transition hover:scale-105 cursor-pointer ${
                        isSender ? 'bg-white text-[#7057E8]' : 'bg-[#7057E8] text-white'
                      }`}
                    >
                      {isPlayingAudio ? (
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

                {/* Call Event Message */}
                {msg.type === 'call' && (
                  <div className="flex items-center gap-3 py-1 min-w-[190px]">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        msg.callStatus === 'missed'
                          ? 'bg-red-500/15 text-red-500'
                          : 'bg-emerald-500/15 text-emerald-500'
                      }`}
                    >
                      {msg.callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-xs">
                        {msg.content}
                      </span>
                      <span className="text-[10px] opacity-75 font-mono">
                        {formattedTime}
                      </span>
                    </div>
                  </div>
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

            {/* Status Text (Sent or Seen) - ONLY on the latest sent message */}
            {isSender && isLatestSentMessage && (
              <div className="flex items-center justify-end mt-1">
                <span className="text-[9.5px] font-semibold opacity-75 tracking-tight uppercase">
                  {msg.pending ? 'Sending...' : (isRead ? 'Seen' : 'Sent')}
                </span>
              </div>
            )}
          </div>

          {/* Reactions badge */}
          {((msg.reactions && Object.keys(msg.reactions).length > 0) || onOpenEmojiPicker) && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {msg.reactions && Object.entries(msg.reactions).map(([emoji, uids]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onReact(emoji);
                  }}
                  className={`px-2 py-0.5 rounded-full text-xs flex items-center gap-1 border transition cursor-pointer ${
                    currentUserId && uids.includes(currentUserId)
                      ? 'font-bold shadow-xs'
                      : ''
                  }`}
                  style={{
                    backgroundColor: currentUserId && uids.includes(currentUserId) ? theme.colors.lilac : theme.colors.surface,
                    borderColor: currentUserId && uids.includes(currentUserId) ? theme.colors.primary : theme.colors.border,
                    color: theme.colors.text
                  }}
                >
                  <span>{emoji}</span>
                  <span className="text-[10px] opacity-75">{uids.length}</span>
                </button>
              ))}

              {onOpenEmojiPicker && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEmojiPicker(msg);
                  }}
                  className="w-6 h-6 rounded-full text-xs flex items-center justify-center border hover:opacity-80 transition cursor-pointer"
                  style={{
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                    color: theme.colors.textMuted
                  }}
                  title="Add reaction"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
