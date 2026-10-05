/**
 * FTMS Face Recognition Service
 * Runs 100% in the browser using face-api.js (TensorFlow.js)
 * No server required - works on phone only!
 * Lazy dynamic import to ensure zero SSR / prerender issues in Next.js.
 */

let faceapiInstance: any = null;
let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

const MODEL_URL = '/models';

/**
 * Safely get face-api instance in client browser
 */
export async function getFaceApi(): Promise<any> {
  if (typeof window === 'undefined') return null;
  if (!faceapiInstance) {
    faceapiInstance = await import('@vladmandic/face-api');
  }
  return faceapiInstance;
}

/**
 * Load face-api.js models (cached by browser after first load)
 */
export async function loadModels(): Promise<void> {
  if (typeof window === 'undefined') return;
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      const faceapi = await getFaceApi();
      if (!faceapi) return;

      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      modelsLoaded = true;
      console.log('[FaceService] Models loaded successfully in browser');
    } catch (err) {
      console.error('[FaceService] Failed to load models:', err);
      loadingPromise = null;
      throw err;
    }
  })();

  return loadingPromise;
}

export function areModelsLoaded(): boolean {
  return modelsLoaded;
}

/**
 * Detect all faces in a video/image element and return their descriptors
 */
export async function detectFaces(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<any[]> {
  if (typeof window === 'undefined') return [];
  if (!modelsLoaded) await loadModels();

  const faceapi = await getFaceApi();
  if (!faceapi) return [];

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  const detections = await faceapi
    .detectAllFaces(input, options)
    .withFaceLandmarks(true)
    .withFaceDescriptors();

  return detections;
}

/**
 * Detect a single face (best detection) and return its descriptor
 */
export async function detectSingleFace(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<Float32Array | null> {
  if (typeof window === 'undefined') return null;
  if (!modelsLoaded) await loadModels();

  const faceapi = await getFaceApi();
  if (!faceapi) return null;

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 416,
    scoreThreshold: 0.5,
  });

  const detection = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  return detection?.descriptor || null;
}

/**
 * Compare two face descriptors using Euclidean distance
 * Lower = more similar. Threshold typically 0.6
 */
export function computeDistance(
  d1: Float32Array | number[],
  d2: Float32Array | number[]
): number {
  let sum = 0;
  const len = Math.min(d1.length, d2.length);
  for (let i = 0; i < len; i++) {
    const diff = d1[i] - d2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Match a face descriptor against a list of known descriptors
 * Returns the best match or null if no match within threshold
 */
export function findBestMatch(
  queryDescriptor: Float32Array,
  knownFaces: { playerId: string; name: string; descriptor: Float32Array }[],
  threshold: number = 0.6
): { playerId: string; name: string; distance: number } | null {
  if (knownFaces.length === 0) return null;

  let bestMatch: { playerId: string; name: string; distance: number } | null = null;

  for (const known of knownFaces) {
    const distance = computeDistance(queryDescriptor, known.descriptor);
    if (distance < threshold && (!bestMatch || distance < bestMatch.distance)) {
      bestMatch = {
        playerId: known.playerId,
        name: known.name,
        distance,
      };
    }
  }

  return bestMatch;
}

/**
 * Capture a frame from a video element as a base64 image
 */
export function captureFrame(video: HTMLVideoElement, quality: number = 0.8): string {
  if (typeof document === 'undefined') return '';
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth || 640;
  canvas.height = video.videoHeight || 480;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(video, 0, 0);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Extract face descriptor from a base64 image string
 */
export async function descriptorFromImage(imageDataUrl: string): Promise<Float32Array | null> {
  if (typeof window === 'undefined') return null;
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = async () => {
      try {
        const descriptor = await detectSingleFace(img);
        resolve(descriptor);
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = imageDataUrl;
  });
}

/**
 * Get face bounding box as percentages for overlay rendering
 */
export function getBoxAsPercent(
  detection: any,
  inputWidth: number,
  inputHeight: number
) {
  const box = detection?.box || detection;
  if (!box || !inputWidth || !inputHeight) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  return {
    x: (box.x / inputWidth) * 100,
    y: (box.y / inputHeight) * 100,
    w: (box.width / inputWidth) * 100,
    h: (box.height / inputHeight) * 100,
  };
}

export interface FaceDetails {
  box: { x: number; y: number; width: number; height: number };
  score: number;
  descriptor: Float32Array;
  pose: {
    yaw: 'front' | 'left' | 'right';
    pitch: 'level' | 'up' | 'down';
    yawRatio: number;
  };
  quality: {
    isCentered: boolean;
    isGoodDistance: boolean;
    isTooClose: boolean;
    isTooFar: boolean;
    isGoodScore: boolean;
    isGoodQuality: boolean;
  };
}

/**
 * Detect single face with rich facial landmarks, pose estimation, and quality metrics
 */
export async function detectFaceWithDetails(
  input: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement
): Promise<FaceDetails | null> {
  if (typeof window === 'undefined') return null;
  if (!modelsLoaded) await loadModels();

  const faceapi = await getFaceApi();
  if (!faceapi) return null;

  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: 320,
    scoreThreshold: 0.5,
  });

  const res = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  if (!res) return null;

  const inputWidth = (input as any).videoWidth || (input as any).naturalWidth || (input as any).width || 640;
  const inputHeight = (input as any).videoHeight || (input as any).naturalHeight || (input as any).height || 480;

  const box = res.detection.box;
  const score = res.detection.score;
  const positions = res.landmarks?.positions || [];

  let yaw: 'front' | 'left' | 'right' = 'front';
  let pitch: 'level' | 'up' | 'down' = 'level';
  let yawRatio = 1.0;

  if (positions.length >= 68) {
    const nose = positions[30];
    const leftEyeX = (positions[36].x + positions[39].x) / 2;
    const rightEyeX = (positions[42].x + positions[45].x) / 2;
    const eyeY = (positions[36].y + positions[45].y) / 2;
    const chinY = positions[8].y;

    const dLeft = Math.max(1, Math.abs(nose.x - leftEyeX));
    const dRight = Math.max(1, Math.abs(rightEyeX - nose.x));
    yawRatio = dLeft / dRight;

    if (yawRatio > 1.45) {
      yaw = 'right';
    } else if (yawRatio < 0.65) {
      yaw = 'left';
    } else {
      yaw = 'front';
    }

    const eyeToNose = nose.y - eyeY;
    const noseToChin = chinY - nose.y;
    if (noseToChin > 0) {
      const pitchRatio = eyeToNose / noseToChin;
      if (pitchRatio < 0.5) pitch = 'up';
      else if (pitchRatio > 1.35) pitch = 'down';
      else pitch = 'level';
    }
  }

  const widthRatio = box.width / inputWidth;
  const centerX = (box.x + box.width / 2) / inputWidth;
  const centerY = (box.y + box.height / 2) / inputHeight;

  const isTooClose = widthRatio > 0.65;
  const isTooFar = widthRatio < 0.20;
  const isGoodDistance = !isTooClose && !isTooFar;
  const isCentered = centerX >= 0.25 && centerX <= 0.75 && centerY >= 0.20 && centerY <= 0.80;
  const isGoodScore = score >= 0.70;
  const isGoodQuality = isGoodDistance && isCentered && isGoodScore;

  return {
    box: { x: box.x, y: box.y, width: box.width, height: box.height },
    score,
    descriptor: res.descriptor,
    pose: { yaw, pitch, yawRatio },
    quality: {
      isCentered,
      isGoodDistance,
      isTooClose,
      isTooFar,
      isGoodScore,
      isGoodQuality,
    },
  };
}
