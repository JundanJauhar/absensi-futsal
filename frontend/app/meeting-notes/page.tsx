"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Calendar,
  Camera,
  Clock,
  ChevronRight,
  FileText,
  Image,
  Plus,
  Search,
} from "lucide-react";
import {
  getStoredMeetingNotes,
  getStoredSessions,
  MeetingNote,
  TrainingSessionData,
} from "@/lib/dataStore";

export default function MeetingNotesListPage() {
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [sessions, setSessions] = useState<TrainingSessionData[]>([]);
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setNotes(getStoredMeetingNotes());
    setSessions(getStoredSessions());
  }, []);

  if (!mounted) return <div className="min-h-[400px]" />;

  // Sessions that have notes
  const sessionsWithNotes = notes
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Sessions without notes (for quick start)
  const sessionsWithoutNotes = sessions.filter(
    (s) => !notes.some((n) => n.sessionId === s.id)
  );

  const filteredNotes = search
    ? sessionsWithNotes.filter(
        (n) =>
          n.sessionTitle.toLowerCase().includes(search.toLowerCase()) ||
          n.notes.toLowerCase().includes(search.toLowerCase())
      )
    : sessionsWithNotes;

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-dark-900 dark:text-white uppercase italic">
            Buku <span className="gradient-text">Latihan</span>
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Catat dan lihat kembali aktivitas di setiap pertemuan latihan.
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Cari catatan pertemuan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Quick Start: Sesi Tanpa Catatan */}
      {sessionsWithoutNotes.length > 0 && !search && (
        <section>
          <h2 className="text-sm font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Mulai Catatan untuk Sesi Ini
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory">
            {sessionsWithoutNotes.slice(0, 5).map((session) => (
              <Link
                key={session.id}
                href={`/training/${session.id}/notes`}
                className="snap-start shrink-0 w-56 p-4 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-500/5 border border-primary-500/20 hover:border-primary-500/40 transition-all group"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-primary-500" />
                  <span className="text-xs font-bold text-primary-500">
                    {session.date}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-dark-900 dark:text-white line-clamp-2 group-hover:text-primary-500 transition-colors">
                  {session.title}
                </h3>
                <p className="text-xs text-dark-400 mt-1">
                  {session.time} WIB • {session.location}
                </p>
                <div className="flex items-center gap-1 mt-3 text-xs text-primary-500 font-bold">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Buat Catatan</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Existing Notes List */}
      <section>
        <h2 className="text-sm font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          Catatan Pertemuan ({filteredNotes.length})
        </h2>

        {filteredNotes.length === 0 ? (
          <div className="text-center py-16 glass bg-white dark:bg-dark-900 rounded-2xl border border-dark-200/50 dark:border-dark-800/50">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center mb-4 text-dark-400">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-dark-900 dark:text-white mb-1">
              Belum Ada Catatan
            </h3>
            <p className="text-sm text-dark-500 max-w-xs mx-auto">
              Pilih sesi latihan di atas untuk mulai mencatat aktivitas dan
              foto dokumentasi.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filteredNotes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  layout
                >
                  <Link
                    href={`/training/${note.sessionId}/notes`}
                    className="block glass bg-white dark:bg-dark-900 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 p-5 hover:border-primary-500/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-xs font-bold text-primary-500 px-2 py-0.5 rounded-full bg-primary-500/10 border border-primary-500/20">
                            {note.sessionDate}
                          </span>
                          {note.photos.length > 0 && (
                            <span className="text-xs font-bold text-amber-500 flex items-center gap-1">
                              <Camera className="w-3 h-3" />
                              {note.photos.length}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-dark-900 dark:text-white group-hover:text-primary-500 transition-colors truncate">
                          {note.sessionTitle}
                        </h3>

                        {/* Activity Preview */}
                        {note.activities.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {note.activities.slice(0, 3).map((act) => (
                              <span
                                key={act.id}
                                className={`text-[11px] px-2 py-0.5 rounded-lg border ${
                                  act.done
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 line-through"
                                    : "bg-dark-50 dark:bg-dark-800 border-dark-200 dark:border-dark-700 text-dark-600 dark:text-dark-300"
                                }`}
                              >
                                {act.text}
                              </span>
                            ))}
                            {note.activities.length > 3 && (
                              <span className="text-[11px] text-dark-400">
                                +{note.activities.length - 3} lainnya
                              </span>
                            )}
                          </div>
                        )}

                        {/* Notes Preview */}
                        {note.notes && (
                          <p className="text-xs text-dark-500 mt-2 line-clamp-2 italic">
                            &ldquo;{note.notes}&rdquo;
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-dark-400">
                          <Clock className="w-3 h-3" />
                          <span>
                            Terakhir diubah:{" "}
                            {new Date(note.updatedAt).toLocaleDateString(
                              "id-ID",
                              {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Photo Thumbnail */}
                      {note.photos.length > 0 && (
                        <div className="shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-dark-200 dark:bg-dark-800 border border-dark-200 dark:border-dark-700">
                          <img
                            src={note.photos[0]}
                            alt="Dokumentasi"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
}
