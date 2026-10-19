import {
  collection,
  doc,
  query,
  where,
  orderBy,
  onSnapshot,
  setDoc,
  updateDoc,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { NotificationItem } from '../types';
import { cleanFirestoreObject } from '../firebase/clean';

export function subscribeToNotifications(
  userId: string,
  onUpdate: (notifications: NotificationItem[]) => void
) {
  const q = query(
    collection(db, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(30)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: NotificationItem[] = [];
      snap.forEach(d => {
        list.push({ ...d.data(), id: d.id } as NotificationItem);
      });
      onUpdate(list);
    },
    (err) => {
      handleFirestoreError(err, OperationType.LIST, 'notifications');
    }
  );
}

export async function createNotification(
  recipientId: string,
  type: 'message_request' | 'request_accepted' | 'call_missed' | 'alert',
  title: string,
  body: string,
  sender?: { uid: string; displayName: string; avatarUrl: string },
  link?: string
) {
  const notifId = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const notifRef = doc(db, 'notifications', notifId);

  const notif: Record<string, any> = {
    id: notifId,
    recipientId,
    type,
    title,
    body,
    read: false,
    createdAt: serverTimestamp(),
  };

  if (sender?.uid) notif.senderId = sender.uid;
  if (sender?.displayName) notif.senderName = sender.displayName;
  if (sender?.avatarUrl) notif.senderAvatar = sender.avatarUrl;
  if (link) notif.link = link;

  try {
    await setDoc(notifRef, cleanFirestoreObject(notif));
  } catch (err) {
    console.warn('Notification create warning:', err);
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, { read: true });
  } catch {
    // Non-fatal
  }
}
