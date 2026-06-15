import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDoc,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface LinkData {
  id: string; // The shortPath
  originalUrl: string;
  label: string;
  count: number;
  createdAt: any;
  isThirdParty?: boolean;
}

/**
 * 1. Subscribe to urlRedirects for a specific owner
 */
export function subscribeUrlRedirects(
  ownerId: string,
  onUpdate: (links: LinkData[]) => void,
  onError: (error: any) => void
): Unsubscribe {
  const q = query(collection(db, 'urlRedirects'), where('ownerId', '==', ownerId));

  return onSnapshot(
    q,
    snapshot => {
      const fetchedLinks: LinkData[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        fetchedLinks.push({
          id: docSnap.id,
          originalUrl: data.originalUrl,
          label: data.label || '',
          count: data.count || 0,
          createdAt: data.createdAt,
          isThirdParty: data.isThirdParty || false,
        });
      });

      // Sort by createdAt descending
      fetchedLinks.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      onUpdate(fetchedLinks);
    },
    onError
  );
}

/**
 * 2. Check if a short path slug is available
 */
export async function checkShortPathAvailability(shortPath: string): Promise<boolean> {
  const docRef = doc(db, 'urlRedirects', shortPath);
  const docSnap = await getDoc(docRef);
  return !docSnap.exists();
}

/**
 * 3. Create a new URL redirect object
 */
export async function createUrlRedirect(
  shortPath: string,
  originalUrl: string,
  label: string,
  ownerId: string
): Promise<void> {
  const docRef = doc(db, 'urlRedirects', shortPath);
  await setDoc(docRef, {
    originalUrl,
    label,
    count: 0,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * 4. Delete a URL redirect object
 */
export async function deleteUrlRedirect(shortPath: string): Promise<void> {
  const docRef = doc(db, 'urlRedirects', shortPath);
  await deleteDoc(docRef);
}

/**
 * 5. Update an existing URL redirect object (handling potential slug changes)
 */
export async function updateUrlRedirect(
  oldShortPath: string,
  newShortPath: string,
  originalUrl: string,
  label: string,
  ownerId: string,
  currentCount: number,
  createdAt: any,
  isThirdParty?: boolean
): Promise<void> {
  if (oldShortPath !== newShortPath) {
    // If slug changed, verify new slug isn't already taken
    const isAvailable = await checkShortPathAvailability(newShortPath);
    if (!isAvailable) {
      throw new Error(`The short path "${newShortPath}" is already taken by another link.`);
    }

    // Set new document with copy of data + modifications
    const newDocRef = doc(db, 'urlRedirects', newShortPath);
    await setDoc(newDocRef, {
      originalUrl,
      label,
      count: currentCount,
      ownerId,
      createdAt: createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      isThirdParty: isThirdParty || false,
    });

    // Delete old document
    await deleteUrlRedirect(oldShortPath);
  } else {
    // Same slug, just write/overwrite the existing doc ID
    const docRef = doc(db, 'urlRedirects', oldShortPath);
    await setDoc(docRef, {
      originalUrl,
      label,
      count: currentCount,
      ownerId,
      createdAt: createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      isThirdParty: isThirdParty || false,
    });
  }
}
