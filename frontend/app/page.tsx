"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  CalendarCheck,
  ClipboardCheck,
  TrendingUp,
  ChevronRight,
  Clock,
  MapPin,
  Zap,
  ScanFace,
  AlertCircle,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { StatCard } from "@/components/ui/States";
import { getPlayers, getTrainingSessions } from "@/lib/api";
import { getStoredKioskAttendances, type AttendanceRecord } from "@/lib/dataStore";
import type { Player } from "@/types/player";
import type { TrainingSession } from "@/types/training";

const quickActions = [
  { label: "Mulai Absensi", href: "/kiosk/attendance", icon: ScanFace, color: "from-primary-500 to-primary-600" },
  { label: "Tambah Pemain", href: "/players", icon: Users, color: "from-blue-500 to-blue-600" },
  { label: "Buat Sesi", href: "/training", icon: CalendarCheck, color: "from-purple-500 to-purple-600" },
  { label: "Evaluasi", href: "/evaluations", icon: TrendingUp, color: "from-accent-500 to-accent-600" },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [kioskAttendances, setKioskAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      getPlayers().then(res => res.data).catch(() => []),
      getTrainingSessions().then(res => res.data).catch(() => []),
    ]).then(([fetchedPlayers, fetchedSessions]) => {
      if (!mounted) return;
      setPlayers(fetchedPlayers);
      setSessions(fetchedSessions);
      setKioskAttendances(getStoredKioskAttendances());
      setIsLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const activePlayers = players.filter(p => p.status === "active");
  const faceRegisteredCount = players.filter(p => p.face_registered).length;

  // Next scheduled training session
  const upcomingSession = sessions.find(s => s.status === "scheduled");

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* ── Hero Card ── */}
      <motion.section variants={item} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-dark-900 via-dark-800 to-primary-950 p-6 md:p-8 text-white">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-primary-500/10 blur-3xl" />
          <div className="absolute -bottom-10 -left-10 w-48 h-48 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute top-1/2 right-1/4 w-1 h-1 rounded-full bg-primary-400 animate-pulse" />
          <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 rounded-full bg-cyan-400 animate-pulse delay-300" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-400 mb-2">
              LATIHAN BERIKUTNYA
            </p>
            <h1 className="text-2xl md:text-3xl font-extrabold mb-2">
              Selamat datang, <span className="gradient-text">Coach!</span>
            </h1>
            <p className="text-dark-300 text-sm max-w-md">
              Kelola tim dan pantau kehadiran biometrik pemain secara real-time.
            </p>

            {/* Training Info */}
            {upcomingSession ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4">
                <div className="flex items-center gap-1.5 text-sm text-dark-300">
                  <Clock className="w-3.5 h-3.5 text-primary-400" />
                  <span>{upcomingSession.training_date} · {upcomingSession.start_time} WIB</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm text-dark-300">
                  <MapPin className="w-3.5 h-3.5 text-primary-400" />
                  <span className="truncate max-w-[200px]">{upcomingSession.location}</span>
                </div>
              </div>
            ) : (
              <div className="mt-4 text-sm text-dark-400 flex items-center gap-2">
                <Clock className="w-4 h-4 text-dark-500" />
                <span>Belum ada sesi latihan terjadwal</span>
              </div>
            )}
          </div>

          <Link
            href="/kiosk/attendance"
            className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-primary-500 to-emerald-400 text-white font-bold text-sm shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 active:scale-95 transition-all min-h-[56px] whitespace-nowrap"
          >
            <Zap className="w-5 h-5" />
            Mulai Absensi
          </Link>
        </div>
      </motion.section>

      {/* ── Stats Grid ── */}
      <motion.section variants={item} className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Pemain Aktif"
          value={String(activePlayers.length)}
          detail={players.length > 0 ? `${players.length} total terdaftar` : "Belum ada pemain"}
          icon={<Users className="w-5 h-5" />}
          trend="neutral"
          color="emerald"
        />
        <StatCard
          label="Kehadiran"
          value={kioskAttendances.length > 0 ? `${kioskAttendances.length} sesi` : "0"}
          detail="Total check-in tercatat"
          icon={<ClipboardCheck className="w-5 h-5" />}
          trend="neutral"
          color="blue"
        />
        <StatCard
          label="Evaluasi Tertunda"
          value="0"
          detail="Semua selesai"
          icon={<AlertCircle className="w-5 h-5" />}
          color="amber"
        />
        <StatCard
          label="Wajah Terdaftar"
          value={String(faceRegisteredCount)}
          detail={players.length > 0 ? `${Math.round((faceRegisteredCount / players.length) * 100)}% dari tim` : "0%"}
          icon={<ScanFace className="w-5 h-5" />}
          color="purple"
        />
      </motion.section>

      {/* ── Quick Actions ── */}
      <motion.section variants={item}>
        <h2 className="text-sm font-bold uppercase tracking-wider text-dark-400 dark:text-dark-500 mb-3">
          Aksi Cepat
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                href={action.href}
                className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50 hover:border-primary-300 dark:hover:border-primary-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-dark-700 dark:text-dark-300">{action.label}</span>
              </Link>
            );
          })}
        </div>
      </motion.section>

      {/* ── Recent Attendance ── */}
      <motion.section variants={item}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold uppercase tracking-wider text-dark-400 dark:text-dark-500">
            Kehadiran Terakhir
          </h2>
          <Link
            href="/attendance"
            className="text-xs font-bold text-primary-600 dark:text-primary-400 flex items-center gap-0.5 hover:gap-1.5 transition-all"
          >
            Lihat semua <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="rounded-2xl bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50 overflow-hidden divide-y divide-dark-100 dark:divide-dark-800">
          {kioskAttendances.length === 0 ? (
            <div className="p-8 text-center text-dark-400 dark:text-dark-500 text-sm">
              Belum ada riwayat kehadiran tercatat. Buka Kiosk untuk mulai absensi wajah.
            </div>
          ) : (
            kioskAttendances.slice(0, 5).map((att, index) => (
              <motion.div
                key={att.id || index}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-emerald-500 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                  {att.jersey || "#"}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-dark-900 dark:text-white truncate">{att.name}</p>
                  <p className="text-xs text-dark-400 dark:text-dark-500 tabular-nums">{att.time}</p>
                </div>
                <div className={`flex items-center gap-1 text-xs font-bold ${att.status === "present" ? "text-emerald-500" : "text-amber-500"}`}>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {att.status === "present" ? "Hadir" : "Terlambat"}
                </div>
              </motion.div>
            ))
          )}
        </div>
      </motion.section>
    </motion.div>
  );
}
