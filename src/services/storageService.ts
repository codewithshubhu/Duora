import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase/config';

// Compress image via HTML5 Canvas for fast delivery and fallback storage
export async function compressImageToDataUrl(file: File, maxDimension = 480, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file from phone.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
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
        canvas.width = width;
        canvas.height = height;
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

// Upload profile photo: Tries Firebase Storage first, falls back to optimized compressed data URL
export async function uploadProfilePhoto(userId: string, file: File): Promise<string> {
  // First generate a compressed data URL ready for instant use or fallback
  const compressedDataUrl = await compressImageToDataUrl(file, 480, 0.85);

  try {
    // Attempt Firebase Storage upload if storage is initialized
    if (storage) {
      const storageRef = ref(storage, `avatars/${userId}_${Date.now()}.jpg`);
      // Convert data URL to Blob
      const response = await fetch(compressedDataUrl);
      const blob = await response.blob();
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: 'image/jpeg',
      });
      const downloadUrl = await getDownloadURL(snapshot.ref);
      return downloadUrl;
    }
  } catch (storageErr) {
    console.warn('Firebase Storage upload failed or restricted, using compressed photo fallback:', storageErr);
  }

  // Fallback to high-quality compressed data URL
  return compressedDataUrl;
}
