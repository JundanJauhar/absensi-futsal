'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, Upload, CheckCircle2, AlertCircle, RefreshCw, 
  ChevronLeft, Loader2, Sparkles, Volume2, VolumeX, 
  SwitchCamera, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, 
  Smile, UserCheck, ShieldCheck, Check
} from 'lucide-react';
import Link from 'next/link';

import { 
  loadModels, 
  detectFaceWithDetails, 
  captureFrame, 
  areModelsLoaded, 
  FaceDetails,
  detectSingleFace 
} from '@/lib/faceService';
import { saveFaceData, getFaceData, StoredFaceData } from '@/lib/faceStore';
import { getPlayer } from '@/lib/api';
import { updateStoredPlayer, PlayerData } from '@/lib/dataStore';
import type { Player } from '@/types/player';

function toPlayerData(player: Player): PlayerData {
  const positions: Record<Player["primary_position"], PlayerData["position"]> = {
    goalkeeper: "Kiper",
    anchor: "Anchor",
    flank: "Flank",
    pivot: "Pivot",
  };
  return {
    id: String(player.id),
    name: player.full_name,
    jersey: String(player.jersey_number),
    position: positions[player.primary_position],
    secondaryPosition: player.secondary_position ? positions[player.secondary_position] : undefined,
    status: player.status === "active" ? "Aktif" : "Nonaktif",
    faceRegistered: player.face_registered,
    avatarUrl: player.profile_photo ?? "",
    joinDate: player.joined_at,
    notes: player.notes ?? undefined,
  };
}

// 10 Guided Auto-Capture Steps for High-Quality Multi-Angle Biometrics
interface PoseStep {
  id: string;
  label: string;
  instruction: string;
  expectedYaw: 'front' | 'left' | 'right' | 'any';
  expectedPitch: 'level' | 'up' | 'down' | 'any';
  icon: any;
}

const ENROLLMENT_STEPS: PoseStep[] = [
  { id: 'front_1', label: 'Tatap Depan', instruction: 'Tatap lurus ke arah kamera', expectedYaw: 'front', expectedPitch: 'level', icon: UserCheck },
  { id: 'front_2', label: 'Tatap Depan (Fokus)', instruction: 'Tetap tenang dan tatap lurus', expectedYaw: 'front', expectedPitch: 'level', icon: UserCheck },
  { id: 'left_1', label: 'Tengok Sedikit Kiri', instruction: 'Putar wajah perlahan ke kiri', expectedYaw: 'left', expectedPitch: 'any', icon: ArrowLeft },
  { id: 'left_2', label: 'Tengok Kiri Penuh', instruction: 'Tengok ke kiri sedikit lagi', expectedYaw: 'left', expectedPitch: 'any', icon: ArrowLeft },
  { id: 'right_1', label: 'Tengok Sedikit Kanan', instruction: 'Putar wajah perlahan ke kanan', expectedYaw: 'right', expectedPitch: 'any', icon: ArrowRight },
  { id: 'right_2', label: 'Tengok Kanan Penuh', instruction: 'Tengok ke kanan sedikit lagi', expectedYaw: 'right', expectedPitch: 'any', icon: ArrowRight },
  { id: 'up', label: 'Tengadah Sedikit', instruction: 'Angkat sedikit dagu ke atas', expectedYaw: 'any', expectedPitch: 'up', icon: ArrowUp },
  { id: 'down', label: 'Tunduk Sedikit', instruction: 'Tundukkan sedikit kepala', expectedYaw: 'any', expectedPitch: 'down', icon: ArrowDown },
  { id: 'smile', label: 'Senyum Alami', instruction: 'Tersenyum santai ke kamera', expectedYaw: 'front', expectedPitch: 'level', icon: Smile },
  { id: 'final', label: 'Verifikasi Akhir', instruction: 'Tatap lurus untuk konfirmasi final', expectedYaw: 'front', expectedPitch: 'level', icon: Sparkles },
];

const TOTAL_SAMPLES = ENROLLMENT_STEPS.length;

