import * as faceapi from 'face-api.js';

export type FaceEmbeddingResult = {
  embedding: number[] | null;
  detected: boolean;
  box?: { x: number; y: number; width: number; height: number };
  score?: number;
  error?: string;
};

let modelsLoaded = false;
// Default to a reliable CDN hosting compatible model files
// You can self-host and override via VITE_FACE_MODEL_BASE_URL or by passing baseUrl to loadFaceModels()
let modelBaseUrl = (import.meta as any)?.env?.VITE_FACE_MODEL_BASE_URL ||
  'https://cdn.jsdelivr.net/gh/vladmandic/face-api/model/';

export async function loadFaceModels(baseUrl?: string) {
  if (modelsLoaded) return;
  if (baseUrl) modelBaseUrl = baseUrl;

  // Load TinyFaceDetector + Landmarks + Recognition
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(modelBaseUrl),
    faceapi.nets.faceLandmark68Net.loadFromUri(modelBaseUrl),
    faceapi.nets.faceRecognitionNet.loadFromUri(modelBaseUrl),
  ]);
  modelsLoaded = true;
}

export async function getUserMediaStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Navegador não suporta acesso à câmera');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: 'user',
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 },
    },
    audio: false,
  });
  return stream;
}

export function attachStreamToVideo(video: HTMLVideoElement, stream: MediaStream) {
  video.srcObject = stream;
  return new Promise<void>((resolve) => {
    video.onloadedmetadata = () => {
      video.play().then(() => resolve()).catch(() => resolve());
    };
  });
}

export function stopStream(stream?: MediaStream | null) {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}

export async function extractEmbeddingFromVideo(video: HTMLVideoElement): Promise<FaceEmbeddingResult> {
  try {
    if (!modelsLoaded) await loadFaceModels();
    // Ensure the video has valid dimensions
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      return { embedding: null, detected: false };
    }
    const detection = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return { embedding: null, detected: false };
    }

    const descriptor = Array.from(detection.descriptor);
    const box = detection.detection.box;

    return {
      embedding: descriptor,
      detected: true,
      score: detection.detection.score,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
    };
  } catch (error: any) {
    return { embedding: null, detected: false, error: error?.message ?? 'Erro ao extrair embedding' };
  }
}

export async function waitForVideoReady(video: HTMLVideoElement, timeoutMs = 5000): Promise<boolean> {
  if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) return true;
  return new Promise((resolve) => {
    let resolved = false;
    const onReady = () => {
      if (!resolved && video.videoWidth > 0 && video.videoHeight > 0) {
        resolved = true;
        cleanup();
        resolve(true);
      }
    };
    const onLoadedMeta = () => onReady();
    const onLoadedData = () => onReady();

    const t = window.setTimeout(() => {
      if (!resolved) {
        resolved = true;
        cleanup();
        resolve(false);
      }
    }, timeoutMs);

    const cleanup = () => {
      video.removeEventListener('loadedmetadata', onLoadedMeta);
      video.removeEventListener('loadeddata', onLoadedData);
      window.clearTimeout(t);
    };

    video.addEventListener('loadedmetadata', onLoadedMeta);
    video.addEventListener('loadeddata', onLoadedData);
  });
}

// Simple liveness: ensure head moved horizontally between two frames
export async function livenessHeadMove(
  video: HTMLVideoElement,
  samples = 3,
  minHorizontalShiftPx = 20
): Promise<boolean> {
  if (!modelsLoaded) await loadFaceModels();

  let prevNoseX: number | null = null;
  let moves = 0;

  for (let i = 0; i < samples; i++) {
    if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
      await new Promise((r) => setTimeout(r, 250));
      continue;
    }
    const det = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
      .withFaceLandmarks();

    if (det && det.landmarks) {
      const nose = det.landmarks.getNose();
      const currX = nose.reduce((acc, p) => acc + p.x, 0) / nose.length;
      if (prevNoseX !== null && Math.abs(currX - prevNoseX) >= minHorizontalShiftPx) {
        moves++;
      }
      prevNoseX = currX;
    }

    await new Promise((r) => setTimeout(r, 450));
  }

  return moves >= 1;
}
