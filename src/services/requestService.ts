import {
  collection,
  doc,
  query,
  where,
  onSnapshot,
  setDoc,
  updateDoc,
  getDoc,
  serverTimestamp
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
  previewText: string
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
      `@${sender.username} (${sender.duoraId}) wants to connect: "${newReq.previewMessage}"`,
      { uid: sender.uid, displayName: sender.displayName, avatarUrl: sender.avatarUrl }
    );

    return reqId;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `messageRequests/${reqId}`);
  }
}

// Accept a message request
export async function acceptMessageRequest(
  request: MessageRequest,
  currentUser: UserProfile,
  senderUser: UserProfile
): Promise<void> {
  try {
    const reqRef = doc(db, 'messageRequests', request.id);
    await updateDoc(reqRef, cleanFirestoreObject({
      status: 'accepted',
      updatedAt: serverTimestamp()
    }));

    // Create or activate the direct conversation
    await getOrCreateDirectConversation(currentUser, senderUser, true);

    // Notify original sender
    await createNotification(
      request.senderId,
      'request_accepted',
      `${currentUser.displayName} accepted your request`,
      `You can now message each other privately on Duora.`,
      { uid: currentUser.uid, displayName: currentUser.displayName, avatarUrl: currentUser.avatarUrl }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `messageRequests/${request.id}`);
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
