import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GestureType } from '@/types/christmas';

interface UseHandGestureOptions {
  enabled: boolean;
  onGestureChange?: (gesture: GestureType) => void;
}

interface HandGestureResult {
  gesture: GestureType;
  handPosition: { x: number; y: number } | null;
  pinchDistance: number;
  isTracking: boolean;
  cameraPermission: 'pending' | 'granted' | 'denied' | 'prompt';
  isInitializing: boolean;
  requestCameraPermission: () => Promise<void>;
}

export function useHandGesture({ enabled, onGestureChange }: UseHandGestureOptions): HandGestureResult {
  const [gesture, setGesture] = useState<GestureType>('none');
  const [handPosition, setHandPosition] = useState<{ x: number; y: number } | null>(null);
  const [pinchDistance, setPinchDistance] = useState(1);
  const [isTracking, setIsTracking] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<'pending' | 'granted' | 'denied' | 'prompt'>('prompt');
  const [isInitializing, setIsInitializing] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const lastGestureRef = useRef<GestureType>('none');
  const onGestureChangeRef = useRef(onGestureChange);

  // Keep onGestureChange ref updated
  useEffect(() => {
    onGestureChangeRef.current = onGestureChange;
  }, [onGestureChange]);

  const calculateFingerDistance = useCallback((landmarks: any[], finger1: number, finger2: number) => {
    const p1 = landmarks[finger1];
    const p2 = landmarks[finger2];
    return Math.sqrt(
      Math.pow(p1.x - p2.x, 2) + 
      Math.pow(p1.y - p2.y, 2) + 
      Math.pow(p1.z - p2.z, 2)
    );
  }, []);

  const detectGesture = useCallback((landmarks: any[]): GestureType => {
    if (!landmarks || landmarks.length < 21) return 'none';

    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const indexMcp = landmarks[5];
    const middleMcp = landmarks[9];
    const ringMcp = landmarks[13];
    const pinkyMcp = landmarks[17];

    // Check pinch (thumb to index distance)
    const pinchDist = calculateFingerDistance(landmarks, 4, 8);
    if (pinchDist < 0.06) {
      return 'pinch';
    }

    // Check if fingers are extended
    const indexExtended = indexTip.y < indexMcp.y;
    const middleExtended = middleTip.y < middleMcp.y;
    const ringExtended = ringTip.y < ringMcp.y;
    const pinkyExtended = pinkyTip.y < pinkyMcp.y;

    const extendedCount = [indexExtended, middleExtended, ringExtended, pinkyExtended].filter(Boolean).length;

    if (extendedCount >= 3) return 'open';
    if (extendedCount <= 1) return 'fist';
    if (indexExtended && !middleExtended && !ringExtended && !pinkyExtended) return 'pointing';

    return 'none';
  }, [calculateFingerDistance]);

  const handleResults = useCallback((results: any) => {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const landmarks = results.multiHandLandmarks[0];
      const detectedGesture = detectGesture(landmarks);
      
      const palmCenter = landmarks[9];
      const newHandPosition = {
        x: 1 - palmCenter.x,
        y: palmCenter.y,
      };
      const newPinchDistance = calculateFingerDistance(landmarks, 4, 8);

      if (detectedGesture !== lastGestureRef.current) {
        lastGestureRef.current = detectedGesture;
        onGestureChangeRef.current?.(detectedGesture);
      }

      setGesture(detectedGesture);
      setHandPosition(newHandPosition);
      setPinchDistance(newPinchDistance);
      setIsTracking(true);
    } else {
      setIsTracking(false);
      setHandPosition(null);
    }
  }, [detectGesture, calculateFingerDistance]);

  const requestCameraPermission = useCallback(async () => {
    if (isInitializing) return;
    
    setIsInitializing(true);
    setCameraPermission('pending');

    try {
      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, facingMode: 'user' } 
      });
      stream.getTracks().forEach(track => track.stop());
      
      setCameraPermission('granted');
      
      // Initialize MediaPipe
      const { Hands } = await import('@mediapipe/hands');
      const { Camera } = await import('@mediapipe/camera_utils');

      const video = document.createElement('video');
      video.style.display = 'none';
      video.playsInline = true;
      video.muted = true;
      document.body.appendChild(video);
      videoRef.current = video;

      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      });

      hands.onResults(handleResults);
      handsRef.current = hands;

      const camera = new Camera(video, {
        onFrame: async () => {
          if (handsRef.current && videoRef.current) {
            await handsRef.current.send({ image: videoRef.current });
          }
        },
        width: 640,
        height: 480,
      });

      cameraRef.current = camera;
      await camera.start();
      
      console.log('Camera and MediaPipe initialized successfully');
    } catch (error) {
      console.warn('Camera permission denied or MediaPipe failed:', error);
      setCameraPermission('denied');
    } finally {
      setIsInitializing(false);
    }
  }, [isInitializing, handleResults]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cameraRef.current) {
        cameraRef.current.stop();
      }
      if (videoRef.current) {
        videoRef.current.remove();
      }
    };
  }, []);

  return useMemo(() => ({
    gesture,
    handPosition,
    pinchDistance,
    isTracking,
    cameraPermission,
    isInitializing,
    requestCameraPermission,
  }), [gesture, handPosition, pinchDistance, isTracking, cameraPermission, isInitializing, requestCameraPermission]);
}
