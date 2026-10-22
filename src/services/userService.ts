import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
  serverTimestamp,
  writeBatch,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/config';
import { handleFirestoreError, OperationType } from '../firebase/errors';
import { UserProfile, UserPrivateInfo } from '../types';
import { generateDuoraId, normalizeUsername, isValidDuoraId } from '../utils/duoraId';
import { cleanFirestoreObject } from '../firebase/clean';
import { uploadProfilePhoto } from './storageService';

// Check if a username is available
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const norm = normalizeUsername(username);
  if (!norm || norm.length < 3) return false;
  try {
    const snap = await getDoc(doc(db, 'usernames', norm));
    return !snap.exists();
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `usernames/${norm}`);
  }
}

// Upload profile picture with Firebase Storage and optimized compression fallback
export async function uploadProfilePictureToStorage(userId: string, imageFile: File): Promise<string> {
  return uploadProfilePhoto(userId, imageFile);
}

// Register initial user profile and permanent Duora ID
export async function initializeUserProfile(
  uid: string,
  email: string,
  displayName: string,
  desiredUsername?: string,
  avatarUrl?: string
): Promise<UserProfile> {
  try {
    // Check if user already exists
    const userRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(userRef);
    if (existingSnap.exists()) {
      return existingSnap.data() as UserProfile;
    }

    // Determine unique username
    let chosenUsername = normalizeUsername(desiredUsername || displayName || email.split('@')[0]);
    if (chosenUsername.length < 3) {
      chosenUsername = `user_${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // Check availability, if taken add random digits
    let available = await isUsernameAvailable(chosenUsername);
    let attempts = 0;
    while (!available && attempts < 5) {
      chosenUsername = `${chosenUsername.slice(0, 20)}_${Math.floor(100 + Math.random() * 900)}`;
      available = await isUsernameAvailable(chosenUsername);
      attempts++;
    }

    // Generate unique permanent Duora ID
    let duoraId = generateDuoraId();
    let idDoc = await getDoc(doc(db, 'duoraIds', duoraId));
    while (idDoc.exists()) {
      duoraId = generateDuoraId();
      idDoc = await getDoc(doc(db, 'duoraIds', duoraId));
    }

    const defaultAvatar = avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(displayName || chosenUsername)}&backgroundColor=7057e8`;

    const profile: UserProfile = {
      uid,
      duoraId,
      username: chosenUsername,
      usernameLower: chosenUsername.toLowerCase(),
      displayName: displayName || chosenUsername,
      avatarUrl: defaultAvatar,
      bio: 'Hey there! I am using Duora to connect privately.',
      isDiscoverable: true,
      showOnlineStatus: true,
      showLastSeen: true,
      readReceipts: true,
      isOnline: true,
    };

    const privateInfo: UserPrivateInfo = {
      email,
      emailVerified: false,
      blockedUserIds: [],
    };

    const batch = writeBatch(db);
    batch.set(userRef, {
      ...profile,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastSeenAt: serverTimestamp()
    });

    batch.set(doc(db, 'users', uid, 'private', 'info'), {
      ...privateInfo,
      updatedAt: serverTimestamp()
    });

    batch.set(doc(db, 'usernames', chosenUsername.toLowerCase()), {
      uid,
      username: chosenUsername,
      email: email.toLowerCase(),
      createdAt: serverTimestamp()
    });

    batch.set(doc(db, 'duoraIds', duoraId), {
      uid,
      duoraId,
      createdAt: serverTimestamp()
    });

    await batch.commit();
    return profile;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${uid}`);
  }
}

// Fetch user profile by UID
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return snap.data() as UserProfile;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

// Fetch private user info
export async function getUserPrivateInfo(uid: string): Promise<UserPrivateInfo | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
    if (!snap.exists()) return null;
    return snap.data() as UserPrivateInfo;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}/private/info`);
  }
}

