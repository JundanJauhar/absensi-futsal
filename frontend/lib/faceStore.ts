/**
 * FTMS Face Descriptor Store
 * Stores face descriptors in IndexedDB via idb-keyval for persistence
 * Each player can have multiple descriptors (from multiple training photos)
 */

import { get, set, del, keys } from 'idb-keyval';

export interface StoredFaceData {
  playerId: string;
  playerName: string;
  jersey: string;
  descriptors: number[][]; // Array of 128-dim descriptor arrays
  trainingPhotos: string[]; // base64 photos used for training
  registeredAt: string;
}

const DB_PREFIX = 'ftms_face_';

function faceKey(playerId: string): string {
  return `${DB_PREFIX}${playerId}`;
}

/**
 * Save face descriptors for a player
 */
export async function saveFaceData(data: StoredFaceData): Promise<void> {
  await set(faceKey(data.playerId), data);
}

/**
 * Get face data for a specific player
 */
export async function getFaceData(playerId: string): Promise<StoredFaceData | undefined> {
  return await get(faceKey(playerId));
}

/**
 * Delete face data for a player
 */
export async function deleteFaceData(playerId: string): Promise<void> {
  await del(faceKey(playerId));
}

/**
 * Get all registered face data (for matching during kiosk attendance)
 */
export async function getAllFaceData(): Promise<StoredFaceData[]> {
  const allKeys = await keys();
  const faceKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(DB_PREFIX));
  
  const results: StoredFaceData[] = [];
  for (const key of faceKeys) {
    const data = await get(key);
    if (data) results.push(data as StoredFaceData);
  }
  
  return results;
}

/**
 * Convert stored number arrays back to Float32Array for face-api.js matching
 */
export function toFloat32Descriptors(
  allFaces: StoredFaceData[]
): { playerId: string; name: string; descriptor: Float32Array }[] {
  const result: { playerId: string; name: string; descriptor: Float32Array }[] = [];

  for (const face of allFaces) {
    for (const desc of face.descriptors) {
      result.push({
        playerId: face.playerId,
        name: face.playerName,
        descriptor: new Float32Array(desc),
      });
    }
  }

  return result;
}

/**
 * Add a new descriptor to an existing player's face data
 */
export async function addDescriptorToPlayer(
  playerId: string,
  descriptor: Float32Array,
  photo?: string
): Promise<void> {
  const existing = await getFaceData(playerId);
  if (existing) {
    existing.descriptors.push(Array.from(descriptor));
    if (photo) existing.trainingPhotos.push(photo);
    await saveFaceData(existing);
  }
}

/**
 * Get the first training photo as the player's auto-profile
 */
export async function getAutoProfilePhoto(playerId: string): Promise<string | null> {
  const data = await getFaceData(playerId);
  if (data && data.trainingPhotos.length > 0) {
    return data.trainingPhotos[0];
  }
  return null;
}

/**
 * Count total registered faces
 */
export async function countRegisteredFaces(): Promise<number> {
  const allKeys = await keys();
  return allKeys.filter(k => typeof k === 'string' && k.startsWith(DB_PREFIX)).length;
}
