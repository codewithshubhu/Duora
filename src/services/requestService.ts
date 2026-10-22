import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { MessageRequest, UserProfile } from '../types';
import { getOrCreateDirectConversation } from './chatService';
import { createNotification } from './notificationService';
import { cleanFirestoreObject } from '../firebase/clean';

// Send a new message request
export async function sendMessageRequest(
  sender: UserProfile,
  receiver: UserProfile,
  previewText: string = ''
): Promise<string> {
  const reqId = `req_${sender.uid}_${receiver.uid}`;
  const reqRef = doc(db, 'messageRequests', reqId);

  try {
    // Check if an existing pending request exists
    const existing = await getDoc(reqRef);
    if (existing.exists() && existing.data().status === 'pending') {
      return reqId;
    }

    const newReq: Record<string, any> = {
      id: reqId,
      senderId: sender.uid,
      receiverId: receiver.uid,
      senderDuoraId: sender.duoraId,
      senderUsername: sender.username,
      senderDisplayName: sender.displayName,
      senderAvatar: sender.avatarUrl,
      receiverDuoraId: receiver.duoraId,
      previewMessage: previewText.trim() || 'Hello, I would like to connect on Duora.',
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await setDoc(reqRef, cleanFirestoreObject(newReq));

    // Also trigger notification for the receiver so it appears in their notification bar
    await createNotification(
      receiver.uid,
      'message_request',
      `Message Request from ${sender.displayName}`,
      `@${sender.username} wants to connect with you.`,
      { uid: sender.uid, displayName: sender.displayName, avatarUrl: sender.avatarUrl }
    );

    return reqId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `messageRequests/${reqId}`);
  }
}

// Accept a message request
export async function acceptMessageRequest(
  request: MessageRequest | string,
  currentUser: UserProfile,
  senderUser: UserProfile
): Promise<void> {
  const reqId = typeof request === 'string' ? request : request.id;
  const originalSenderId = typeof request === 'string' ? senderUser.uid : request.senderId;
  try {
    const reqRef = doc(db, 'messageRequests', reqId);
    await updateDoc(reqRef, cleanFirestoreObject({
      status: 'accepted',
      updatedAt: serverTimestamp()
    }));

    // Add both users to each other's friends array in Firestore
    await updateDoc(doc(db, 'users', currentUser.uid), {
      friends: arrayUnion(senderUser.uid),
      updatedAt: serverTimestamp()
    }).catch(() => {});

    await updateDoc(doc(db, 'users', senderUser.uid), {
      friends: arrayUnion(currentUser.uid),
      updatedAt: serverTimestamp()
    }).catch(() => {});

    // Create or activate the direct conversation
    await getOrCreateDirectConversation(currentUser, senderUser, true);

    // Notify original sender
    await createNotification(
      originalSenderId,
      'request_accepted',
      `${currentUser.displayName} accepted your request`,
      `You can now message each other privately.`,
      { uid: currentUser.uid, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `messageRequests/${reqId}`);
  }
}

// Decline a message request
export async function declineMessageRequest(requestId: string): Promise<void> {
  try {
    const reqRef = doc(db, 'messageRequests', requestId);
    await updateDoc(reqRef, cleanFirestoreObject({
      status: 'declined',
      updatedAt: serverTimestamp()
    }));
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `messageRequests/${requestId}`);
  }
}

// Cancel a sent message request
export async function cancelMessageRequest(requestId: string): Promise<void> {
  try {
    const reqRef = doc(db, 'messageRequests', requestId);
    await deleteDoc(reqRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `messageRequests/${requestId}`);
  }
}

// Remove a friend
export async function removeFriend(currentUserId: string, friendUid: string): Promise<void> {
  try {
    await updateDoc(doc(db, 'users', currentUserId), {
      friends: arrayRemove(friendUid),
      updatedAt: serverTimestamp()
    });
    await updateDoc(doc(db, 'users', friendUid), {
      friends: arrayRemove(currentUserId),
      updatedAt: serverTimestamp()
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${currentUserId}`);
  }
}

// Subscribe to incoming pending requests for the current user
export function subscribeToIncomingRequests(
  userId: string,
  onUpdate: (requests: MessageRequest[]) => void
) {
  const q = query(
    collection(db, 'messageRequests'),
    where('receiverId', '==', userId),
    where('status', '==', 'pending')
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: MessageRequest[] = [];
      snap.forEach(d => {
        list.push({ ...d.data(), id: d.id } as MessageRequest);
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'messageRequests');
    }
  );
}

// Subscribe to outgoing requests sent by the current user
export function subscribeToOutgoingRequests(
  userId: string,
  onUpdate: (requests: MessageRequest[]) => void
) {
  const q = query(
    collection(db, 'messageRequests'),
    where('senderId', '==', userId)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: MessageRequest[] = [];
      snap.forEach(d => {
        list.push({ ...d.data(), id: d.id } as MessageRequest);
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'messageRequests');
    }
  );
}
