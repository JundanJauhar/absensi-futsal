'use client';

import React, { useEffect, useRef, useState, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Settings, 
  Camera, 
  RefreshCcw, 
  UserPlus, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Vibrate,
  Smartphone,
  ShieldAlert,
  HelpCircle,
  Check,
  Play,
  Pause,
  RotateCcw,
  Calendar,
  Clock,
  MapPin,
  ChevronDown,
  Users,
  Sparkles
} from 'lucide-react';
import clsx from 'clsx';

// Face AI Services
import { 
  loadModels, 
  detectFaces, 
  findBestMatch, 
  getBoxAsPercent, 
  areModelsLoaded 
} from '@/lib/faceService';
import { getAllFaceData, toFloat32Descriptors } from '@/lib/faceStore';

// Shared UI types
import { 
  AttendanceRecord, 
  PlayerData,
  TrainingSessionData,
  AttendanceState
} from '@/lib/dataStore';

// Backend API Services
import { 
  getActiveSession, 
  openSessionAttendance, 
  closeSessionAttendance, 
  reopenSessionAttendance,
  createKioskAttendance,
  getPlayers,
  getAttendance,
} from '@/lib/api';

// UI Components
import { PlayerAvatar } from '@/components/ui/States';

function KioskAttendanceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const urlSessionId = searchParams.get('session') || undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastDetectionTime = useRef<number>(0);

  // Synchronous State Guards (Crucial to prevent React stale-closure duplicate bugs)
  const attendedSetRef = useRef<Set<string>>(new Set());
  const inFlightRef = useRef<Set<string>>(new Set());
  const activeSessionIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Core App States
  const [mounted, setMounted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [isCameraBlocked, setIsCameraBlocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Session & Attendance States
  const [sessionState, setSessionState] = useState<AttendanceState>('NO_ACTIVE_SESSION');
  const [activeSession, setActiveSession] = useState<TrainingSessionData | null>(null);
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [attendedPlayerIds, setAttendedPlayerIds] = useState<Set<string>>(new Set());
  const [knownFaces, setKnownFaces] = useState<any[]>([]);
  const [detections, setDetections] = useState<any[]>([]);

  // Modals & Settings
  const [showSettings, setShowSettings] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showSessionSelector, setShowSessionSelector] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualPlayerId, setManualPlayerId] = useState('');
  const [manualMessage, setManualMessage] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Live Clock
  useEffect(() => {
    setMounted(true);
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync ref with state
  const syncAttendedIds = useCallback((newSet: Set<string>) => {
    attendedSetRef.current = new Set(newSet);
    setAttendedPlayerIds(new Set(newSet));
  }, []);

  // Load Session Context (Server First, fallback to Local DataStore)
  const loadSessionData = useCallback(async (targetSessionId?: string) => {
    setIsLoadingSession(true);

    // Abort previous in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    // Reset synchronous guards and view for new session
    attendedSetRef.current.clear();
    inFlightRef.current.clear();
    setAttendances([]);
    setAttendedPlayerIds(new Set());
    setDetections([]);

    try {
      // 1. Try Laravel Server API for active session
      const res = await getActiveSession(targetSessionId);
      if (res && res.session) {
        const s = res.session;
        const sIdStr = String(s.id);

        activeSessionIdRef.current = sIdStr;

        const normalizedSession: TrainingSessionData = {
          id: sIdStr,
          title: s.title || 'Latihan Futsal',
          date: s.training_date,
          time: s.start_time,
          endTime: s.end_time,
          location: s.location,
          type: 'Latihan Rutin',
          status: s.status,
          attendanceOpenAt: s.attendance_open_at || undefined,
          attendanceCloseAt: s.attendance_close_at || undefined,
          attendanceCount: res.stats?.attended_count || 0,
          totalPlayers: res.stats?.total_players || 18,
        };

        setActiveSession(normalizedSession);
        setSessionState(res.state);
        setAvailableSessions(res.available_sessions || []);

        // Load existing attendances for this session
        const currentAtts = (await getAttendance(Number(sIdStr))).map(a => ({
          id: String(a.id),
          sessionId: String(a.training_session_id),
          playerId: String(a.player_id),
          name: a.player?.full_name || a.player_name || 'Pemain',
          jersey: String(a.player?.jersey_number || a.jersey_number || ''),
          time: a.check_in_at,
          status: a.status === 'late' ? 'late' : 'present',
          method: a.verification_method === 'face_recognition' ? 'face_recognition' : 'manual',
          confidence: a.confidence,
        } as AttendanceRecord));
        setAttendances(currentAtts);

        const ids = new Set<string>();
        currentAtts.forEach(a => ids.add(String(a.playerId)));
        if (res.stats?.attended_player_ids) {
          res.stats.attended_player_ids.forEach((id: number) => ids.add(String(id)));
        }

        syncAttendedIds(ids);
        setIsLoadingSession(false);
        return;
      }
    } catch (err) {
      console.error('[Kiosk] Backend API unavailable:', err);
      activeSessionIdRef.current = null;
      setActiveSession(null);
      setSessionState('NO_ACTIVE_SESSION');
      setAttendances([]);
      syncAttendedIds(new Set());
    }

    setIsLoadingSession(false);
  }, [syncAttendedIds]);

  // Main Initialization
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        setIsInitializing(true);
        setIsModelLoading(true);

        if (!isMounted) return;

        // Load players & active session
        const playersResponse = await getPlayers();
        setPlayers(playersResponse.data.map(player => ({
          id: String(player.id),
          name: player.full_name,
          jersey: String(player.jersey_number),
          position: ({ goalkeeper: 'Kiper', anchor: 'Anchor', flank: 'Flank', pivot: 'Pivot' } as const)[player.primary_position],
          secondaryPosition: player.secondary_position ? ({ goalkeeper: 'Kiper', anchor: 'Anchor', flank: 'Flank', pivot: 'Pivot' } as const)[player.secondary_position] : undefined,
          primaryKick: ({ right: 'Kanan', left: 'Kiri', both: 'Kedua Kaki' } as const)[player.primary_kick as 'right' | 'left' | 'both'] || 'Kanan',
          status: player.status === 'active' ? 'Aktif' : 'Nonaktif',
          faceRegistered: player.face_registered,
          avatarUrl: player.profile_photo || '',
          joinDate: player.joined_at,
          notes: player.notes || undefined,
        })));
        await loadSessionData(urlSessionId);

        // Load face recognition AI models
        if (!areModelsLoaded()) {
          await loadModels();
        }

        const faceData = await getAllFaceData();
        const formattedFaces = toFloat32Descriptors(faceData);
        setKnownFaces(formattedFaces);
        setIsModelLoading(false);
        setIsInitializing(false);
      } catch (error: any) {
        console.error('[Kiosk] Initialization error:', error);
        if (isMounted) {
          setModelError('Gagal memuat model AI atau sinkronisasi data.');
          setIsModelLoading(false);
          setIsInitializing(false);
        }
      }
    };
    
    init();

    return () => {
      isMounted = false;
      stopCamera();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [urlSessionId, loadSessionData]);

  // Start or Stop Camera based on Session State
  useEffect(() => {
    if (sessionState === 'ACTIVE_ATTENDANCE' && !isModelLoading && !isCameraBlocked && !isLoadingSession) {
      startCamera();
    } else if (sessionState !== 'ACTIVE_ATTENDANCE') {
      stopCamera();
    }
  }, [sessionState, isModelLoading, isCameraBlocked, isLoadingSession]);

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsPlaying(false);
  };

  const startCamera = async () => {
    setModelError(null);
    setIsCameraBlocked(false);

    if (typeof window === 'undefined') return;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      if (!isLocal && window.location.protocol !== 'https:') {
        setIsCameraBlocked(true);
        setModelError('Browser HP membatasi akses kamera pada IP tanpa HTTPS.');
      } else {
        setModelError('Kamera tidak didukung pada peramban ini.');
      }
      return;
    }
    
    try {
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: isFlipped ? 'environment' : 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });
      
      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        
        video.onloadedmetadata = () => {
          video.play().catch(err => {
            if (err.name !== 'AbortError') {
              console.error('Video play error:', err);
            }
          });
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setIsCameraBlocked(true);
        setModelError('Izin akses kamera ditolak. Harap izinkan kamera di browser Anda.');
      } else {
        setModelError('Gagal mengakses kamera: ' + (err.message || 'Periksa kamera perangkat.'));
      }
    }
  };

  const handleVideoPlay = () => {
    setIsPlaying(true);
    if (!animationFrameRef.current) {
      detectLoop();
    }
  };

  const playSuccessSound = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08); // A5
      gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {}
  };

  const triggerVibration = () => {
    if (vibrateEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([120, 60, 120]);
      } catch (e) {}
    }
  };

  // Check In Handler (Strictly Session Scoped & Idempotent)
  const handleCheckIn = useCallback((
    player: PlayerData, 
    method: 'face_recognition' | 'manual' = 'face_recognition', 
    confidence?: number
  ) => {
    if (!activeSession) return false;

    const playerIdStr = String(player.id);
    const targetSessionId = String(activeSession.id);

    // 1. SYNCHRONOUS GUARD: Check if already attended in this session
    if (attendedSetRef.current.has(playerIdStr)) {
      return false;
    }

    // 2. SYNCHRONOUS IN-FLIGHT GUARD: Check if already processing
    if (inFlightRef.current.has(playerIdStr)) {
      return false;
    }

    // Mark immediately in refs so subsequent frames in next 16ms/450ms see it immediately!
    attendedSetRef.current.add(playerIdStr);
    inFlightRef.current.add(playerIdStr);

    const nowTime = new Date().toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    }) + ' WIB';

    // Persist attendance in the central Laravel API.
    const parsedNumericPlayerId = parseInt(playerIdStr, 10);
    const parsedNumericSessionId = parseInt(targetSessionId, 10);

    if (!isNaN(parsedNumericPlayerId) && !isNaN(parsedNumericSessionId)) {
      createKioskAttendance({
        training_session_id: parsedNumericSessionId,
        player_id: parsedNumericPlayerId,
        verification_method: method,
        confidence: confidence || (method === 'face_recognition' ? 0.85 : undefined),
        status: 'present'
      })
      .then(res => {
        if (res && res.status === 'already_recorded') {
          // Backend confirmed already recorded
          console.log(`[Kiosk] Player ${player.name} already recorded in DB on session ${targetSessionId}`);
        }
      })
      .then(() => {
        const newRecord: AttendanceRecord = {
          id: `${targetSessionId}-${playerIdStr}`,
          sessionId: targetSessionId,
          playerId: playerIdStr,
          name: player.name,
          jersey: player.jersey,
          time: nowTime,
          status: 'present',
          method,
          confidence,
        };
        setAttendances(prev => prev.some(a => String(a.playerId) === playerIdStr) ? prev : [newRecord, ...prev]);
        setAttendedPlayerIds(new Set(attendedSetRef.current));
        playSuccessSound();
        triggerVibration();
      })
      .catch(err => {
        attendedSetRef.current.delete(playerIdStr);
        setAttendedPlayerIds(new Set(attendedSetRef.current));
        console.error('[Kiosk] Failed to save attendance:', err);
      })
      .finally(() => {
        inFlightRef.current.delete(playerIdStr);
      });
    } else {
      inFlightRef.current.delete(playerIdStr);
    }

    return true;
  }, [activeSession, soundEnabled, vibrateEnabled]);

  // Detection Loop with Strict Synchronous Ref Deduplication
  const detectLoop = async () => {
    if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) {
      animationFrameRef.current = requestAnimationFrame(detectLoop);
      return;
    }

    const now = Date.now();
    if (now - lastDetectionTime.current >= 450) {
      lastDetectionTime.current = now;
      
      try {
        const videoEl = videoRef.current;
        const videoWidth = videoEl.videoWidth;
        const videoHeight = videoEl.videoHeight;
        
        if (videoWidth > 0 && videoHeight > 0) {
          const faces = await detectFaces(videoEl);
          
          const newDetections = faces.map((det: any) => {
            const box = getBoxAsPercent(det.detection, videoWidth, videoHeight);
            
            let match = null;
            if (knownFaces.length > 0 && det.descriptor) {
              match = findBestMatch(det.descriptor, knownFaces, 0.58);
            }
            
            let status = 'unknown';
            let playerName = 'Tidak Dikenal';
            let confidence = match ? ((1 - match.distance) * 100).toFixed(0) : '0';

            if (match) {
              const matchedPlayerId = String(match.playerId);
              const player = players.find(p => String(p.id) === matchedPlayerId);
              
              if (player) {
                playerName = player.name;
                
                // SYNCHRONOUS REF CHECK: Always up-to-date across all loop iterations
                if (attendedSetRef.current.has(matchedPlayerId)) {
                  // Keep displaying green label with checkmark WITHOUT any API call or duplicate row!
                  status = 'already_in';
                } else if (!inFlightRef.current.has(matchedPlayerId)) {
                  status = 'just_in';
                  handleCheckIn(player, 'face_recognition', parseFloat(confidence) / 100);
                } else {
                  // In flight
                  status = 'just_in';
                }
              }
            }
            
            return { box, status, playerName, confidence };
          });
          
          setDetections(newDetections);
        }
      } catch (err) {
        // Continue detection loop gracefully
      }
    }
    
    animationFrameRef.current = requestAnimationFrame(detectLoop);
  };

  // Coach Lifecycle Controls
  const handleOpenAttendance = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      const numId = parseInt(activeSession.id, 10);
      if (!isNaN(numId)) {
        await openSessionAttendance(numId);
      }
      setSessionState('ACTIVE_ATTENDANCE');
      setActiveSession(prev => prev ? { ...prev, status: 'active' } : null);
    } catch (e) {
      console.error('[Kiosk] Failed to open attendance:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCloseAttendance = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      const numId = parseInt(activeSession.id, 10);
      if (!isNaN(numId)) {
        await closeSessionAttendance(numId);
      }
      setSessionState('ATTENDANCE_CLOSED');
      setActiveSession(prev => prev ? { ...prev, status: 'completed' } : null);
    } catch (e) {
      console.error('[Kiosk] Failed to close attendance:', e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReopenAttendance = async () => {
    if (!activeSession) return;
    setActionLoading(true);
    try {
      const numId = parseInt(activeSession.id, 10);
      if (!isNaN(numId)) {
        await reopenSessionAttendance(numId);
      }
      setSessionState('ACTIVE_ATTENDANCE');
      setActiveSession(prev => prev ? { ...prev, status: 'active' } : null);
    } catch (e) {
      console.error('[Kiosk] Failed to reopen attendance:', e);
    } finally {
      setActionLoading(false);
    }
  };

  // Clean Session Switch with Strict Isolation
  const handleSelectSession = (sessionId: string | number) => {
    setShowSessionSelector(false);
    const newSessionIdStr = String(sessionId);

    // Cancel current detection loop frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Update URL query string
    router.push(`/kiosk/attendance?session=${newSessionIdStr}`);

    // Load new session with complete state isolation
    loadSessionData(newSessionIdStr);
  };

  // Manual Attendance Submission with Duplicate Guard
  const submitManualAttendance = (e: React.FormEvent) => {
    e.preventDefault();
    setManualMessage(null);

    if (manualPlayerId && activeSession) {
      const playerIdStr = String(manualPlayerId);

      // Check if already attended
      if (attendedSetRef.current.has(playerIdStr)) {
        setManualMessage('Pemain ini sudah tercatat hadir pada sesi ini.');
        return;
      }

      const targetPlayer = players.find(p => String(p.id) === playerIdStr);
      if (targetPlayer) {
        handleCheckIn(targetPlayer, 'manual');
        setShowManualModal(false);
        setManualPlayerId('');
      }
    }
  };

  if (!mounted || isInitializing) {
    return (
      <div className="h-screen w-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-base font-bold text-neutral-200">Memuat Sesi Absensi Kiosk...</h2>
        <p className="text-xs text-neutral-500 mt-1">Sinkronisasi data latihan & AI Face Recognition</p>
      </div>
    );
  }

  // Count unique players attended in this session
  const uniqueAttendedCount = attendedPlayerIds.size;
  const attendancePercentage = players.length > 0 
    ? Math.round((uniqueAttendedCount / players.length) * 100) 
    : 0;

  return (
    <div className="h-screen w-screen max-h-screen overflow-hidden bg-neutral-950 text-white flex flex-col font-sans select-none">
      
      {/* 1. Header Bar with Session Context */}
      <header className="bg-neutral-950/90 backdrop-blur-md border-b border-neutral-800 px-3.5 sm:px-4 py-2.5 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-3">
          <Link href="/attendance" className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors">
            <X className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Kiosk Absensi Wajah
              </h1>
              {activeSession && (
                <button 
                  onClick={() => setShowSessionSelector(true)}
                  className="px-2 py-0.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700/60 text-[11px] font-semibold text-neutral-300 flex items-center gap-1 transition-all"
                >
                  <span className="truncate max-w-[120px] sm:max-w-[180px]">{activeSession.title}</span>
                  <ChevronDown className="w-3 h-3 text-neutral-400" />
                </button>
              )}
            </div>
            <p className="text-[11px] text-neutral-400 flex items-center gap-1.5 mt-0.5">
              <span>{currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
              {activeSession && (
                <>
                  <span>•</span>
                  <span className="text-neutral-300 font-mono">{activeSession.time} - {activeSession.endTime || 'Selesai'}</span>
                </>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* State Indicator */}
          <div>
            {isLoadingSession ? (
              <span className="flex items-center text-neutral-400 text-xs bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800 font-semibold">
                <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> Memuat Sesi...
              </span>
            ) : sessionState === 'ACTIVE_ATTENDANCE' ? (
              <span className="flex items-center text-emerald-400 text-xs bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5" /> Sesi Dibuka
              </span>
            ) : sessionState === 'UPCOMING_SESSION' ? (
              <span className="flex items-center text-amber-400 text-xs bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20 font-semibold">
                <Clock className="w-3 h-3 mr-1.5" /> Sesi Mendatang
              </span>
            ) : sessionState === 'ATTENDANCE_CLOSED' ? (
              <span className="flex items-center text-neutral-400 text-xs bg-neutral-800 px-2.5 py-1 rounded-full border border-neutral-700 font-semibold">
                <CheckCircle2 className="w-3 h-3 mr-1.5 text-neutral-400" /> Selesai
              </span>
            ) : (
              <span className="flex items-center text-red-400 text-xs bg-red-400/10 px-2.5 py-1 rounded-full border border-red-400/20 font-semibold">
                Tidak Ada Sesi
              </span>
            )}
          </div>
          
          {/* Stats & Clock */}
          <div className="text-right hidden sm:block">
            <div className="text-base font-mono font-bold leading-tight">
              {currentTime.toLocaleTimeString('id-ID')}
            </div>
            <div className="text-[11px] text-neutral-400">
              Hadir: <span className="text-emerald-400 font-bold">{uniqueAttendedCount}</span>/{players.length} ({attendancePercentage}%)
            </div>
          </div>
          
          {/* Settings Menu Button */}
          <div className="relative">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            
            {showSettings && (
              <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl py-2 z-50 divide-y divide-neutral-800">
                <button onClick={() => { setIsFlipped(!isFlipped); setShowSettings(false); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-neutral-800 flex items-center gap-2.5">
                  <RefreshCcw className="w-4 h-4 text-emerald-400" /> Balik Arah Kamera
                </button>
                <button onClick={() => setSoundEnabled(!soundEnabled)} className="w-full text-left px-4 py-2.5 text-xs hover:bg-neutral-800 flex items-center gap-2.5">
                  {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
                  Suara: {soundEnabled ? 'Aktif' : 'Mati'}
                </button>
                <button onClick={() => setVibrateEnabled(!vibrateEnabled)} className="w-full text-left px-4 py-2.5 text-xs hover:bg-neutral-800 flex items-center gap-2.5">
                  {vibrateEnabled ? <Vibrate className="w-4 h-4 text-emerald-400" /> : <Smartphone className="w-4 h-4 text-neutral-500" />}
                  Getar: {vibrateEnabled ? 'Aktif' : 'Mati'}
                </button>
                <button onClick={() => { setShowSessionSelector(true); setShowSettings(false); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-neutral-800 flex items-center gap-2.5 text-neutral-200">
                  <Calendar className="w-4 h-4 text-emerald-400" /> Ganti Sesi Latihan
                </button>
                <button onClick={() => { startCamera(); setShowSettings(false); }} className="w-full text-left px-4 py-2.5 text-xs hover:bg-neutral-800 flex items-center gap-2.5 text-amber-400">
                  <Camera className="w-4 h-4" /> Mulai Ulang Kamera
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Viewport & State Machine */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left/Top Section: Camera or State Screen */}
        <section 
          className="relative w-full h-[46vh] sm:h-[50vh] md:h-full md:w-[60%] shrink-0 bg-neutral-950 overflow-hidden flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-neutral-800" 
          ref={containerRef}
        >
          {/* SKELETON / LOADING SESSION */}
          {isLoadingSession && (
            <div className="absolute inset-0 bg-neutral-950 flex flex-col items-center justify-center z-30">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-3" />
              <p className="text-xs text-neutral-400">Memuat data sesi baru...</p>
            </div>
          )}

          {/* STATE A: ACTIVE ATTENDANCE (Live Camera Detection) */}
          {sessionState === 'ACTIVE_ATTENDANCE' && !isLoadingSession && (
            <>
              <video 
                ref={videoRef}
                autoPlay
                playsInline
                muted
                onPlay={handleVideoPlay}
                className={clsx(
                  "w-full h-full object-cover transition-transform duration-300", 
                  isFlipped ? "scale-x-[-1]" : ""
                )}
              />

              {/* Overlays */}
              <div className="absolute inset-0 pointer-events-none z-10">
                {/* Guide oval when no faces detected */}
                {detections.length === 0 && !isModelLoading && !isCameraBlocked && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-44 h-56 sm:w-56 sm:h-72 border-2 border-dashed border-emerald-500/40 rounded-[100%] animate-pulse flex items-center justify-center">
                      <div className="w-40 h-52 sm:w-52 sm:h-68 border border-white/10 rounded-[100%]" />
                    </div>
                    <div className="mt-4 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs text-neutral-300 flex items-center gap-2 border border-white/10">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>Arahkan wajah ke dalam bingkai</span>
                    </div>
                  </div>
                )}
                
                {/* Real-time Bounding Boxes */}
                <AnimatePresence>
                  {detections.map((det, idx) => (
                    <motion.div 
                      key={idx}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className={clsx(
                        "absolute border-2 rounded-2xl transition-all duration-200 shadow-2xl",
                        det.status === 'just_in' ? "border-emerald-400 bg-emerald-500/10 shadow-emerald-500/30" :
                        det.status === 'already_in' ? "border-emerald-400/80 bg-emerald-500/10 shadow-emerald-500/20" : 
                        "border-red-500/80 bg-red-500/10"
                      )}
                      style={{
                        top: `${det.box.y}%`,
                        left: `${isFlipped ? 100 - det.box.x - det.box.width : det.box.x}%`,
                        width: `${det.box.width}%`,
                        height: `${det.box.height}%`,
                      }}
                    >
                      {/* Name Label with Checkmark for Attended Players */}
                      <div className={clsx(
                        "absolute -bottom-9 left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1.5 border",
                        (det.status === 'just_in' || det.status === 'already_in') 
                          ? "bg-emerald-600 text-white border-emerald-400" 
                          : "bg-red-600 text-white border-red-500"
                      )}>
                        <span>{det.playerName}</span>
                        {(det.status === 'just_in' || det.status === 'already_in') && <Check className="w-3.5 h-3.5 text-white" />}
                        {det.status === 'already_in' && <span className="text-[10px] opacity-80">(Tercatat)</span>}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Camera Blocked Fallback */}
              {isCameraBlocked && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/95 p-6 text-center z-20">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-3">
                    <ShieldAlert className="w-7 h-7 text-amber-400" />
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-white mb-1">Akses Kamera Butuh Izin</h2>
                  <p className="text-xs text-neutral-400 max-w-sm mb-4 leading-relaxed">
                    Browser HP membatasi akses kamera pada alamat IP lokal HTTP. Anda tetap bisa melakukan <strong>Absensi Manual</strong> atau mengaktifkan izin di HP.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
                    <button
                      onClick={() => setShowManualModal(true)}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Absensi Manual Cepat</span>
                    </button>
                    <button
                      onClick={() => setShowHelpModal(true)}
                      className="w-full py-2.5 px-4 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-semibold border border-neutral-700 transition-all flex items-center justify-center gap-2"
                    >
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                      <span>Cara Buka Izin di HP</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Close Session Action Float Bar */}
              <div className="absolute bottom-3 left-3 right-3 flex justify-between items-center z-20 pointer-events-auto">
                <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl border border-neutral-800 text-xs text-neutral-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Kamera mendeteksi otomatis</span>
                </div>
                <button
                  onClick={handleCloseAttendance}
                  disabled={actionLoading}
                  className="bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  <Pause className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tutup Absensi</span>
                </button>
              </div>
            </>
          )}

          {/* STATE B: UPCOMING SESSION */}
          {sessionState === 'UPCOMING_SESSION' && activeSession && !isLoadingSession && (
            <div className="p-6 text-center max-w-md flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-amber-400" />
              </div>
              <span className="text-xs uppercase tracking-wider font-bold text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full mb-3">
                Sesi Belum Dimulai
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{activeSession.title}</h2>
              <p className="text-xs text-neutral-400 flex items-center justify-center gap-2 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{activeSession.date}</span>
                <span>•</span>
                <Clock className="w-3.5 h-3.5" />
                <span>{activeSession.time} - {activeSession.endTime || 'Selesai'} WIB</span>
              </p>
              <p className="text-xs text-neutral-500 flex items-center justify-center gap-1.5 mb-6">
                <MapPin className="w-3.5 h-3.5" />
                <span>{activeSession.location}</span>
              </p>

              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl w-full mb-6 text-left space-y-2">
                <div className="text-xs font-semibold text-neutral-300">Waktu Absensi Resmi:</div>
                <div className="text-xs text-neutral-400">
                  Pintu absensi akan otomatis aktif 30 menit sebelum latihan dimulai.
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={handleOpenAttendance}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Buka Absensi Sekarang (Awal)</span>
                </button>
                <button
                  onClick={() => setShowSessionSelector(true)}
                  className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-700 transition-all"
                >
                  Pilih Sesi Lain
                </button>
              </div>
            </div>
          )}

          {/* STATE C: ATTENDANCE CLOSED */}
          {sessionState === 'ATTENDANCE_CLOSED' && activeSession && !isLoadingSession && (
            <div className="p-6 text-center max-w-md flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <span className="text-xs uppercase tracking-wider font-bold text-neutral-400 bg-neutral-800 px-3 py-1 rounded-full mb-3">
                Sesi Absensi Ditutup
              </span>
              <h2 className="text-lg sm:text-xl font-bold text-white mb-2">{activeSession.title}</h2>
              <p className="text-xs text-neutral-400 mb-6">
                Data kehadiran telah tersimpan permanen untuk riwayat & laporan tim.
              </p>

              {/* Attendance Summary Stat Box */}
              <div className="grid grid-cols-2 gap-3 w-full mb-6">
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-center">
                  <div className="text-2xl font-bold font-mono text-emerald-400">{uniqueAttendedCount}</div>
                  <div className="text-[11px] text-neutral-400 mt-1">Pemain Hadir</div>
                </div>
                <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl text-center">
                  <div className="text-2xl font-bold font-mono text-amber-400">{players.length - uniqueAttendedCount}</div>
                  <div className="text-[11px] text-neutral-400 mt-1">Belum / Tidak Hadir</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <button
                  onClick={handleReopenAttendance}
                  disabled={actionLoading}
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                  <span>Buka Kembali Sesi Ini</span>
                </button>
                <Link
                  href="/attendance"
                  className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-700 transition-all flex items-center justify-center"
                >
                  Lihat Riwayat
                </Link>
              </div>
            </div>
          )}

          {/* STATE D: NO ACTIVE SESSION */}
          {sessionState === 'NO_ACTIVE_SESSION' && !isLoadingSession && (
            <div className="p-6 text-center max-w-md flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-neutral-500" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Belum Ada Sesi Latihan Aktif</h2>
              <p className="text-xs text-neutral-400 mb-6 leading-relaxed">
                Tidak ada sesi latihan yang dijadwalkan untuk saat ini. Silakan buat sesi baru di menu Jadwal Latihan atau pilih sesi yang tersedia.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Link
                  href="/training"
                  className="flex-1 py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>+ Buat Sesi Latihan Baru</span>
                </Link>
                {availableSessions.length > 0 && (
                  <button
                    onClick={() => setShowSessionSelector(true)}
                    className="py-3 px-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold border border-neutral-700 transition-all"
                  >
                    Pilih Sesi Yang Ada
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* Right/Bottom Section: Session Attendance Table */}
        <section className="flex-1 md:h-full md:w-[40%] bg-neutral-900 flex flex-col min-h-0 overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-neutral-800 bg-neutral-950/70 flex justify-between items-center shrink-0">
            <div>
              <h2 className="font-bold text-sm sm:text-base text-white">Daftar Kehadiran</h2>
              <p className="text-[11px] text-neutral-400">
                {activeSession ? (
                  <>Sesi: <span className="text-neutral-200 font-semibold">{activeSession.title}</span> (Hadir: {uniqueAttendedCount}/{players.length})</>
                ) : (
                  'Pilih sesi terlebih dahulu'
                )}
              </p>
            </div>
            
            {sessionState === 'ACTIVE_ATTENDANCE' && (
              <button 
                onClick={() => {
                  setManualMessage(null);
                  setShowManualModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 font-bold shadow-md shadow-emerald-600/20 transition-all active:scale-95"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Absen Manual</span>
              </button>
            )}
          </div>
          
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2.5 custom-scrollbar">
            {isLoadingSession ? (
              <div className="h-full flex flex-col items-center justify-center text-neutral-500 py-12">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mb-2" />
                <p className="text-xs">Memuat kehadiran sesi...</p>
              </div>
            ) : attendances.length === 0 ? (
              <div className="h-full min-h-[160px] flex flex-col items-center justify-center text-neutral-500 space-y-2">
                <Camera className="w-10 h-10 opacity-30 text-emerald-400" />
                <p className="text-sm font-semibold text-neutral-400">Belum ada pemain hadir pada sesi ini</p>
                <p className="text-xs text-neutral-500 text-center max-w-xs">
                  {sessionState === 'ACTIVE_ATTENDANCE' 
                    ? 'Arahkan wajah ke kamera atau gunakan tombol Absen Manual di atas.'
                    : 'Buka sesi absensi untuk mulai mencatat kehadiran pemain.'}
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {attendances.map((record, idx) => {
                  const player = players.find(p => String(p.id) === String(record.playerId));
                  
                  return (
                    <motion.div 
                      key={record.id || `${record.sessionId}_${record.playerId}`}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      layout
                      className="bg-neutral-800/60 border border-neutral-700/50 hover:border-emerald-500/30 rounded-2xl p-3 flex items-center gap-3.5 transition-all"
                    >
                      <div className="w-6 text-center text-neutral-500 font-mono text-xs font-bold">
                        {attendances.length - idx}
                      </div>
                      <PlayerAvatar photo={player?.avatarUrl} name={record.name} size="md" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-white truncate">{record.name}</h3>
                        <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-0.5">
                          <span>No. #{record.jersey}</span>
                          <span>•</span>
                          <span className={record.method === 'manual' ? 'text-amber-400 font-medium' : 'text-emerald-400 font-medium'}>
                            {record.method === 'manual' ? 'Manual' : 'Face ID'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                          {record.time}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </section>

      </main>

      {/* 3. Session Selector Modal */}
      {showSessionSelector && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl max-h-[85vh] flex flex-col"
          >
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                Pilih Sesi Latihan
              </h2>
              <button onClick={() => setShowSessionSelector(false)} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-400 mb-4 shrink-0">
              Pilih sesi latihan yang ingin dijadikan konteks absensi Kiosk:
            </p>

            <div className="flex-1 overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
              {availableSessions.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  Tidak ada data sesi latihan.
                </div>
              ) : (
                availableSessions.map((s) => {
                  const isCurrent = activeSession && String(activeSession.id) === String(s.id);
                  return (
                    <button
                      key={s.id}
                      onClick={() => handleSelectSession(s.id)}
                      className={clsx(
                        "w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between",
                        isCurrent 
                          ? "bg-emerald-500/10 border-emerald-500/50" 
                          : "bg-neutral-950/60 border-neutral-800 hover:border-neutral-700"
                      )}
                    >
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <span>{s.title || 'Latihan Futsal'}</span>
                          {isCurrent && <span className="text-[10px] bg-emerald-500 text-black px-1.5 py-0.5 rounded font-bold">Aktif</span>}
                        </div>
                        <div className="text-xs text-neutral-400 mt-1 flex items-center gap-2">
                          <span>{s.training_date ? s.training_date.split('T')[0] : ''}</span>
                          <span>•</span>
                          <span>{s.start_time} - {s.end_time || 'Selesai'}</span>
                        </div>
                        <div className="text-[11px] text-neutral-500 mt-0.5 truncate max-w-xs">
                          {s.location}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={clsx(
                          "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                          s.status === 'active' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                          s.status === 'scheduled' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                          "bg-neutral-800 text-neutral-400"
                        )}>
                          {s.status}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            <div className="pt-4 border-t border-neutral-800 mt-3 shrink-0 flex gap-2">
              <Link
                href="/training"
                className="w-full py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-xl text-xs font-bold text-center transition-all"
              >
                Kelola Jadwal di Menu Latihan
              </Link>
            </div>
          </motion.div>
        </div>
      )}

      {/* 4. Manual Attendance Modal (Scoped to Active Session with Duplicate Warning) */}
      {showManualModal && activeSession && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl"
          >
            <div className="flex justify-between items-center mb-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-emerald-400" />
                  Absensi Manual
                </h2>
                <p className="text-[11px] text-neutral-400 mt-0.5">Sesi: {activeSession.title}</p>
              </div>
              <button onClick={() => setShowManualModal(false)} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            {manualMessage && (
              <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{manualMessage}</span>
              </div>
            )}
            
            <form onSubmit={submitManualAttendance} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-2">Pilih Pemain</label>
                <select 
                  value={manualPlayerId}
                  onChange={(e) => {
                    setManualPlayerId(e.target.value);
                    setManualMessage(null);
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 text-white rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                >
                  <option value="">-- Pilih Pemain yang Hadir --</option>
                  {players
                    .filter(p => !attendedSetRef.current.has(String(p.id)))
                    .sort((a,b) => a.name.localeCompare(b.name))
                    .map(p => (
                      <option key={p.id} value={p.id}>{p.name} (#{p.jersey} - {p.position})</option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-500 mt-2">* Hanya menampilkan pemain yang belum hadir pada sesi ini</p>
              </div>
              
              <div className="flex gap-3 pt-3">
                <button 
                  type="button" 
                  onClick={() => setShowManualModal(false)}
                  className="flex-1 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  disabled={!manualPlayerId}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition-all"
                >
                  Konfirmasi Hadir
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* 5. Mobile Camera Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-neutral-900 border border-neutral-800 rounded-3xl p-5 sm:p-6 w-full max-w-md shadow-2xl text-left"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                Cara Mengaktifkan Kamera di HP
              </h2>
              <button onClick={() => setShowHelpModal(false)} className="p-2 hover:bg-neutral-800 rounded-full text-neutral-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
              <p>
                Google Chrome di Android membatasi akses kamera pada alamat IP lokal (<code className="bg-neutral-950 px-1 py-0.5 rounded text-amber-400">http://192.168.x.x</code>) demi keamanan.
              </p>
              
              <div className="p-3 bg-neutral-950 rounded-xl border border-neutral-800 space-y-2">
                <div className="font-bold text-white">Cara Membuka Izin (1 Menit):</div>
                <ol className="list-decimal list-inside space-y-1.5 text-neutral-400">
                  <li>Di Chrome HP Anda, buka tab baru dan ketik: <br/><code className="text-emerald-400 font-mono font-bold select-all">chrome://flags</code></li>
                  <li>Di kotak pencarian flags, ketik: <br/><span className="text-white font-mono">unsafely-treat-insecure-origin-as-secure</span></li>
                  <li>Ubah statusnya menjadi <strong>Enabled</strong>.</li>
                  <li>Masukkan alamat: <br/><code className="text-emerald-400 font-mono font-bold select-all">http://192.168.1.6:3001</code></li>
                  <li>Ketuk tombol <strong>Relaunch</strong> di bawah.</li>
                </ol>
              </div>

              <p className="text-[11px] text-neutral-400">
                💡 Atau Anda juga bisa menggunakan tombol <strong>Absensi Manual</strong> untuk mencatat kehadiran pemain secara instan.
              </p>
            </div>

            <button
              onClick={() => setShowHelpModal(false)}
              className="mt-5 w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-colors"
            >
              Mengerti & Tutup
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function KioskAttendancePage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <h2 className="text-base font-bold text-neutral-200">Memuat Sesi Absensi Kiosk...</h2>
      </div>
    }>
      <KioskAttendanceContent />
    </Suspense>
  );
}