// Update profile fields and synchronize across conversations in real time
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, 'displayName' | 'avatarUrl' | 'bio' | 'isDiscoverable' | 'showOnlineStatus' | 'showLastSeen' | 'readReceipts' | 'themeId' | 'wallpaper' | 'accentColor'>>,
  newUsername?: string
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const existingSnap = await getDoc(userRef);
    if (!existingSnap.exists()) return;

    const currentData = existingSnap.data() as UserProfile;

    if (newUsername && normalizeUsername(newUsername) !== currentData.usernameLower) {
      const norm = normalizeUsername(newUsername);
      const isFree = await isUsernameAvailable(norm);
      if (!isFree) {
        throw new Error('This username is already taken. Please choose another.');
      }

      const batch = writeBatch(db);
      // Delete old username claim
      batch.delete(doc(db, 'usernames', currentData.usernameLower));
      // Add new username claim
      batch.set(doc(db, 'usernames', norm), {
        uid,
        username: newUsername,
        createdAt: serverTimestamp()
      });
      // Update user doc
      batch.update(userRef, cleanFirestoreObject({
        ...updates,
        username: newUsername,
        usernameLower: norm,
        updatedAt: serverTimestamp()
      }));
      await batch.commit();
    } else {
      await updateDoc(userRef, cleanFirestoreObject({
        ...updates,
        updatedAt: serverTimestamp()
      }));
    }

    // Synchronize avatar, display name, username, and bio across existing conversations so all other users see it immediately!
    const effectiveUsername = newUsername;
    if (updates.avatarUrl || updates.displayName || effectiveUsername || updates.bio !== undefined) {
      try {
        const qConvs = query(
          collection(db, 'conversations'),
          where('participantIds', 'array-contains', uid),
          limit(50)
        );
        const convSnaps = await getDocs(qConvs);
        const convBatch = writeBatch(db);
        convSnaps.forEach((cDoc) => {
          const updateData: Record<string, any> = {};
          if (updates.avatarUrl) {
            updateData[`participants.${uid}.avatarUrl`] = updates.avatarUrl;
          }
          if (updates.displayName) {
            updateData[`participants.${uid}.displayName`] = updates.displayName;
          }
          if (effectiveUsername) {
            updateData[`participants.${uid}.username`] = effectiveUsername;
          }
          if (updates.bio !== undefined) {
            updateData[`participants.${uid}.bio`] = updates.bio;
          }
          convBatch.update(cDoc.ref, updateData);
        });
        await convBatch.commit();
      } catch (syncErr) {
        console.warn('Could not sync profile across conversations:', syncErr);
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

// Update online / heartbeat status
export async function setUserOnlineStatus(uid: string, isOnline: boolean): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      isOnline,
      lastSeenAt: serverTimestamp()
    });
  } catch {
    // Soft fail for heartbeat
  }
}

// Search users by query (Permanent Duora ID, username, or display name)
export async function searchUsers(searchTerm: string, currentUserId: string): Promise<UserProfile[]> {
  const clean = searchTerm.trim();
  if (!clean || clean.length < 1) return [];

  try {
    const userCol = collection(db, 'users');
    const resultMap = new Map<string, UserProfile>();

    // 1. Exact Duora ID match
    if (isValidDuoraId(clean)) {
      const q = query(
        userCol,
        where('duoraId', '==', clean.toUpperCase()),
        limit(5)
      );
      const snap = await getDocs(q);
      snap.forEach(d => {
        const u = d.data() as UserProfile;
        if (u.uid !== currentUserId) resultMap.set(u.uid, u);
      });
      if (resultMap.size > 0) return Array.from(resultMap.values());
    }

    // 2. Prefix query on username
    const norm = clean.toLowerCase();
    const qUsername = query(
      userCol,
      where('usernameLower', '>=', norm),
      where('usernameLower', '<=', norm + '\uf8ff'),
      limit(15)
    );
    const snapUser = await getDocs(qUsername);
    snapUser.forEach(d => {
      const u = d.data() as UserProfile;
      if (u.uid !== currentUserId && u.isDiscoverable !== false) {
        resultMap.set(u.uid, u);
      }
    });

    // 3. Fallback scan on display name & username for discovery
    const qGeneral = query(userCol, limit(40));
    const snapGen = await getDocs(qGeneral);
    snapGen.forEach(d => {
      const u = d.data() as UserProfile;
      if (u.uid !== currentUserId && u.isDiscoverable !== false) {
        const nameMatch = u.displayName?.toLowerCase().includes(norm);
        const userMatch = u.username?.toLowerCase().includes(norm);
        if (nameMatch || userMatch) {
          resultMap.set(u.uid, u);
        }
      }
    });

    return Array.from(resultMap.values());
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

// Block / Unblock user with reliable public & private synchronization
export async function toggleBlockUser(currentUserId: string, targetUserId: string, block: boolean = true): Promise<void> {
  if (!currentUserId || !targetUserId) return;
  try {
    const userRef = doc(db, 'users', currentUserId);
    const privateRef = doc(db, 'users', currentUserId, 'private', 'info');

    // Update public UserProfile so other users can check block status synchronously
    await updateDoc(userRef, {
      blockedUserIds: block ? arrayUnion(targetUserId) : arrayRemove(targetUserId),
      updatedAt: serverTimestamp()
    });

    // Also update private info doc
    await updateDoc(privateRef, {
      blockedUserIds: block ? arrayUnion(targetUserId) : arrayRemove(targetUserId),
      updatedAt: serverTimestamp()
    }).catch(() => {});
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${currentUserId}`);
  }
}
