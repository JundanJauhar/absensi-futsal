/**
 * FTMS Face Descriptor Store
 *
 * Source of truth: Laravel API (PostgreSQL) — so a face enrolled on the laptop
 * is recognised on the phone/kiosk too.
 * IndexedDB (idb-keyval) is only used as an offline cache. Enrollments that
 * exist only in this browser's IndexedDB (created before server sync existed)
 * are uploaded to the server automatically.
 */

import { get, set, del, keys } from 'idb-keyval';
import {
  registerPlayerFace,
  getPlayerFace,
  getFaceDescriptors,
  deletePlayerFace,
} from './api';

export interface StoredFaceData {
  playerId: string;
  playerName: string;
  jersey: string;
  descriptors: number[][]; // Array of 128-dim descriptor arrays
  trainingPhotos: string[]; // base64 photos used for training (local cache only)
  registeredAt: string;
  syncedAt?: string; // set once the entry exists on the server
}

export interface FaceStatus {
  registered: boolean;
  samples: number;
  photo: string | null;
  registeredAt: string | null;
}

const DB_PREFIX = 'ftms_face_';

function faceKey(playerId: string): string {
  return `${DB_PREFIX}${playerId}`;
}

async function getLocalFaceData(playerId: string): Promise<StoredFaceData | undefined> {
  try {
    return await get(faceKey(playerId));
  } catch {
    return undefined;
  }
}

async function getAllLocalFaceData(): Promise<StoredFaceData[]> {
  try {
    const allKeys = await keys();
    const faceKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(DB_PREFIX));
    const results: StoredFaceData[] = [];
    for (const key of faceKeys) {
      const data = await get(key);
      if (data) results.push(data as StoredFaceData);
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Center-crop to a square and downscale a captured frame so it is small
 * enough to store in the database and use as a profile photo (~15-40 KB).
 */
export function compressAvatar(dataUrl: string, size = 320, quality = 0.8): Promise<string> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !dataUrl) return resolve(dataUrl);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function roundDescriptor(desc: number[]): number[] {
  return desc.map(v => Math.round(v * 1e6) / 1e6);
}

/**
 * Save face descriptors for a player to the server (and cache locally).
 * `avatarPhoto` should be the frontal capture; it becomes the profile photo.
 * Throws if the server could not store the data.
 */
export async function saveFaceData(data: StoredFaceData, avatarPhoto?: string | null): Promise<{ photo: string | null }> {
  const photo = avatarPhoto ? await compressAvatar(avatarPhoto) : null;
  const result = await registerPlayerFace(data.playerId, {
    descriptors: data.descriptors.map(roundDescriptor),
    photo,
  });

  try {
    await set(faceKey(data.playerId), { ...data, syncedAt: new Date().toISOString() });
  } catch {
    // Local cache is optional
  }

  return { photo: result.photo ?? photo };
}

/**
 * Registration status of a player as known by the server.
 */
export async function getFaceStatus(playerId: string): Promise<FaceStatus> {
  try {
    const res = await getPlayerFace(playerId);
    return {
      registered: res.registered,
      samples: res.samples,
      photo: res.photo,
      registeredAt: res.registered_at,
    };
  } catch {
    const local = await getLocalFaceData(playerId);
    return {
      registered: !!local && local.descriptors.length > 0,
      samples: local?.descriptors.length ?? 0,
      photo: local?.trainingPhotos?.[0] ?? null,
      registeredAt: local?.registeredAt ?? null,
    };
  }
}

/**
 * Get face data for a specific player (local cache).
 */
export async function getFaceData(playerId: string): Promise<StoredFaceData | undefined> {
  return getLocalFaceData(playerId);
}

/**
 * Delete face data for a player (server + local cache)
 */
export async function deleteFaceData(playerId: string): Promise<void> {
  await deletePlayerFace(playerId);
  try {
    await del(faceKey(playerId));
  } catch {}
}

/**
 * Upload enrollments that only exist in this browser to the server.
 */
async function pushLocalOnlyFaces(serverPlayerIds: Set<string>): Promise<number> {
  const locals = await getAllLocalFaceData();
  let pushed = 0;
  for (const local of locals) {
    if (local.syncedAt) continue;
    if (serverPlayerIds.has(String(local.playerId))) {
      // Server already has a (possibly newer) enrollment: keep the server one
      try { await set(faceKey(local.playerId), { ...local, syncedAt: new Date().toISOString() }); } catch {}
      continue;
    }
    if (!local.descriptors?.length) continue;
    try {
      await saveFaceData(local, local.trainingPhotos?.[0] ?? null);
      pushed++;
    } catch (err) {
      console.warn('[FaceStore] Failed to upload local face data for player', local.playerId, err);
    }
  }
  return pushed;
}

/**
 * Get all registered face data (for matching during kiosk attendance).
 * Server first; falls back to the local cache when offline.
 */
export async function getAllFaceData(): Promise<StoredFaceData[]> {
  try {
    let server = await getFaceDescriptors();
    const pushed = await pushLocalOnlyFaces(new Set(server.map(s => String(s.player_id))));
    if (pushed > 0) server = await getFaceDescriptors();

    const mapped: StoredFaceData[] = server.map(s => ({
      playerId: String(s.player_id),
      playerName: s.name,
      jersey: s.jersey,
      descriptors: s.descriptors,
      trainingPhotos: [],
      registeredAt: s.registered_at ?? '',
      syncedAt: new Date().toISOString(),
    }));

    // Refresh offline cache (keeps any locally cached photos)
    for (const entry of mapped) {
      try {
        const local = await getLocalFaceData(entry.playerId);
        await set(faceKey(entry.playerId), { ...entry, trainingPhotos: local?.trainingPhotos ?? [] });
      } catch {}
    }
    // Drop cached entries that were removed on the server
    const serverIds = new Set(mapped.map(m => m.playerId));
    for (const local of await getAllLocalFaceData()) {
      if (local.syncedAt && !serverIds.has(String(local.playerId))) {
        try { await del(faceKey(local.playerId)); } catch {}
      }
    }

    return mapped;
  } catch (err) {
    console.warn('[FaceStore] Server unavailable, using local face cache', err);
    return getAllLocalFaceData();
  }
}

/**
 * Upload any enrollment that exists only in this browser (e.g. faces that
 * were registered on the laptop before server sync existed).
 * Safe to call on every app start.
 */
export async function syncLocalFacesToServer(): Promise<number> {
  const locals = await getAllLocalFaceData();
  if (!locals.some(l => !l.syncedAt)) return 0;
  try {
    const server = await getFaceDescriptors();
    return await pushLocalOnlyFaces(new Set(server.map(s => String(s.player_id))));
  } catch {
    return 0;
  }
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
  const status = await getFaceStatus(playerId);
  return status.photo;
}

/**
 * Count total registered faces
 */
export async function countRegisteredFaces(): Promise<number> {
  try {
    return (await getFaceDescriptors()).length;
  } catch {
    return (await getAllLocalFaceData()).length;
  }
}
