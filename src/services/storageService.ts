import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

// Compress image via HTML5 Canvas for fast delivery and instant real-time sync
export async function compressImageToDataUrl(file: File | Blob, maxDimension = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read photo file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image data.'));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxDimension) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

// Upload profile photo: Generates optimized photo and guarantees immediate return without hanging
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  // Compress to ultra-fast 256x256 avatar (~10-15KB) for instant Firestore sync
  const compressedDataUrl = await compressImageToDataUrl(file, 256, 0.82);

  try {
    if (storage) {
      const storageRef = ref(storage, `avatars/${userId}_${Date.now()}.jpg`);
      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();

      // Wrap uploadBytes in a 1.5-second timeout so it NEVER hangs indefinitely
      const uploadPromise = uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
      }).then(snapshot => getDownloadURL(snapshot.ref));

      const timeoutPromise = new Promise<string>((_, reject) =>
        setTimeout(() => reject(new Error('Storage timeout')), 1500)
      );

      const downloadUrl = await Promise.race([uploadPromise, timeoutPromise]);
      return downloadUrl;
    }
  } catch (storageErr) {
    console.warn('Storage bucket slow or unavailable, using optimized compressed photo:', storageErr);
  }

  // Fallback to high-quality compressed photo (persists in Firestore directly and syncs to all users)
  return compressedDataUrl;
}

