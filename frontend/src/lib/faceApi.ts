'use client';

// face-api.js utilities for Doc Drive
// Models are loaded from /public/models directory
// Download models from: https://github.com/vladmandic/face-api/tree/master/model

let modelsLoaded = false;

/**
 * Dynamically loads face-api.js and its models
 */
export const loadFaceModels = async (): Promise<void> => {
  if (modelsLoaded) return;

  const faceapi = await import('face-api.js');
  const MODEL_URL = '/models';

  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
  ]);

  modelsLoaded = true;
};

/**
 * Detects a face in a video element and returns the 128D embedding
 */
export const getFaceEmbedding = async (
  videoElement: HTMLVideoElement
): Promise<number[] | null> => {
  const faceapi = await import('face-api.js');

  const detection = await faceapi
    .detectSingleFace(videoElement, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return Array.from(detection.descriptor);
};

/**
 * Checks if a face is detectable in the video feed
 */
export const isFaceDetected = async (
  videoElement: HTMLVideoElement
): Promise<boolean> => {
  const faceapi = await import('face-api.js');
  const detection = await faceapi.detectSingleFace(
    videoElement,
    new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 })
  );
  return !!detection;
};
