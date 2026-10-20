import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  getDocs,
  getDoc,
  limit,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { Conversation, Message, MessageType, UserProfile } from '../types';
import { cleanFirestoreObject } from '../firebase/clean';

export { cleanFirestoreObject };

// Deterministic conversation ID for 1-to-1 chats: dm_{uidA}_{uidB} sorted
export function getDirectConversationId(uid1: string, uid2: string): string {
  const sorted = [uid1, uid2].sort();
  return `dm_${sorted[0]}_${sorted[1]}`;
}

// Subscribe to conversations of the current user
export function subscribeToConversations(
  currentUserId: string,
  onUpdate: (conversations: Conversation[]) => void
) {
  const q = query(
    collection(db, 'conversations'),
    where('participantIds', 'array-contains', currentUserId),
    orderBy('updatedAt', 'desc'),
    limit(50)
  );

  return onSnapshot(
    q,
    (snap) => {
      const convs: Conversation[] = [];
      snap.forEach((d) => {
        convs.push({ ...d.data(), id: d.id } as Conversation);
      });
      onUpdate(convs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'conversations');
    }
  );
}

// Subscribe to messages in a conversation
export function subscribeToMessages(
  conversationId: string,
  onUpdate: (messages: Message[]) => void
) {
  if (!conversationId) return () => {};

  const q = query(
    collection(db, 'conversations', conversationId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snap) => {
      const seen = new Set<string>();
      const msgs: Message[] = [];
      snap.forEach((d) => {
        if (!seen.has(d.id)) {
          seen.add(d.id);
          msgs.push({ ...d.data(), id: d.id } as Message);
        }
      });

      // Explicitly sort ascending (oldest first, newest at the bottom)
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
        return timeA - timeB;
      });

      onUpdate(msgs);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `conversations/${conversationId}/messages`);
    }
  );
}

// Subscribe to typing indicator
export function subscribeToTyping(
  conversationId: string,
  currentUserId: string,
  onUpdate: (typingUserIds: string[]) => void
) {
  if (!conversationId) return () => {};

  const colRef = collection(db, 'conversations', conversationId, 'typing');
  return onSnapshot(
    colRef,
    (snap) => {
      const typingUsers: string[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.userId !== currentUserId && data.isTyping) {
          typingUsers.push(data.userId);
        }
      });
      onUpdate(typingUsers);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, `conversations/${conversationId}/typing`);
    }
  );
}

// Set user typing state
export async function setTypingState(conversationId: string, userId: string, isTyping: boolean) {
  if (!conversationId || !userId) return;
  try {
    const typingRef = doc(db, 'conversations', conversationId, 'typing', userId);
    await setDoc(typingRef, cleanFirestoreObject({
      userId,
      isTyping,
      updatedAt: serverTimestamp()
    }), { merge: true });
  } catch {
    // Non-critical typing error
  }
}