export default function FaceRegistrationPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [existingFaceData, setExistingFaceData] = useState<StoredFaceData | null>(null);
  
  // Modes: 'loading' | 'existing_prompt' | 'enrolling' | 'upload_mode' | 'success'
  const [mode, setMode] = useState<'loading' | 'existing_prompt' | 'enrolling' | 'upload_mode' | 'success'>('loading');
  const [modelsReady, setModelsReady] = useState(false);
  const [modelsProgress, setModelsProgress] = useState('Memuat model AI...');
  
  // Camera & Stream
  const videoRef = useRef<HTMLVideoElement>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  
  // Auto-Enrollment State
  const [stepIndex, setStepIndex] = useState(0);
  const [captures, setCaptures] = useState<{ stepId: string; photo: string; descriptor: Float32Array; isFrontal: boolean }[]>([]);
  const [currentFeedback, setCurrentFeedback] = useState('Posisikan wajah di dalam bingkai oval');
  const [isPoseMatched, setIsPoseMatched] = useState(false);
  const [isQualityGood, setIsQualityGood] = useState(false);
  const [flashEffect, setFlashEffect] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Quality Metrics for Realtime UI Indicator
  const [liveQuality, setLiveQuality] = useState<{
    faceDetected: boolean;
    lighting: 'good' | 'low' | 'high';
    distance: 'ideal' | 'too_close' | 'too_far';
    alignment: 'centered' | 'offset';
    detectedPose: string;
  }>({
    faceDetected: false,
    lighting: 'good',
    distance: 'ideal',
    alignment: 'centered',
    detectedPose: 'Lurus',
  });

  // Processing & Saving
  const [isSaving, setIsSaving] = useState(false);
  const [savedAvatarUrl, setSavedAvatarUrl] = useState<string | null>(null);

  // References for Loop Control
  const isLoopRunning = useRef(false);
  const lastCaptureTime = useRef(0);
  const currentStepIndexRef = useRef(0);
  const capturesRef = useRef<{ stepId: string; photo: string; descriptor: Float32Array; isFrontal: boolean }[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Keep refs in sync with state
  useEffect(() => {
    currentStepIndexRef.current = stepIndex;
  }, [stepIndex]);

  useEffect(() => {
    capturesRef.current = captures;
  }, [captures]);

  // Audio Beep generator
  const triggerAudioCue = useCallback((freq = 880, duration = 0.08) => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }, [soundEnabled]);

  // Haptic Feedback
  const triggerHaptic = useCallback((ms = 40) => {
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      try { navigator.vibrate(ms); } catch {}
    }
  }, []);

  // 1. Initial Load: Fetch player & check models & existing face data
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      let p: PlayerData;
      try {
        p = toPlayerData(await getPlayer(Number(playerId)));
      } catch {
        router.push('/players');
        return;
      }
      if (mounted) setPlayer(p);

      // Check existing face registration
      try {
        const existing = await getFaceData(playerId);
        if (existing && existing.descriptors.length > 0 && mounted) {
          setExistingFaceData(existing);
          setMode('existing_prompt');
        } else if (mounted) {
          setMode('enrolling');
        }
      } catch (e) {
        console.error('Error fetching face data:', e);
        if (mounted) setMode('enrolling');
      }

      // Load AI models
      try {
        if (!areModelsLoaded()) {
          setModelsProgress('Memuat model biometrik AI...');
          await loadModels();
        }
        if (mounted) {
          setModelsReady(true);
        }
      } catch (err) {
        console.error('Failed to load face models:', err);
        if (mounted) setModelsProgress('Gagal memuat model. Periksa koneksi.');
      }
    };

    initialize();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, [playerId, router]);

  // 2. Camera Controls
  const stopCamera = useCallback(() => {
    isLoopRunning.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError('');
    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(e => {
            if (e.name !== 'AbortError') console.warn('Video play error:', e);
          });
          setIsCameraActive(true);
          isLoopRunning.current = true;
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      let msg = 'Gagal mengakses kamera. Izinkan akses kamera di pengaturan browser.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Izin kamera ditolak. Buka pengaturan browser untuk mengizinkan kamera.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'Kamera tidak ditemukan pada perangkat ini.';
      }
      setCameraError(msg);
      setIsCameraActive(false);
    }
  }, [facingMode]);

  // Automatically start camera when in enrolling mode and models are ready
  useEffect(() => {
    if (mode === 'enrolling' && modelsReady) {
      startCamera();
    }
    return () => {
      if (mode !== 'enrolling') {
        stopCamera();
      }
    };
  }, [mode, modelsReady, startCamera, stopCamera]);

  // 3. Finish and Save All Enrolled Biometrics
  const completeEnrollment = useCallback(async (allCaptures: { stepId: string; photo: string; descriptor: Float32Array; isFrontal: boolean }[]) => {
    if (isSaving) return;
    setIsSaving(true);
    stopCamera();

    try {
      triggerAudioCue(1046, 0.25); // high celebratory chime
      triggerHaptic(80);

      // Best frontal photo becomes the player's avatar
      const frontalCapture = allCaptures.find(c => c.isFrontal) || allCaptures[0];
      const avatarPhoto = frontalCapture?.photo || null;

      const descriptorArrays = allCaptures.map(c => Array.from(c.descriptor));
      const photos = allCaptures.map(c => c.photo);

      // Save to IndexedDB
      await saveFaceData({
        playerId,
        playerName: player?.name || '',
        jersey: player?.jersey || '',
        descriptors: descriptorArrays,
        trainingPhotos: photos,
        registeredAt: new Date().toISOString(),
      });

      // Update Player Profile in Local DataStore & Sync to server
      if (avatarPhoto) {
        updateStoredPlayer(playerId, {
          faceRegistered: true,
          avatarUrl: avatarPhoto,
        });
        setSavedAvatarUrl(avatarPhoto);
      } else {
        updateStoredPlayer(playerId, { faceRegistered: true });
      }

      setMode('success');
    } catch (err) {
      console.error('Error saving enrolled face:', err);
      setCameraError('Gagal menyimpan data biometrik. Coba lagi.');
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, playerId, player, stopCamera, triggerAudioCue, triggerHaptic]);

  // 4. CONTINUOUS AUTOMATIC DETECTION & CAPTURE ENGINE
  useEffect(() => {
    if (!isCameraActive || mode !== 'enrolling' || !modelsReady) return;

    let animId: number;
    let isProcessingFrame = false;

    const processFrame = async () => {
      if (!isLoopRunning.current || !videoRef.current || isProcessingFrame) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      const video = videoRef.current;
      if (video.readyState < 2 || video.paused || video.ended) {
        animId = requestAnimationFrame(processFrame);
        return;
      }

      isProcessingFrame = true;

      try {
        const details: FaceDetails | null = await detectFaceWithDetails(video);

        if (!details) {
          setLiveQuality(prev => ({
            ...prev,
            faceDetected: false,
            detectedPose: 'Tidak Terdeteksi',
          }));
          setCurrentFeedback('Berdiri di depan kamera & posisikan wajah');
          setIsPoseMatched(false);
          setIsQualityGood(false);
          isProcessingFrame = false;
          animId = requestAnimationFrame(processFrame);
          return;
        }

        // Face is present! Evaluate quality & pose
        const { quality, pose, score } = details;
        const currentStep = ENROLLMENT_STEPS[currentStepIndexRef.current];

        // Pose text display
        let poseName = 'Lurus';
        if (pose.yaw === 'left') poseName = 'Tengok Kiri';
        else if (pose.yaw === 'right') poseName = 'Tengok Kanan';
        if (pose.pitch === 'up') poseName += ' & Ke Atas';
        if (pose.pitch === 'down') poseName += ' & Menunduk';

        setLiveQuality({
          faceDetected: true,
          lighting: score > 0.82 ? 'good' : 'low',
          distance: quality.isTooClose ? 'too_close' : quality.isTooFar ? 'too_far' : 'ideal',
          alignment: quality.isCentered ? 'centered' : 'offset',
          detectedPose: poseName,
        });

        // 1. Check distance
        if (quality.isTooFar) {
          setCurrentFeedback('Terlalu jauh, mendekatlah sedikit ke kamera');
          setIsQualityGood(false);
          setIsPoseMatched(false);
          isProcessingFrame = false;
          animId = requestAnimationFrame(processFrame);
          return;
        }

        if (quality.isTooClose) {
          setCurrentFeedback('Terlalu dekat, mundurlah sedikit');
          setIsQualityGood(false);
          setIsPoseMatched(false);
          isProcessingFrame = false;
          animId = requestAnimationFrame(processFrame);
          return;
        }

        // 2. Check framing / centering
        if (!quality.isCentered) {
          setCurrentFeedback('Posisikan wajah tepat di tengah bingkai');
          setIsQualityGood(false);
          setIsPoseMatched(false);
          isProcessingFrame = false;
          animId = requestAnimationFrame(processFrame);
          return;
        }

        setIsQualityGood(true);

        // 3. Check requested pose matching
        let matchesYaw = false;
        if (currentStep.expectedYaw === 'any') matchesYaw = true;
        else if (currentStep.expectedYaw === 'front') matchesYaw = pose.yaw === 'front';
        else if (currentStep.expectedYaw === 'left') matchesYaw = pose.yaw === 'left';
        else if (currentStep.expectedYaw === 'right') matchesYaw = pose.yaw === 'right';

        let matchesPitch = false;
        if (currentStep.expectedPitch === 'any') matchesPitch = true;
        else if (currentStep.expectedPitch === 'level') matchesPitch = pose.pitch === 'level';
        else if (currentStep.expectedPitch === 'up') matchesPitch = pose.pitch === 'up';
        else if (currentStep.expectedPitch === 'down') matchesPitch = pose.pitch === 'down';

        const isPoseCorrect = matchesYaw && matchesPitch;
        setIsPoseMatched(isPoseCorrect);

        if (!isPoseCorrect) {
          setCurrentFeedback(currentStep.instruction);
          isProcessingFrame = false;
          animId = requestAnimationFrame(processFrame);
          return;
        }

        // Pose & Quality MATCHED!
        setCurrentFeedback(`Wajah & pose pas! Tahan posisi... (${currentStepIndexRef.current + 1}/${TOTAL_SAMPLES})`);

        // Check throttle: require at least 550ms between auto-captures
        const now = Date.now();
        if (now - lastCaptureTime.current > 550) {
          lastCaptureTime.current = now;

          // Flash UI & Audio Cue
          setFlashEffect(true);
          setTimeout(() => setFlashEffect(false), 200);
          triggerAudioCue(520 + currentStepIndexRef.current * 40, 0.08);
          triggerHaptic(35);

          // Capture photo frame from video
          const photoUrl = captureFrame(video, 0.85);
          const isFrontal = currentStep.expectedYaw === 'front' && currentStep.expectedPitch === 'level';

          const newCapture = {
            stepId: currentStep.id,
            photo: photoUrl,
            descriptor: details.descriptor,
            isFrontal,
          };

          const updatedCaptures = [...capturesRef.current, newCapture];
          setCaptures(updatedCaptures);

          const nextIndex = currentStepIndexRef.current + 1;

          if (nextIndex < TOTAL_SAMPLES) {
            setStepIndex(nextIndex);
          } else {
            // ALL 10 SAMPLES COLLECTED! Complete enrollment automatically
            isLoopRunning.current = false;
            completeEnrollment(updatedCaptures);
            return;
          }
        }
      } catch (err) {
        console.warn('Frame processing exception:', err);
      } finally {
        isProcessingFrame = false;
      }

      animId = requestAnimationFrame(processFrame);
    };

    animId = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isCameraActive, mode, modelsReady, completeEnrollment, triggerAudioCue, triggerHaptic]);

  // Handle Manual File Upload Mode (Optional Fallback)
  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    setCameraError('');

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        const img = new Image();
        img.src = dataUrl;
        await new Promise(res => { img.onload = res; });

        const descriptor = await detectSingleFace(img);
        if (!descriptor) {
          setCameraError('Wajah tidak terdeteksi pada foto. Gunakan foto selfie yang jelas.');
          setIsSaving(false);
          return;
        }

        const singleCapture = [{
          stepId: 'manual_upload',
          photo: dataUrl,
          descriptor,
          isFrontal: true,
        }];

        await completeEnrollment(singleCapture);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      setCameraError('Gagal memproses file foto.');
      setIsSaving(false);
    }
  };

  // Flip Camera
  const toggleCameraFacing = () => {
    stopCamera();
    setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
  };

  // Manual Trigger for Current Step (Coach can force-capture if player struggles with angle)
  const handleManualForceCapture = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const photoUrl = captureFrame(video, 0.85);

    detectSingleFace(video).then(descriptor => {
      if (!descriptor) {
        setCameraError('Wajah tidak terdeteksi saat tombol ditekan.');
        return;
      }

      const currentStep = ENROLLMENT_STEPS[currentStepIndexRef.current];
      const isFrontal = currentStep.expectedYaw === 'front';
      const newCapture = {
        stepId: currentStep.id,
        photo: photoUrl,
        descriptor,
        isFrontal,
      };

      const updated = [...capturesRef.current, newCapture];
      setCaptures(updated);

      triggerAudioCue(600, 0.08);
      triggerHaptic(40);

      const next = currentStepIndexRef.current + 1;
      if (next < TOTAL_SAMPLES) {
        setStepIndex(next);
      } else {
        completeEnrollment(updated);
      }
    });
  };

  if (!player) {
    return (
      <div className="flex h-screen items-center justify-center bg-dark-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  const currentStep = ENROLLMENT_STEPS[Math.min(stepIndex, TOTAL_SAMPLES - 1)];
  const StepIcon = currentStep.icon;
  const progressPercent = Math.round((captures.length / TOTAL_SAMPLES) * 100);

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50 flex flex-col selection:bg-emerald-500/30">
      
      {/* TOP HEADER */}
      <header className="sticky top-0 z-40 bg-dark-900/80 backdrop-blur-md border-b border-dark-800/80 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link 
            href={`/players/${playerId}`}
            className="w-10 h-10 rounded-xl bg-dark-800/80 border border-dark-700/60 flex items-center justify-center text-dark-200 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
              <span>Auto Face Enrollment</span>
              <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-emerald-500/20 text-emerald-400 rounded-md border border-emerald-500/30">
                Biometric AI
              </span>
            </h1>
            <p className="text-xs text-dark-400">{player.name} • No. #{player.jersey}</p>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            aria-label="Toggle Sound"
            className="w-9 h-9 rounded-xl bg-dark-800/60 border border-dark-700/60 flex items-center justify-center text-dark-300 hover:text-white transition-colors"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-dark-500" />}
          </button>
          {mode === 'enrolling' && (
            <button
              onClick={toggleCameraFacing}
              aria-label="Flip Camera"
              className="w-9 h-9 rounded-xl bg-dark-800/60 border border-dark-700/60 flex items-center justify-center text-dark-300 hover:text-white transition-colors"
            >
              <SwitchCamera className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col p-4 max-w-md w-full mx-auto relative">
        <AnimatePresence mode="wait">

          {/* 1. EXISTING DATA PROMPT */}
          {mode === 'existing_prompt' && existingFaceData && (
            <motion.div
              key="existing_prompt"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="my-auto bg-dark-900/90 border border-dark-800 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <ShieldCheck className="w-10 h-10 text-emerald-400" />
              </div>

              <h2 className="text-xl font-bold text-white mb-1">Wajah Sudah Terdaftar</h2>
              <p className="text-sm text-dark-300 mb-6 leading-relaxed">
                Pemain <span className="text-emerald-400 font-semibold">{player.name}</span> sudah memiliki <span className="font-semibold text-white">{existingFaceData.descriptors.length} sampel biometrik</span> tersimpan di database lokal.
              </p>

              {existingFaceData.trainingPhotos && existingFaceData.trainingPhotos.length > 0 && (
                <div className="flex justify-center gap-2 mb-6">
                  {existingFaceData.trainingPhotos.slice(0, 4).map((p, i) => (
                    <div key={i} className="w-14 h-14 rounded-xl overflow-hidden border border-emerald-500/40">
                      <img src={p} alt={`Sampel ${i}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                <button
                  onClick={() => {
                    setCaptures([]);
                    setStepIndex(0);
                    setMode('enrolling');
                  }}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                >
                  <RefreshCw className="w-5 h-5" />
                  Mulai Auto-Enrollment Ulang
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-3.5 px-4 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 hover:text-white font-medium rounded-2xl flex items-center justify-center gap-2 transition-all"
                >
                  <Upload className="w-5 h-5" />
                  Unggah Foto Tambahan
                </button>

                <Link
                  href={`/players/${playerId}`}
                  className="block w-full py-3 text-sm text-dark-400 hover:text-dark-200 transition-colors"
                >
                  Kembali ke Profil Pemain
                </Link>
              </div>
            </motion.div>
          )}

          {/* 2. AUTOMATIC ENROLLMENT CAMERA VIEW */}
          {mode === 'enrolling' && (
            <motion.div
              key="enrolling"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 flex flex-col justify-between space-y-4"
            >
              {/* Progress & Step Banner */}
              <div className="bg-dark-900/90 border border-dark-800 rounded-2xl p-3 shadow-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isPoseMatched ? 'bg-emerald-500 text-dark-950' : 'bg-dark-800 text-emerald-400'
                    } transition-colors`}>
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-emerald-400">
                        Langkah {stepIndex + 1} / {TOTAL_SAMPLES}
                      </span>
                      <h3 className="text-sm font-semibold text-white leading-tight">
                        {currentStep.label}
                      </h3>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-bold text-dark-300">
                    {captures.length}/{TOTAL_SAMPLES} Sampel ({progressPercent}%)
                  </span>
                </div>

                {/* Progress Bar with multi-segment feel */}
                <div className="w-full h-2 bg-dark-800 rounded-full overflow-hidden flex gap-0.5">
                  {Array.from({ length: TOTAL_SAMPLES }).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-full flex-1 transition-all duration-300 ${
                        i < captures.length 
                          ? 'bg-emerald-400' 
                          : i === captures.length 
                            ? 'bg-emerald-500/50 animate-pulse' 
                            : 'bg-dark-700/50'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Camera Viewport with Oval Biometric Guide */}
              <div className="relative aspect-[3/4] w-full max-w-[340px] mx-auto overflow-hidden rounded-[36px] bg-black border-2 border-dark-800 shadow-2xl flex items-center justify-center">
                {/* Real video feed */}
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />

                {/* Shutter Flash Animation */}
                <AnimatePresence>
                  {flashEffect && (
                    <motion.div
                      initial={{ opacity: 0.8 }}
                      animate={{ opacity: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="absolute inset-0 bg-emerald-400/40 z-30 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* Camera Overlay: Oval Mask & Animated Detection Border */}
                <div className="absolute inset-0 pointer-events-none z-10">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                      <mask id="oval-hole">
                        <rect width="100" height="100" fill="white" />
                        <ellipse cx="50" cy="48" rx="34" ry="42" fill="black" />
                      </mask>
                    </defs>
                    {/* Darkened backdrop outside oval */}
                    <rect width="100" height="100" fill="rgba(2, 6, 23, 0.65)" mask="url(#oval-hole)" />

                    {/* Oval outline guide */}
                    <ellipse
                      cx="50"
                      cy="48"
                      rx="34"
                      ry="42"
                      fill="none"
                      stroke={isPoseMatched && isQualityGood ? '#34d399' : liveQuality.faceDetected ? '#38bdf8' : 'rgba(148, 163, 184, 0.4)'}
                      strokeWidth={isPoseMatched ? "2.5" : "1.5"}
                      strokeDasharray={isPoseMatched ? "none" : "3 2"}
                      className="transition-colors duration-300"
                    />
                  </svg>
                </div>

                {/* Loading Models Indicator */}
                {!modelsReady && (
                  <div className="absolute inset-0 bg-dark-950/90 z-20 flex flex-col items-center justify-center p-6 text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-emerald-400 mb-3" />
                    <p className="text-sm font-medium text-white">{modelsProgress}</p>
                    <p className="text-xs text-dark-400 mt-1">Mengunduh model biometrik ke perangkat...</p>
                  </div>
                )}

                {/* Camera Permission / Error Overlay */}
                {cameraError && (
                  <div className="absolute inset-0 bg-dark-950/95 z-20 flex flex-col items-center justify-center p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
                    <h3 className="text-base font-bold text-white mb-1">Akses Kamera Bermasalah</h3>
                    <p className="text-xs text-dark-300 mb-4">{cameraError}</p>
                    <button
                      onClick={startCamera}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-dark-950 font-bold rounded-xl text-xs transition-colors"
                    >
                      Coba Buka Kamera Lagi
                    </button>
                  </div>
                )}

                {/* Real-time Status Badges on Camera Overlay */}
                <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
                  <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1.5 backdrop-blur-md ${
                    liveQuality.faceDetected 
                      ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' 
                      : 'bg-dark-900/80 border border-dark-700/60 text-dark-300'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${liveQuality.faceDetected ? 'bg-emerald-400 animate-pulse' : 'bg-dark-500'}`} />
                    <span>{liveQuality.faceDetected ? 'Wajah Terdeteksi' : 'Mencari Wajah...'}</span>
                  </div>

                  {liveQuality.faceDetected && (
                    <div className="px-2.5 py-1 rounded-full text-[11px] font-mono bg-dark-900/80 border border-dark-700/60 text-dark-300 backdrop-blur-md">
                      Pose: <span className="text-white font-medium">{liveQuality.detectedPose}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Instruction Bar over Camera */}
                <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-none">
                  <div className={`p-2.5 rounded-2xl backdrop-blur-md border text-center transition-all ${
                    isPoseMatched && isQualityGood
                      ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-200'
                      : 'bg-dark-900/85 border-dark-700/80 text-dark-200'
                  }`}>
                    <p className="text-xs font-semibold tracking-wide">
                      {currentFeedback}
                    </p>
                  </div>
                </div>
              </div>

              {/* Sample Thumbnails Preview Strip */}
              <div className="flex items-center justify-between bg-dark-900/60 border border-dark-800/80 rounded-2xl p-2 px-3">
                <span className="text-xs text-dark-400 font-medium">Sampel biometrik:</span>
                <div className="flex items-center space-x-1.5 overflow-x-auto py-1">
                  {Array.from({ length: TOTAL_SAMPLES }).map((_, i) => {
                    const cap = captures[i];
                    return (
                      <div
                        key={i}
                        className={`w-8 h-8 rounded-lg overflow-hidden border flex-shrink-0 flex items-center justify-center ${
                          cap 
                            ? 'border-emerald-500 bg-emerald-950/40' 
                            : i === captures.length 
                              ? 'border-emerald-400/60 border-dashed bg-dark-800' 
                              : 'border-dark-700/40 bg-dark-900'
                        }`}
                      >
                        {cap ? (
                          <img src={cap.photo} alt={`Sample ${i}`} className="w-full h-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-dark-500 font-mono">{i + 1}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Manual Capture Fallback / Assist Button */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="py-3 px-4 rounded-xl bg-dark-900 hover:bg-dark-800 border border-dark-800 text-dark-300 hover:text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload Foto</span>
                </button>

                <button
                  type="button"
                  onClick={handleManualForceCapture}
                  disabled={!liveQuality.faceDetected || isSaving}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-dark-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/10 transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tangkap Manual Langkah Ini</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* 3. SUCCESS / COMPLETED SCREEN */}
          {mode === 'success' && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="my-auto bg-dark-900/90 border border-dark-800 rounded-3xl p-6 text-center shadow-2xl relative overflow-hidden"
            >
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                <Check className="w-10 h-10 text-emerald-400" />
              </div>

              <h2 className="text-2xl font-extrabold text-white mb-1">Registrasi Biometrik Berhasil!</h2>
              <p className="text-xs text-dark-400 mb-6">
                Sistem telah merekam {captures.length || 10} sampel representasi wajah untuk <span className="text-emerald-400 font-semibold">{player.name}</span>.
              </p>

              {/* New Profile Picture Preview */}
              {savedAvatarUrl && (
                <div className="bg-dark-800/60 border border-dark-700/60 rounded-2xl p-4 mb-6 text-center">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-3">
                    Foto Profil Otomatis Baru
                  </span>
                  <div className="w-24 h-24 rounded-2xl overflow-hidden mx-auto border-2 border-emerald-400/80 shadow-xl">
                    <img src={savedAvatarUrl} alt={player.name} className="w-full h-full object-cover" />
                  </div>
                  <p className="text-xs text-dark-400 mt-2">
                    Foto ini otomatis menjadi avatar resmi pemain dan siap untuk kiosk absensi.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-3">
                <Link
                  href="/kiosk/attendance"
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-dark-950 font-bold rounded-2xl shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Tes Absensi di Kiosk Sekarang
                </Link>

                <Link
                  href={`/players/${playerId}`}
                  className="w-full py-3.5 px-4 bg-dark-800 hover:bg-dark-700 border border-dark-700 text-dark-200 hover:text-white font-medium rounded-2xl flex items-center justify-center transition-colors"
                >
                  Kembali ke Profil Pemain
                </Link>
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Hidden File Input for Gallery Upload */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg, image/png, image/webp"
          onChange={handleUploadFile}
          className="hidden"
        />
      </main>
    </div>
  );
}
