"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Calendar,
  Camera,
  Clock,
  ChevronRight,
  FileText,
  Plus,
  Search,
  Trash2,
  X,
  Sparkles,
  CheckCircle2,
  MapPin
} from "lucide-react";
import {
  getStoredMeetingNotes,
  getStoredSessions,
  saveStoredSessions,
  deleteMeetingNote,
  createInitialMeetingNote,
  MeetingNote,
  TrainingSessionData,
  DEFAULT_FUTSAL_ACTIVITIES
} from "@/lib/dataStore";
import { getTrainingSessions } from "@/lib/api";

export default function MeetingNotesListPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionData[]>([]);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  // Modal State for Manual Creation
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creationMode, setCreationMode] = useState<"existing" | "new">("existing");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  
  // Fields for new manual session
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState("16:00");
  const [newLocation, setNewLocation] = useState("Lapangan Futsal");
  const [useTemplate, setUseTemplate] = useState(true);

  const loadData = async () => {
    const localNotes = getStoredMeetingNotes();
    setNotes(localNotes);

    const localSessions = getStoredSessions();
    let combinedSessions = [...localSessions];

    try {
      const res = await getTrainingSessions();
      if (res.data) {
        const apiSessions: TrainingSessionData[] = res.data.map(s => ({
          id: String(s.id),
          title: s.title || "Latihan Tim",
          date: s.training_date,
          time: s.start_time,
          endTime: s.end_time,
          location: s.location,
          type: "Latihan Rutin",
          status: s.status,
          attendanceCount: s.attendances_count || 0,
        }));

        // Merge without duplicates
        const seen = new Set(localSessions.map(s => String(s.id)));
        for (const s of apiSessions) {
          if (!seen.has(String(s.id))) {
            combinedSessions.push(s);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load sessions from API:", err);
    }

    setSessions(combinedSessions);
  };

  useEffect(() => {
    setMounted(true);
    loadData();
  }, []);

  if (!mounted) return <div className="min-h-[400px]" />;

  // Sessions that have notes
  const sessionsWithNotes = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Sessions without notes (for quick start)
  const sessionsWithoutNotes = sessions.filter(
    (s) => !notes.some((n) => String(n.sessionId) === String(s.id))
  );

  const filteredNotes = search
    ? sessionsWithNotes.filter(
        (n) =>
          n.sessionTitle.toLowerCase().includes(search.toLowerCase()) ||
          n.notes.toLowerCase().includes(search.toLowerCase())
      )
    : sessionsWithNotes;

  const handleDeleteNote = (e: React.MouseEvent, noteId: string, title: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm(`Hapus buku latihan untuk "${title}"?`)) {
      deleteMeetingNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
    }
  };

  const handleCreateManualNote = (e: React.FormEvent) => {
    e.preventDefault();

    let targetSessionId = "";
    let targetTitle = "";
    let targetDate = "";

    if (creationMode === "existing") {
      if (!selectedSessionId) {
        alert("Pilih sesi latihan terlebih dahulu.");
        return;
      }
      const targetSession = sessions.find(s => String(s.id) === String(selectedSessionId));
      if (!targetSession) return;
      targetSessionId = String(targetSession.id);
      targetTitle = targetSession.title;
      targetDate = targetSession.date;
    } else {
      if (!newTitle.trim()) {
        alert("Masukkan judul atau topik latihan.");
        return;
      }
      targetSessionId = `manual_${Date.now()}`;
      targetTitle = newTitle.trim();
      targetDate = newDate;

      // Save this new session into local store
      const newManualSession: TrainingSessionData = {
        id: targetSessionId,
        title: targetTitle,
        date: targetDate,
        time: newTime,
        location: newLocation.trim() || "Lapangan Futsal",
        type: "Latihan Rutin",
        status: "scheduled",
      };
      saveStoredSessions([newManualSession, ...getStoredSessions()]);
    }

    // Create the note
    const customActivities = useTemplate 
      ? DEFAULT_FUTSAL_ACTIVITIES.map((a, i) => ({ id: `act_${Date.now()}_${i}`, ...a }))
      : [];

    createInitialMeetingNote(targetSessionId, targetTitle, targetDate, customActivities);

    setShowCreateModal(false);
    router.push(`/training/${targetSessionId}/notes`);
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-dark-900 dark:text-white uppercase italic">
            Buku <span className="gradient-text">Latihan</span>
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Catat checklist aktivitas, apa saja yang dilakukan, dan dokumentasi foto di setiap pertemuan.
          </p>
        </div>

        <button
          onClick={() => {
            if (sessionsWithoutNotes.length > 0) {
              setSelectedSessionId(String(sessionsWithoutNotes[0].id));
              setCreationMode("existing");
            } else {
              setCreationMode("new");
            }
            setShowCreateModal(true);
          }}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm shadow-lg shadow-emerald-500/25 active:scale-95 transition-all flex items-center gap-2"
        >
          <Plus size={18} />
          <span>+ Buat Catatan Baru</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari catatan pertemuan, topik, atau evaluasi pelatih..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* Quick Start: Sesi Tanpa Catatan */}
      {sessionsWithoutNotes.length > 0 && !search && (
        <section>
          <h2 className="text-xs font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-500" />
            <span>Mulai Catatan untuk Sesi Ini ({sessionsWithoutNotes.length})</span>
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
            {sessionsWithoutNotes.slice(0, 6).map((session) => (
              <Link
                key={session.id}
                href={`/training/${session.id}/notes`}
                className="snap-start shrink-0 w-60 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 hover:border-emerald-500/40 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {session.date}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-dark-900 dark:text-white line-clamp-1 group-hover:text-emerald-500 transition-colors">
                  {session.title}
                </h3>
                <p className="text-xs text-dark-400 mt-1 truncate">
                  {session.time} WIB • {session.location}
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Buka Buku Latihan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Existing Notes List */}
      <section>
        <h2 className="text-xs font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-emerald-500" />
          <span>Daftar Buku Latihan ({filteredNotes.length})</span>
        </h2>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 glass bg-white dark:bg-dark-900 rounded-3xl border border-dark-200/50 dark:border-dark-800/50 p-6 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-400">
              <BookOpen className="w-8 h-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-bold text-dark-900 dark:text-white">
              Belum Ada Buku Latihan
            </h3>
            <p className="text-sm text-dark-500 max-w-sm mx-auto">
              Buku latihan akan otomatis dibuat saat membuat sesi latihan, atau klik tombol di bawah untuk membuat catatan manual.
            </p>
            <div className="pt-2">
              <button
                onClick={() => {
                  setCreationMode(sessionsWithoutNotes.length > 0 ? "existing" : "new");
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-colors inline-flex items-center gap-2"
              >
                <Plus size={16} />
                <span>Buat Catatan Manual</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotes.map((note) => {
                const doneCount = note.activities.filter(a => a.done).length;
                const totalCount = note.activities.length;
                const percent = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;

                return (
                  <motion.div
                    key={note.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    layout
                  >
                    <Link
                      href={`/training/${note.sessionId}/notes`}
                      className="block glass bg-white dark:bg-dark-900 rounded-3xl border border-dark-200/50 dark:border-dark-800/50 p-5 hover:border-emerald-500/30 transition-all group relative"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                              {note.sessionDate}
                            </span>
                            {totalCount > 0 && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {doneCount}/{totalCount} Aktivitas ({percent}%)
                              </span>
                            )}
                            {note.photos.length > 0 && (
                              <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                                <Camera className="w-3.5 h-3.5" />
                                <span>{note.photos.length} Foto</span>
                              </span>
                            )}
                          </div>

                          <h3 className="text-base font-bold text-dark-900 dark:text-white group-hover:text-emerald-500 transition-colors truncate">
                            {note.sessionTitle}
                          </h3>

                          {/* Activity Preview Pills */}
                          {note.activities.length > 0 && (
                            <div className="mt-2.5 flex flex-wrap gap-1.5">
                              {note.activities.slice(0, 3).map((act) => (
                                <span
                                  key={act.id}
                                  className={`text-[11px] px-2.5 py-0.5 rounded-lg border font-medium ${
                                    act.done
                                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 line-through"
                                      : "bg-dark-50 dark:bg-dark-800 border-dark-200 dark:border-dark-700 text-dark-600 dark:text-dark-300"
                                  }`}
                                >
                                  {act.text || "Aktivitas"}
                                </span>
                              ))}
                              {note.activities.length > 3 && (
                                <span className="text-[11px] text-dark-400 font-medium self-center">
                                  +{note.activities.length - 3} lainnya
                                </span>
                              )}
                            </div>
                          )}

                          {/* Notes Preview */}
                          {note.notes && (
                            <p className="text-xs text-dark-500 dark:text-dark-400 mt-2 line-clamp-2 italic">
                              &ldquo;{note.notes}&rdquo;
                            </p>
                          )}

                          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-dark-400">
                            <Clock className="w-3 h-3" />
                            <span>
                              Terakhir diubah:{" "}
                              {new Date(note.updatedAt).toLocaleDateString("id-ID", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })} WIB
                            </span>
                          </div>
                        </div>

                        {/* Photo Thumbnail + Delete */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          {note.photos.length > 0 && (
                            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-dark-200 dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                              <img
                                src={note.photos[0]}
                                alt="Dokumentasi"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <button
                            onClick={(e) => handleDeleteNote(e, note.id, note.sessionTitle)}
                            title="Hapus buku latihan ini"
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </section>

      {/* MODAL: Buat Catatan Manual */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-[10%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-3 border-b border-dark-100 dark:border-dark-800">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-xl">
                    <BookOpen size={18} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-dark-900 dark:text-white">
                      Buat Buku Latihan Baru
                    </h3>
                    <p className="text-xs text-dark-400">Pilih sesi atau buat catatan materi manual</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="w-8 h-8 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-500 hover:text-dark-900 dark:hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateManualNote} className="space-y-4">
                {/* Mode Selector */}
                <div className="flex p-1 bg-dark-100 dark:bg-dark-800 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setCreationMode("existing")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      creationMode === "existing"
                        ? "bg-white dark:bg-dark-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "text-dark-500 hover:text-dark-900 dark:hover:text-white"
                    }`}
                  >
                    Pilih Sesi Terjadwal
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationMode("new")}
                    className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
                      creationMode === "new"
                        ? "bg-white dark:bg-dark-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                        : "text-dark-500 hover:text-dark-900 dark:hover:text-white"
                    }`}
                  >
                    Catatan Bebas / Baru
                  </button>
                </div>

                {creationMode === "existing" ? (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300">
                      Pilih Sesi Latihan
                    </label>
                    {sessionsWithoutNotes.length === 0 ? (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-dark-200 dark:border-dark-800 text-xs text-dark-400 text-center">
                        Semua sesi latihan yang ada sudah memiliki buku latihan. Pilih opsi &quot;Catatan Bebas / Baru&quot; di atas untuk membuat catatan materi baru.
                      </div>
                    ) : (
                      <select
                        value={selectedSessionId}
                        onChange={(e) => setSelectedSessionId(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                      >
                        {sessionsWithoutNotes.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.date} - {s.title} ({s.location})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                        Topik / Judul Latihan
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Contoh: Drill Finishing & Transisi Cepat"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                          Tanggal
                        </label>
                        <input
                          type="date"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                          Jam Latihan
                        </label>
                        <input
                          type="time"
                          value={newTime}
                          onChange={(e) => setNewTime(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-xs focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                        Lokasi Lapangan
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Lapangan Futsal Utama"
                        value={newLocation}
                        onChange={(e) => setNewLocation(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                )}

                {/* Template Option */}
                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-dark-900 dark:text-white">Gunakan Template Standar Futsal</p>
                      <p className="text-[11px] text-dark-400">Pemanasan, Passing Drill, Transisi, Game Mini, Pendinginan</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={useTemplate}
                    onChange={(e) => setUseTemplate(e.target.checked)}
                    className="w-5 h-5 rounded text-emerald-500 accent-emerald-500 cursor-pointer shrink-0"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-3.5 rounded-2xl bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 active:scale-95 transition-all"
                  >
                    Buat & Buka Catatan
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
