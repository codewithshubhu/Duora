// Deep recursive sanitizer to eliminate all undefined fields before saving to Firestore
export function cleanFirestoreObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Preserve Date instances
  if (obj instanceof Date) {
    return obj;
  }

  // Preserve Firestore FieldValue objects (e.g. serverTimestamp, arrayUnion, deleteField)
  if (typeof obj === 'object' && ('_methodName' in (obj as any) || typeof (obj as any).isEqual === 'function' || typeof (obj as any).toMillis === 'function')) {
    return obj;
  }

  // Sanitize arrays
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => cleanFirestoreObject(item)) as unknown as T;
  }

  // Sanitize objects
  if (typeof obj === 'object') {
    const clean: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        clean[key] = cleanFirestoreObject(value);
      }
    }
    return clean as T;
  }

  return obj;
}
