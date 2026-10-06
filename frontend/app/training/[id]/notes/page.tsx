'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  getMeetingNoteBySessionId,
  saveMeetingNote,
  getStoredSessions,
  saveStoredSessions,
  MeetingNote,
  ActivityItem,
  TrainingSessionData,
  DEFAULT_FUTSAL_ACTIVITIES
} from '@/lib/dataStore';
import { getTrainingSessions } from '@/lib/api';
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
  X,
  Edit2,
  RotateCcw,
  Sparkles,
  MapPin,
  Calendar
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
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [saveToast, setSaveToast] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Load initial data (supports local store + backend API fallback)
  useEffect(() => {
    async function loadData() {
      const localSessions = getStoredSessions();
      let currentSession = localSessions.find(s => String(s.id) === String(sessionId));

      if (!currentSession) {
        try {
          const res = await getTrainingSessions();
          const apiSession = res.data.find(s => String(s.id) === String(sessionId));
          if (apiSession) {
            currentSession = {
              id: String(apiSession.id),
              title: apiSession.title || 'Latihan Tim',
              date: apiSession.training_date,
              time: apiSession.start_time,
              endTime: apiSession.end_time,
              location: apiSession.location,
              type: 'Latihan Rutin',
              status: apiSession.status,
              attendanceCount: apiSession.attendances_count || 0,
            };
            saveStoredSessions([currentSession, ...localSessions.filter(s => String(s.id) !== String(sessionId))]);
          }
        } catch (err) {
          console.error("Failed to load session from API:", err);
        }
      }

      if (!currentSession) {
        currentSession = {
          id: String(sessionId),
          title: 'Sesi Latihan',
          date: new Date().toISOString().split('T')[0],
          time: '16:00',
          location: 'Lapangan Futsal',
          type: 'Latihan Rutin',
          status: 'scheduled',
        };
      }

      setSession(currentSession);

      const existingNote = getMeetingNoteBySessionId(sessionId);
      if (existingNote) {
        setNote(existingNote);
      } else {
        const newNote: MeetingNote = {
          id: `note_${Date.now()}_${sessionId}`,
          sessionId: String(sessionId),
          sessionTitle: currentSession.title,
          sessionDate: currentSession.date,
          activities: DEFAULT_FUTSAL_ACTIVITIES.map((a, i) => ({
            id: `act_${Date.now()}_${i}`,
            ...a
          })),
          photos: [],
          notes: '',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setNote(newNote);
        saveMeetingNote(newNote);
      }
    }

    loadData();
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
    }, 600);

    return () => clearTimeout(timer);
  }, [note]);

  // Handlers for Activity Checklist
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

  const handleResetToTemplate = () => {
    if (!note) return;
    if (confirm("Ganti checklist dengan template standar futsal?")) {
      const templateActivities = DEFAULT_FUTSAL_ACTIVITIES.map((a, i) => ({
        id: `act_${Date.now()}_${i}`,
        ...a
      }));
      setNote({ ...note, activities: templateActivities });
    }
  };

  const handleClearActivities = () => {
    if (!note) return;
    if (confirm("Kosongkan semua checklist aktivitas? Anda bisa menambah aktivitas sendiri secara manual.")) {
      setNote({ ...note, activities: [] });
    }
  };

  const handleTitleChange = (newTitle: string) => {
    if (!note) return;
    setNote({ ...note, sessionTitle: newTitle });
    if (session) {
      setSession({ ...session, title: newTitle });
    }
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!note) return;
    setNote({ ...note, notes: e.target.value });
  };

  const handleManualSave = () => {
    if (!note) return;
    setIsSaving(true);
    const updatedNote = { ...note, updatedAt: new Date().toISOString() };
    saveMeetingNote(updatedNote);
    setLastSaved(new Date());
    setIsSaving(false);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
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
      alert("Tidak dapat mengakses kamera. Pastikan izin kamera aktif pada browser.");
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
          <p className="text-slate-500 text-sm">Memuat buku latihan...</p>
        </div>
      </div>
    );
  }

  const completedActivitiesCount = note.activities.filter(a => a.done).length;
  const progressPercent = note.activities.length > 0 
    ? Math.round((completedActivitiesCount / note.activities.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 pb-28 font-sans">
      {/* Toast Notification */}
      <AnimatePresence>
        {saveToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-full shadow-lg flex items-center gap-2"
          >
            <Check size={14} />
            <span>Buku latihan berhasil disimpan!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticky Header */}
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-2">
          <button 
            onClick={() => router.push('/meeting-notes')}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 hover:text-emerald-500 transition-colors py-1 pr-2"
          >
            <ChevronLeft size={20} />
            <span className="text-sm font-semibold">Kembali ke Buku Latihan</span>
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
            <button
              onClick={handleManualSave}
              className="p-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-sm shadow-emerald-600/20"
            >
              <Save size={14} />
              <span className="hidden sm:inline">Simpan</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Session Info Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 relative group">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              <Clock size={14} />
              <span>Buku Latihan Sesi</span>
            </div>
            <button
              onClick={() => {
                setIsEditingTitle(!isEditingTitle);
                setTimeout(() => titleInputRef.current?.focus(), 100);
              }}
              className="text-xs text-slate-400 hover:text-emerald-500 flex items-center gap-1 transition-colors"
            >
              <Edit2 size={12} />
              <span>{isEditingTitle ? 'Selesai Edit' : 'Ubah Judul'}</span>
            </button>
          </div>

          {isEditingTitle ? (
            <div className="mb-3">
              <input
                ref={titleInputRef}
                type="text"
                value={note.sessionTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                onBlur={() => setIsEditingTitle(false)}
                placeholder="Judul / Topik Latihan..."
                className="w-full text-xl sm:text-2xl font-bold bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-emerald-500 outline-none text-slate-900 dark:text-white"
              />
            </div>
          ) : (
            <h1 
              onClick={() => {
                setIsEditingTitle(true);
                setTimeout(() => titleInputRef.current?.focus(), 100);
              }}
              className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-2 cursor-pointer hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-2"
            >
              <span>{note.sessionTitle || session.title}</span>
              <Edit2 size={16} className="text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </h1>
          )}

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Calendar size={13} className="text-emerald-500" />
              {session.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock size={13} className="text-emerald-500" />
              {session.time} WIB
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-emerald-500" />
              {session.location}
            </span>
          </div>
        </div>

        {/* Activity Checklist Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl">
                <Check className="text-emerald-600 dark:text-emerald-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Aktivitas Latihan</h2>
                <p className="text-xs text-slate-400">Centang checklist atau edit teks aktivitas secara langsung</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                {completedActivitiesCount} / {note.activities.length} Selesai ({progressPercent}%)
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          {note.activities.length > 0 && (
            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {/* Activity Rows */}
          <div className="space-y-2.5 pt-1">
            {note.activities.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                <p>Belum ada aktivitas latihan pada checklist ini.</p>
                <div className="flex justify-center gap-2">
                  <button
                    onClick={handleAddActivity}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition-colors"
                  >
                    + Tambah Aktivitas Manual
                  </button>
                  <button
                    onClick={handleResetToTemplate}
                    className="px-3 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
                  >
                    Gunakan Template Futsal
                  </button>
                </div>
              </div>
            ) : (
              <AnimatePresence>
                {note.activities.map((activity, index) => (
                  <motion.div 
                    key={activity.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-center gap-3 p-2.5 px-3 rounded-2xl border transition-all ${
                      activity.done
                        ? 'bg-emerald-500/5 border-emerald-500/20'
                        : 'bg-slate-50/70 dark:bg-slate-950/70 border-slate-200/70 dark:border-slate-800/70 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    {/* Checkbox button */}
                    <button
                      onClick={() => handleToggleActivity(activity.id)}
                      title={activity.done ? "Tandai belum selesai" : "Tandai selesai"}
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all active:scale-90 ${
                        activity.done 
                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/30' 
                          : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                      }`}
                    >
                      {activity.done && <Check size={14} strokeWidth={3} />}
                    </button>

                    {/* Step number badge */}
                    <span className="text-[11px] font-mono text-slate-400 font-bold w-4 text-center">
                      {index + 1}
                    </span>

                    {/* Editable input field */}
                    <input
                      type="text"
                      value={activity.text}
                      onChange={(e) => handleUpdateActivity(activity.id, e.target.value)}
                      placeholder="Ketik aktivitas latihan di sini..."
                      className={`flex-1 bg-transparent outline-none py-1 text-sm font-medium transition-colors ${
                        activity.done 
                          ? 'line-through text-slate-400 dark:text-slate-500' 
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    />

                    {/* Delete item button */}
                    <button
                      onClick={() => handleRemoveActivity(activity.id)}
                      title="Hapus aktivitas ini"
                      className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
          
          {/* Action buttons under checklist */}
          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              onClick={handleAddActivity}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold rounded-2xl transition-all text-xs active:scale-95"
            >
              <Plus size={16} />
              <span>Tambah Aktivitas Sendiri</span>
            </button>
            <div className="flex gap-2">
              <button
                onClick={handleResetToTemplate}
                title="Isi dengan 5 materi standar latihan futsal"
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Sparkles size={13} className="text-amber-500" />
                <span>Template Standar</span>
              </button>
              {note.activities.length > 0 && (
                <button
                  onClick={handleClearActivities}
                  title="Hapus semua baris checklist"
                  className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 text-slate-500 rounded-2xl text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Coach Notes (Apa saja yang dilakukan & Evaluasi) */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <FileText className="text-blue-600 dark:text-blue-400" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Catatan & Apa Saja yang Dilakukan</h2>
              <p className="text-xs text-slate-400">Tulis ringkasan jalannya latihan, evaluasi taktik, dan arahan pelatih</p>
            </div>
          </div>
          <textarea
            value={note.notes}
            onChange={handleNotesChange}
            placeholder="Contoh: Pada sesi hari ini tim fokus pada transisi cepat dari bertahan ke menyerang. Finishing pemain nomor 98 sangat baik. Poin yang perlu diperbaiki: komunikasi antar anchor dan kiper saat build-up bola..."
            className="w-full h-44 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none focus:border-blue-400 dark:focus:border-blue-500 transition-colors resize-y text-slate-700 dark:text-slate-200 text-sm leading-relaxed"
          />
        </div>

        {/* Photo Gallery Documentation */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                <ImageIcon className="text-amber-600 dark:text-amber-400" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Dokumentasi Foto Latihan</h2>
                <p className="text-xs text-slate-400">Lampirkan foto kegiatan latihan sebagai bukti pertemuan</p>
              </div>
            </div>
            {note.photos.length > 0 && (
              <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-full">
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
                  className="relative aspect-video rounded-2xl overflow-hidden group border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800"
                >
                  <img src={photo} alt={`Dokumentasi ${index + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removePhoto(index)}
                    title="Hapus foto ini"
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-full transition-colors opacity-100 md:opacity-0 md:group-hover:opacity-100"
                  >
                    <Trash2 size={15} />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="flex gap-3">
            <button
              onClick={startCamera}
              className="flex-1 flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl transition-colors cursor-pointer group"
            >
              <Camera className="text-slate-400 group-hover:text-emerald-500 mb-1.5 transition-colors" size={24} />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Ambil Foto Kamera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center py-4 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl transition-colors cursor-pointer group"
            >
              <ImageIcon className="text-slate-400 group-hover:text-amber-500 mb-1.5 transition-colors" size={24} />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">Pilih dari Galeri</span>
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

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="text-xs text-slate-400">
            {lastSaved ? (
              <span>Terakhir disimpan: {lastSaved.toLocaleTimeString('id-ID')} WIB</span>
            ) : (
              <span>Perubahan otomatis tersimpan</span>
            )}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => router.push('/meeting-notes')}
              className="flex-1 sm:flex-initial px-5 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 transition-colors"
            >
              Daftar Buku Latihan
            </button>
            <button
              onClick={handleManualSave}
              className="flex-1 sm:flex-initial px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Save size={16} />
              <span>Simpan Catatan</span>
            </button>
          </div>
        </div>
      </main>

      {/* Camera Capture Modal */}
      {showCamera && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
          <div className="flex justify-between items-center text-white">
            <span className="text-sm font-medium">Ambil Dokumentasi Latihan</span>
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
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform cursor-pointer"
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
