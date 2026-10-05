"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  ChevronRight, 
  Edit3, 
  AlertTriangle,
  X,
  Users,
  Timer,
  CheckCircle2,
  CalendarCheck,
  BookOpen,
  ScanFace
} from 'lucide-react';
import clsx from 'clsx';
import { StatusBadge } from '@/components/ui/States';
import { getTrainingSessions, createTrainingSession, rescheduleTraining } from '@/lib/api';
import type { TrainingSessionData } from '@/lib/dataStore';

const formatDayName = (dateStr: string) => {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(d);
};

const formatDateNumber = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.getDate();
};

const formatMonthYear = (dateStr: string) => {
  const d = new Date(dateStr);
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(d);
};

export default function TrainingPage() {
  const [mounted, setMounted] = useState(false);
  const [sessions, setSessions] = useState<TrainingSessionData[]>([]);

  // Create Session State
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [formTitle, setFormTitle] = useState("Latihan Rutin");
  const [formDate, setFormDate] = useState("");
  const [formTime, setFormTime] = useState("16:00");
  const [formEndTime, setFormEndTime] = useState("18:00");
  const [formLocation, setFormLocation] = useState("Pondok Pesantren Sunan Pandanaran");
  const [formType, setFormType] = useState<TrainingSessionData['type']>("Latihan Rutin");
  const [createError, setCreateError] = useState("");

  // Reschedule State
  const [rescheduleSession, setRescheduleSession] = useState<TrainingSessionData | null>(null);
  const [rescheduleStep, setRescheduleStep] = useState(1);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('16:00');
  const [rescheduleReason, setRescheduleReason] = useState('');

  useEffect(() => {
    setMounted(true);
    getTrainingSessions()
      .then(({ data }) => setSessions(data.map((session): TrainingSessionData => ({
        id: String(session.id),
        title: session.title || "Latihan Futsal",
        date: session.training_date,
        time: session.start_time,
        endTime: session.end_time,
        location: session.location,
        type: "Latihan Rutin",
        status: session.status,
        attendanceCount: session.attendances_count || 0,
        totalPlayers: 0,
      }))))
      .catch((error) => {
        console.error("Failed to load training sessions:", error);
        setCreateError("Jadwal latihan tidak dapat dimuat dari server.");
      });
  }, []);

  if (!mounted) return <div className="min-h-screen bg-dark-950" />;

  const upcomingSessions = sessions.filter(s => s.status === 'scheduled');
  const pastSessions = sessions.filter(s => s.status === 'completed' || s.status === 'cancelled');
  const nextSession = upcomingSessions[0];

  const handleSaveNewSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError("");

    if (!formDate) {
      setCreateError("Silakan pilih tanggal latihan");
      return;
    }
    if (!formLocation.trim()) {
      setCreateError("Silakan isi lokasi latihan");
      return;
    }

    try {
      const created = await createTrainingSession({
        training_date: formDate,
        start_time: formTime,
        end_time: formEndTime,
        location: formLocation.trim(),
        status: "scheduled",
      });
      setSessions(prev => [{
        id: String(created.id),
        title: formTitle.trim() || "Latihan Tim",
        date: created.training_date,
        time: created.start_time,
        endTime: created.end_time,
        location: created.location,
        type: formType,
        status: created.status,
        attendanceCount: 0,
        totalPlayers: 0,
      }, ...prev]);
      setShowCreateSheet(false);
      setFormDate("");
      setCreateError("");
    } catch (error) {
      console.error("Failed to create training session:", error);
      setCreateError("Sesi latihan tidak dapat disimpan ke server.");
    }
  };

  const handleConfirmReschedule = async () => {
    if (!rescheduleSession || !newDate) return;

    try {
      const updated = await rescheduleTraining(Number(rescheduleSession.id), {
        new_date: newDate,
        new_start_time: newTime,
        new_location: rescheduleSession.location,
        reason: rescheduleReason.trim(),
      });
      setSessions(prev => prev.map(session => session.id === rescheduleSession.id ? {
        ...session,
        date: updated.training_date,
        time: updated.start_time,
        location: updated.location,
      } : session));
    } catch (error) {
      console.error("Failed to reschedule training session:", error);
      setCreateError("Sesi latihan tidak dapat dijadwalkan ulang.");
      return;
    }
    setRescheduleSession(null);
    setRescheduleStep(1);
    setNewDate('');
    setNewTime('16:00');
    setRescheduleReason('');
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-dark-900 dark:text-white uppercase italic">
            Jadwal <span className="gradient-text">Latihan</span>
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Kelola sesi latihan rutin, pertandingan persahabatan, dan penjadwalan ulang.
          </p>
        </div>

        <button
          onClick={() => {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            setFormDate(tomorrow.toISOString().split("T")[0]);
            setShowCreateSheet(true);
          }}
          className="btn-glow flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white px-5 py-3 rounded-2xl font-bold whitespace-nowrap shadow-lg shadow-primary-500/30 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5" />
          <span>Buat Sesi Baru</span>
        </button>
      </div>

      {/* Highlight: Sesi Berikutnya */}
      {nextSession && (
        <section aria-labelledby="next-training-heading">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-900 via-dark-800 to-primary-950 p-6 sm:p-8 text-white border border-dark-800 shadow-2xl">
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-10 w-48 h-48 bg-cyan-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-500/20 text-primary-400 border border-primary-500/30 uppercase tracking-wider">
                  <CalendarCheck className="w-3.5 h-3.5" />
                  Sesi Latihan Terdekat
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-dark-800 text-dark-300 font-medium">
                  {nextSession.type}
                </span>
              </div>

              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                  <h2 id="next-training-heading" className="text-2xl sm:text-3xl font-black mb-2">
                    {nextSession.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-dark-300 text-sm mt-3">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-primary-400" />
                      <span>{formatDayName(nextSession.date)}, {formatDateNumber(nextSession.date)} {formatMonthYear(nextSession.date)} • {nextSession.time} WIB</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-primary-400" />
                      <span>{nextSession.location}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setRescheduleSession(nextSession);
                      setNewDate(nextSession.date);
                      setNewTime(nextSession.time);
                    }}
                    className="px-4 py-3 bg-dark-800 hover:bg-dark-700 text-dark-200 hover:text-white rounded-xl text-xs font-bold border border-dark-700 transition-colors flex items-center gap-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Reschedule</span>
                  </button>

                  <Link
                    href={`/kiosk/attendance?session=${nextSession.id}`}
                    className="px-5 py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-500/25 active:scale-95 transition-all flex items-center gap-2"
                  >
                    <span>Mulai Absensi</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Sesi Mendatang List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-dark-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary-500" />
            <span>Sesi Mendatang ({upcomingSessions.length})</span>
          </h2>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-dashed border-dark-300 dark:border-dark-800 text-dark-500">
            Belum ada jadwal sesi mendatang. Klik &ldquo;Buat Sesi Baru&rdquo; untuk menambahkan.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingSessions.map((session) => (
              <div
                key={session.id}
                className="glass group p-5 bg-white dark:bg-dark-900 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 hover:border-primary-500/30 transition-all flex items-start gap-4 shadow-sm"
              >
                {/* Date Badge */}
                <div className="w-14 h-16 rounded-2xl bg-gradient-to-br from-primary-500/10 to-primary-500/20 text-primary-500 flex flex-col items-center justify-center shrink-0 border border-primary-500/20">
                  <span className="text-[10px] font-bold uppercase">{formatDayName(session.date).slice(0, 3)}</span>
                  <span className="text-xl font-black">{formatDateNumber(session.date)}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-dark-900 dark:text-white truncate text-base">
                      {session.title}
                    </h3>
                    <StatusBadge status={session.status} />
                  </div>

                  <p className="text-xs text-dark-500 dark:text-dark-400 flex items-center gap-1.5 mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{session.time} {session.endTime ? `- ${session.endTime}` : ''} WIB</span>
                  </p>

                  <p className="text-xs text-dark-500 dark:text-dark-400 flex items-center gap-1.5 truncate">
                    <MapPin className="w-3.5 h-3.5" />
                    <span className="truncate">{session.location}</span>
                  </p>

                  {session.rescheduledFrom && (
                    <div className="mt-2 text-[11px] p-2 rounded-lg bg-amber-500/10 text-amber-500 flex items-center gap-1.5 border border-amber-500/20">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Reschedule dari {session.rescheduledFrom.date}</span>
                    </div>
                  )}

                  <div className="mt-3 pt-3 border-t border-dark-100 dark:border-dark-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Link
                        href={`/training/${session.id}/notes`}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Catatan</span>
                      </Link>
                      <Link
                        href={`/kiosk/attendance?session=${session.id}`}
                        className="text-xs font-bold text-amber-500 hover:text-amber-400 hover:underline flex items-center gap-1"
                      >
                        <ScanFace className="w-3.5 h-3.5" />
                        <span>Kiosk Absen</span>
                      </Link>
                    </div>
                    <button
                      onClick={() => {
                        setRescheduleSession(session);
                        setNewDate(session.date);
                        setNewTime(session.time);
                      }}
                      className="text-xs font-bold text-dark-500 hover:text-dark-900 dark:hover:text-white hover:underline flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Reschedule
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Riwayat Latihan */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-dark-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-dark-400" />
          <span>Riwayat Sesi Lampau</span>
        </h2>

        <div className="glass bg-white dark:bg-dark-900 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 divide-y divide-dark-100 dark:divide-dark-800 overflow-hidden">
          {pastSessions.map((session) => (
            <div key={session.id} className="p-4 flex items-center justify-between hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center font-bold text-xs text-dark-600 dark:text-dark-300">
                  <CalendarCheck className="w-5 h-5 text-dark-400" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-dark-900 dark:text-white">{session.title}</h4>
                  <p className="text-xs text-dark-400">{session.date} • {session.time} WIB • {session.location}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 sm:gap-4">
                <Link
                  href={`/training/${session.id}/notes`}
                  className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Catatan</span>
                </Link>
                <span className="text-xs text-dark-400 hidden sm:inline">
                  Kehadiran: <strong className="text-dark-700 dark:text-dark-200">{session.attendanceCount || 0} / 18</strong>
                </span>
                <StatusBadge status={session.status} />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MODAL / BOTTOM SHEET: Buat Sesi Baru */}
      <AnimatePresence>
        {showCreateSheet && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateSheet(false)}
              className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[8%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-dark-100 dark:border-dark-800 mb-5">
                <h2 className="text-xl font-bold text-dark-900 dark:text-white">Buat Sesi Latihan Baru</h2>
                <button 
                  onClick={() => setShowCreateSheet(false)}
                  className="w-8 h-8 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-500 hover:text-dark-900 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {createError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <form onSubmit={handleSaveNewSession} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                    Judul Sesi
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Latihan Rutin Jumat Sore"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Tanggal Latihan
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Tipe Sesi
                    </label>
                    <select
                      value={formType}
                      onChange={(e) => setFormType(e.target.value as TrainingSessionData['type'])}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                    >
                      <option value="Latihan Rutin">Latihan Rutin</option>
                      <option value="Latihan Taktik">Latihan Taktik</option>
                      <option value="Pertandingan">Pertandingan</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Jam Mulai (WIB)
                    </label>
                    <input
                      type="time"
                      required
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Jam Selesai
                    </label>
                    <input
                      type="time"
                      value={formEndTime}
                      onChange={(e) => setFormEndTime(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                    Lokasi Lapangan
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Pondok Pesantren Sunan Pandanaran"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateSheet(false)}
                    className="flex-1 py-3.5 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 font-bold text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/25 active:scale-95 transition-all"
                  >
                    Simpan Jadwal
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* MODAL: Reschedule */}
      <AnimatePresence>
        {rescheduleSession && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setRescheduleSession(null); setRescheduleStep(1); }}
              className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-[15%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md z-50 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl"
            >
              <div className="flex justify-between items-center pb-3 border-b border-dark-100 dark:border-dark-800 mb-4">
                <h3 className="text-lg font-bold text-dark-900 dark:text-white">
                  Reschedule Sesi Latihan
                </h3>
                <button 
                  onClick={() => { setRescheduleSession(null); setRescheduleStep(1); }}
                  className="w-8 h-8 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-xs">
                  <p className="text-dark-400 mb-1">Jadwal saat ini:</p>
                  <p className="font-bold text-dark-900 dark:text-white">
                    {rescheduleSession.date} • {rescheduleSession.time} WIB ({rescheduleSession.location})
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                      Tanggal Baru
                    </label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-xs focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                      Jam Baru (WIB)
                    </label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-xs focus:outline-none focus:border-primary-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-dark-700 dark:text-dark-300 mb-1">
                    Alasan Perubahan
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Ketersediaan fasilitas lapangan, cuaca hujan deras..."
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-xs focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    onClick={() => { setRescheduleSession(null); setRescheduleStep(1); }}
                    className="flex-1 py-3 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 font-bold text-xs"
                  >
                    Batal
                  </button>
                  <button
                    disabled={!newDate}
                    onClick={handleConfirmReschedule}
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold text-xs shadow-lg shadow-amber-500/25 disabled:opacity-50"
                  >
                    Konfirmasi Reschedule
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