// Create or get 1-to-1 conversation
export async function getOrCreateDirectConversation(
  currentUser: UserProfile,
  otherUser: UserProfile,
  isAccepted: boolean = true
): Promise<Conversation> {
  const convId = getDirectConversationId(currentUser.uid, otherUser.uid);
  const convRef = doc(db, 'conversations', convId);

  try {
    const existingSnap = await getDoc(convRef);
    if (existingSnap.exists()) {
      return { ...existingSnap.data(), id: existingSnap.id } as Conversation;
    }

    const newConv: Conversation = {
      id: convId,
      type: 'direct',
      participantIds: [currentUser.uid, otherUser.uid],
      participants: {
        [currentUser.uid]: {
          uid: currentUser.uid,
          displayName: currentUser.displayName,
          username: currentUser.username,
          duoraId: currentUser.duoraId,
          avatarUrl: currentUser.avatarUrl,
        },
        [otherUser.uid]: {
          uid: otherUser.uid,
          displayName: otherUser.displayName,
          username: otherUser.username,
          duoraId: otherUser.duoraId,
          avatarUrl: otherUser.avatarUrl,
        }
      },
      lastMessage: 'Conversation started',
      lastMessageSenderId: currentUser.uid,
      lastMessageTimestamp: serverTimestamp(),
      unreadCount: {
        [currentUser.uid]: 0,
        [otherUser.uid]: 0,
      },
      isAccepted,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(convRef, cleanFirestoreObject(newConv));
    return newConv;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${convId}`);
  }
}

// Create Group Conversation
export async function createGroupConversation(
  creator: UserProfile,
  groupName: string,
  members: UserProfile[],
  groupAvatar?: string
): Promise<Conversation> {
  const convId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const convRef = doc(db, 'conversations', convId);

  const allMembers = [creator, ...members];
  const participantIds = allMembers.map(m => m.uid);
  const participantsMap: Record<string, any> = {};
  const unreadMap: Record<string, number> = {};

  allMembers.forEach(m => {
    participantsMap[m.uid] = {
      uid: m.uid,
      displayName: m.displayName,
      username: m.username,
      duoraId: m.duoraId,
      avatarUrl: m.avatarUrl,
    };
    unreadMap[m.uid] = 0;
  });

  const groupConv: Conversation = {
    id: convId,
    type: 'group',
    groupName: groupName.trim(),
    groupAvatar: groupAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(groupName)}`,
    groupAdminIds: [creator.uid],
    participantIds,
    participants: participantsMap,
    lastMessage: `${creator.displayName} created group "${groupName}"`,
    lastMessageSenderId: creator.uid,
    lastMessageTimestamp: serverTimestamp(),
    unreadCount: unreadMap,
    isAccepted: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(convRef, cleanFirestoreObject(groupConv));
    return groupConv;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${convId}`);
  }
}

// Send Message
export async function sendMessage(
  conversationId: string,
  sender: UserProfile,
  content: string,
  type: MessageType = 'text',
  options?: {
    mediaUrl?: string;
    mediaName?: string;
    mediaSize?: number;
    audioDuration?: number;
    replyTo?: {
      id: string;
      senderId: string;
      senderName: string;
      content: string;
      type: string;
      mediaUrl?: string | null;
    } | null;
  }
): Promise<string> {
  if (!conversationId) {
    throw new Error('Cannot send message without a valid conversation ID.');
  }

  const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const msgRef = doc(db, 'conversations', conversationId, 'messages', msgId);
  const convRef = doc(db, 'conversations', conversationId);

  // Construct message payload cleanly without ANY undefined properties
  const msgData: Record<string, any> = {
    id: msgId,
    conversationId,
    senderId: sender.uid,
    senderName: sender.displayName,
    senderAvatar: sender.avatarUrl,
    content: (content || '').trim(),
    type,
    reactions: {},
    isEdited: false,
    isDeleted: false,
    readBy: [sender.uid],
    createdAt: serverTimestamp(),
  };

  if (options?.mediaUrl) {
    msgData.mediaUrl = options.mediaUrl;
  }
  if (options?.mediaName) {
    msgData.mediaName = options.mediaName;
  }
  if (typeof options?.mediaSize === 'number') {
    msgData.mediaSize = options.mediaSize;
  }
  if (typeof options?.audioDuration === 'number') {
    msgData.audioDuration = options.audioDuration;
  }
  if (options?.replyTo) {
    msgData.replyTo = {
      id: options.replyTo.id,
      senderId: options.replyTo.senderId,
      senderName: options.replyTo.senderName,
      content: options.replyTo.content || '',
      type: options.replyTo.type || 'text',
      ...(options.replyTo.mediaUrl ? { mediaUrl: options.replyTo.mediaUrl } : {})
    };
  }

  try {
    // 1. Commit message document
    await setDoc(msgRef, cleanFirestoreObject(msgData));

    // 2. Prepare conversation snippet
    const snippet = type === 'text'
      ? content.trim().slice(0, 80)
      : type === 'image'
        ? '📷 Photo'
        : type === 'audio'
          ? '🎤 Voice note'
          : `📎 ${options?.mediaName || 'File'}`;

    // 3. Update conversation last message metadata
    try {
      await updateDoc(convRef, cleanFirestoreObject({
        lastMessage: snippet,
        lastMessageSenderId: sender.uid,
        lastMessageTimestamp: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }));
    } catch (convUpdateErr) {
      console.warn('Conversation metadata update warning:', convUpdateErr);
    }

    return msgId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `conversations/${conversationId}/messages/${msgId}`);
  }
}

// Mark messages in conversation as read
export async function markConversationAsRead(conversationId: string, currentUserId: string) {
  if (!conversationId || !currentUserId) return;
  try {
    const convRef = doc(db, 'conversations', conversationId);
    await updateDoc(convRef, {
      [`unreadCount.${currentUserId}`]: 0
    });

    // Mark recent unread messages atomically with arrayUnion
    const q = query(
      collection(db, 'conversations', conversationId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    const snap = await getDocs(q);
    const updatePromises: Promise<void>[] = [];
    snap.forEach((d) => {
      const data = d.data() as Message;
      if (!data.readBy?.includes(currentUserId)) {
        updatePromises.push(
          updateDoc(d.ref, {
            readBy: arrayUnion(currentUserId)
          })
        );
      }
    });
    await Promise.allSettled(updatePromises);
  } catch {
    // Non-fatal
  }
}

// Add or toggle emoji reaction on a message
export async function toggleMessageReaction(
  conversationId: string,
  messageId: string,
  emoji: string,
  userId: string
) {
  if (!conversationId || !messageId || !userId) return;
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const msg = snap.data() as Message;
    const reactions = msg.reactions || {};
    const userList = new Set(reactions[emoji] || []);

    if (userList.has(userId)) {
      userList.delete(userId);
    } else {
      userList.add(userId);
    }

    if (userList.size === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = Array.from(userList);
    }

    await updateDoc(msgRef, { reactions });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

// Edit message content
export async function editMessage(
  conversationId: string,
  messageId: string,
  newContent: string,
  currentUserId?: string
) {
  if (!conversationId || !messageId) return;
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const msg = snap.data() as Message;

    // Enforce permission: only original sender can edit
    if (currentUserId && msg.senderId !== currentUserId) {
      throw new Error('You do not have permission to edit this message.');
    }

    await updateDoc(msgRef, cleanFirestoreObject({
      content: newContent.trim(),
      isEdited: true,
      editedAt: serverTimestamp()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

// Unsend message for all participants
export async function unsendMessage(
  conversationId: string,
  messageId: string,
  currentUserId?: string
) {
  if (!conversationId || !messageId) return;
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const msg = snap.data() as Message;

    // Enforce permission: only original sender can unsend for everyone
    if (currentUserId && msg.senderId !== currentUserId) {
      throw new Error('You do not have permission to unsend this message.');
    }

    await updateDoc(msgRef, cleanFirestoreObject({
      content: 'This message was unsent',
      isDeleted: true,
      mediaUrl: '',
      type: 'text'
    }));

    // Update conversation lastMessage preview
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        lastMessage: 'This message was unsent',
        updatedAt: serverTimestamp()
      });
    } catch {
      // Non-fatal
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `conversations/${conversationId}/messages/${messageId}`);
  }
}

// Delete message permanently
export async function deleteMessage(
  conversationId: string,
  messageId: string,
  currentUserId?: string
) {
  if (!conversationId || !messageId) return;
  const msgRef = doc(db, 'conversations', conversationId, 'messages', messageId);
  try {
    const snap = await getDoc(msgRef);
    if (!snap.exists()) return;
    const msg = snap.data() as Message;

    // Sender can delete permanently
    if (!currentUserId || msg.senderId === currentUserId) {
      await deleteDoc(msgRef);
    } else {
      // Soft-delete marker for other participant
      await updateDoc(msgRef, {
        [`deletedFor.${currentUserId}`]: true
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `conversations/${conversationId}/messages/${messageId}`);
  }
}
