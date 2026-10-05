'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMeetingNoteBySessionId,
  saveMeetingNote,
  getStoredSessions,
  MeetingNote,
  ActivityItem,
  TrainingSessionData
} from '@/lib/dataStore';
import {
  ChevronLeft,
  Plus,
  Trash2,
  Camera,
  Image as ImageIcon,
  Check,
  FileText,
  Clock,
  Save,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function TrainingNotesPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = use(params);
  const sessionId = resolvedParams.id;

  const [session, setSession] = useState<TrainingSessionData | null>(null);
  const [note, setNote] = useState<MeetingNote | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load initial data
  useEffect(() => {
    const sessions = getStoredSessions();
    const currentSession = sessions.find(s => s.id === sessionId);
    
    if (currentSession) {
      setSession(currentSession);
    } else {
      return;
    }

    const existingNote = getMeetingNoteBySessionId(sessionId);
    if (existingNote) {
      setNote(existingNote);
    } else {
      const newNote: MeetingNote = {
        id: `note_${Date.now()}_${sessionId}`,
        sessionId: sessionId,
        sessionTitle: currentSession.title,
        sessionDate: currentSession.date,
        activities: [
          { id: 'act_1', text: 'Pemanasan dinamis & peregangan (15m)', done: false },
          { id: 'act_2', text: 'Drill passing triangle & first touch', done: false },
          { id: 'act_3', text: 'Simulasi transisi bertahan ke menyerang', done: false },
          { id: 'act_4', text: 'Game mini 4 vs 4 intensitas tinggi', done: false },
          { id: 'act_5', text: 'Pendinginan & evaluasi tim', done: false },
        ],
        photos: [],
        notes: '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      setNote(newNote);
      saveMeetingNote(newNote);
    }
  }, [sessionId]);

  // Auto-save debounce effect
  useEffect(() => {
    if (!note) return;

    const timer = setTimeout(() => {
      setIsSaving(true);
      const updatedNote = { ...note, updatedAt: new Date().toISOString() };
      saveMeetingNote(updatedNote);
      setLastSaved(new Date());
      setIsSaving(false);
    }, 500);

    return () => clearTimeout(timer);
  }, [note]);

  // Handlers
  const handleAddActivity = () => {
    if (!note) return;
    const newActivity: ActivityItem = {
      id: `act_${Date.now()}`,
      text: '',
      done: false
    };
    setNote({
      ...note,
      activities: [...note.activities, newActivity]
    });
  };

  const handleUpdateActivity = (id: string, text: string) => {
    if (!note) return;
    setNote({
      ...note,
      activities: note.activities.map(a => 
        a.id === id ? { ...a, text } : a
      )
    });
  };

  const handleToggleActivity = (id: string) => {
    if (!note) return;
    setNote({
      ...note,
      activities: note.activities.map(a => 
        a.id === id ? { ...a, done: !a.done } : a
      )
    });
  };

  const handleRemoveActivity = (id: string) => {
    if (!note) return;
    setNote({
      ...note,
      activities: note.activities.filter(a => a.id !== id)
    });
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!note) return;
    setNote({ ...note, notes: e.target.value });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && note) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNote({
          ...note,
          photos: [...note.photos, reader.result as string]
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index: number) => {
    if (!note) return;
    setNote({
      ...note,
      photos: note.photos.filter((_, i) => i !== index)
    });
  };

  // Camera functions
  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      alert("Tidak dapat mengakses kamera. Pastikan izin kamera aktif.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current && note) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setNote({
          ...note,
          photos: [...note.photos, photoData]
        });
        stopCamera();
      }
    }
  };

  if (!session || !note) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm">Memuat catatan latihan...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-24 font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => router.push('/training')}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors py-1 pr-2"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-semibold">Kembali</span>
          </button>
          
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs text-slate-500 dark:text-slate-400">
              {isSaving ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></div>
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check size={12} className="text-emerald-500" />
                  <span>Tersimpan</span>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Session Info Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">
            <Clock size={14} />
            <span>Buku Latihan Sesi</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {session.title}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {session.date} • {session.time} WIB • {session.location}
          </p>
        </div>

        {/* Activity Checklist */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Check className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Aktivitas Latihan</h2>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {note.activities.filter(a => a.done).length} / {note.activities.length} Selesai
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {note.activities.map((activity) => (
                <motion.div 
                  key={activity.id}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3"
                >
                  <button
                    onClick={() => handleToggleActivity(activity.id)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${
                      activity.done 
                        ? 'bg-emerald-500 border-emerald-500 text-white' 
                        : 'border-slate-300 dark:border-slate-600 hover:border-emerald-400'
                    }`}
                  >
                    {activity.done && <Check size={16} />}
                  </button>
                  <input
                    type="text"
                    value={activity.text}
                    onChange={(e) => handleUpdateActivity(activity.id, e.target.value)}
                    placeholder="Nama aktivitas..."
                    className={`flex-1 bg-transparent outline-none py-2 text-slate-700 dark:text-slate-200 transition-colors ${
                      activity.done ? 'line-through text-slate-400 dark:text-slate-500' : ''
                    }`}
                  />
                  <button
                    onClick={() => handleRemoveActivity(activity.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Trash2 size={18} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          
          <button
            onClick={handleAddActivity}
            className="mt-4 flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium p-2 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-colors w-full justify-center text-sm"
          >
            <Plus size={18} />
            <span>Tambah Aktivitas</span>
          </button>
        </div>

        {/* Photo Gallery */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <ImageIcon className="text-amber-600 dark:text-amber-400" size={20} />
              </div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Dokumentasi Foto</h2>
            </div>
            {note.photos.length > 0 && (
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium rounded-full">
                {note.photos.length} Foto
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <AnimatePresence>
              {note.photos.map((photo, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative aspect-square rounded-2xl overflow-hidden group border border-slate-200 dark:border-slate-700"
                >
                  <img src={photo} alt={`Dokumentasi ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-red-500 text-white rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={startCamera}
              className="flex-1 flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl transition-colors"
            >
              <Camera className="text-slate-500 mb-2" size={24} />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Ambil Foto</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl transition-colors"
            >
              <ImageIcon className="text-slate-500 mb-2" size={24} />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Pilih Galeri</span>
            </button>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
            />
          </div>
        </div>

        {/* Coach Notes */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FileText className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Catatan & Evaluasi Pelatih</h2>
          </div>
          <textarea
            value={note.notes}
            onChange={handleNotesChange}
            placeholder="Tulis catatan, evaluasi materi, hal yang perlu ditingkatkan di pertemuan berikutnya..."
            className="w-full h-40 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors resize-none text-slate-700 dark:text-slate-200 text-sm leading-relaxed"
          />
        </div>

        {/* Timestamp */}
        {lastSaved && (
          <div className="text-center text-xs text-slate-400 py-2">
            Terakhir disimpan: {lastSaved.toLocaleTimeString('id-ID')}
          </div>
        )}
      </main>

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
          <div className="flex justify-between items-center text-white">
            <span className="text-sm font-medium">Ambil Dokumentasi</span>
            <button onClick={stopCamera} className="p-2">
              <X size={24} />
            </button>
          </div>
          
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden rounded-3xl bg-slate-950">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
          </div>
          
          <div className="flex justify-center pb-6">
            <button
              onClick={takePhoto}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform"
            >
              <div className="w-full h-full bg-white rounded-full"></div>
            </button>
          </div>
          
          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}
    </div>
  );
}
