"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronLeft, 
  Edit2, 
  Trash2, 
  Calendar, 
  User, 
  Activity, 
  Clock, 
  Target, 
  ScanFace, 
  Zap, 
  Award,
  Upload,
  Camera,
  X,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { PlayerAvatar, PositionBadge, StatusBadge, EmptyState } from "@/components/ui/States";
import { 
  getPlayer,
  updatePlayer,
  deletePlayer,
} from "@/lib/api";
import type { Player } from "@/types/player";
import type { PlayerData } from "@/lib/dataStore";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

const TABS = [
  { id: "ringkasan", label: "Ringkasan" },
  { id: "absensi", label: "Absensi" },
  { id: "evaluasi", label: "Evaluasi" },
  { id: "perkembangan", label: "Perkembangan" },
];

const MOCK_ATTENDANCE = [
  { id: "a1", date: "2026-10-02", time: "15:46:12", status: "present", method: "face_recognition", type: "Latihan Rutin" },
  { id: "a2", date: "2026-09-25", time: "15:48:00", status: "present", method: "face_recognition", type: "Latihan Rutin" },
  { id: "a3", date: "2026-09-18", time: "-", status: "absent", method: "manual", type: "Latihan Rutin" },
  { id: "a4", date: "2026-09-11", time: "16:05:20", status: "late", method: "manual", type: "Latihan Rutin" },
  { id: "a5", date: "2026-09-04", time: "15:50:11", status: "present", method: "face_recognition", type: "Latihan Rutin" },
];

const MOCK_EVALUATIONS = [
  { id: "e1", date: "30 Sep 2026", stamina: 85, passing: 88, shooting: 90, tactical: 82, notes: "Performa sangat solid di lini serang, transisi bertahan membaik." },
  { id: "e2", date: "15 Agu 2026", stamina: 80, passing: 82, shooting: 85, tactical: 76, notes: "Ada peningkatan stamina dan konsistensi passing pendek." },
];

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

export default function PlayerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const playerId = params.id as string;

  const [player, setPlayer] = useState<PlayerData | null>(null);
  const [activeTab, setActiveTab] = useState("ringkasan");
  const [isLoading, setIsLoading] = useState(true);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editJersey, setEditJersey] = useState("");
  const [editPosition, setEditPosition] = useState<PlayerData['position']>("Flank");
  const [editSecondary, setEditSecondary] = useState("");
  const [editStatus, setEditStatus] = useState<PlayerData['status']>("Aktif");
  const [editPhoto, setEditPhoto] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editError, setEditError] = useState("");

  // Load player by ID
  useEffect(() => {
    if (playerId) {
      getPlayer(Number(playerId))
        .then((response) => {
          const found = toPlayerData(response);
          setPlayer(found);
          setEditName(found.name);
          setEditJersey(found.jersey);
          setEditPosition(found.position);
          setEditSecondary(found.secondaryPosition || "-");
          setEditStatus(found.status);
          setEditPhoto(found.avatarUrl || "");
          setEditNotes(found.notes || "");
        })
        .catch(() => setPlayer(null))
        .finally(() => setIsLoading(false));
    }
  }, [playerId]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditPhoto(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;

    if (!editName.trim()) {
      setEditError("Nama lengkap wajib diisi");
      return;
    }
    if (!editJersey.trim()) {
      setEditError("Nomor punggung wajib diisi");
      return;
    }

    const positions: Record<PlayerData["position"], Player["primary_position"]> = {
      Kiper: "goalkeeper",
      Anchor: "anchor",
      Flank: "flank",
      Pivot: "pivot",
    };
    try {
      const updatedResponse = await updatePlayer(Number(player.id), {
        full_name: editName.trim(),
        jersey_number: Number(editJersey),
        primary_position: positions[editPosition],
        secondary_position: editSecondary === "-" ? "" : positions[editSecondary as PlayerData["position"]],
        joined_at: player.joinDate,
        status: editStatus === "Aktif" ? "active" : "inactive",
        notes: editNotes.trim(),
      });
      setPlayer(toPlayerData(updatedResponse));
      setIsEditOpen(false);
      setEditError("");
    } catch (error) {
      console.error("Failed to update player:", error);
      setEditError("Perubahan pemain tidak dapat disimpan ke server.");
    }
  };

  const handleDelete = () => {
    if (!player) return;
    if (confirm(`Yakin ingin menghapus pemain ${player.name} (#${player.jersey})?`)) {
      deletePlayer(Number(player.id))
        .then(() => router.push("/players"))
        .catch((error) => {
          console.error("Failed to delete player:", error);
          setEditError("Pemain tidak dapat dihapus dari server.");
        });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-16 space-y-4">
        <h2 className="text-2xl font-bold text-dark-900 dark:text-white">Pemain Tidak Ditemukan</h2>
        <p className="text-dark-500 text-sm">Pemain dengan ID &ldquo;{playerId}&rdquo; tidak ada dalam sistem.</p>
        <button
          onClick={() => router.push("/players")}
          className="px-5 py-2.5 bg-primary-600 hover:bg-primary-500 text-white rounded-xl font-bold text-sm"
        >
          Kembali ke Daftar Pemain
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => router.push("/players")}
          className="inline-flex items-center gap-2 text-dark-500 hover:text-dark-900 dark:hover:text-white transition-colors text-sm font-semibold"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Kembali ke Daftar</span>
        </button>

        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsEditOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 hover:bg-dark-200 dark:hover:bg-dark-700 font-semibold text-xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profil</span>
          </button>
          <button 
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 font-semibold text-xs transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Hapus</span>
          </button>
        </div>
      </div>

      {/* Profile Hero Card */}
      <div className="glass group relative overflow-hidden bg-white dark:bg-dark-900 rounded-3xl border border-dark-200/50 dark:border-dark-800/50 p-6 md:p-8 flex flex-col md:flex-row items-center md:items-start gap-6 shadow-xl">
        {/* Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Avatar + Watermark Jersey */}
        <div className="relative z-10 shrink-0">
          <PlayerAvatar 
            name={player.name} 
            photo={player.avatarUrl} 
            size="xl" 
            className="w-28 h-28 sm:w-36 sm:h-36 ring-4 ring-white dark:ring-dark-800 shadow-xl"
          />
          <div className="absolute -bottom-3 -right-3 w-12 h-12 bg-primary-500 rounded-full flex items-center justify-center text-white font-black italic text-xl border-4 border-white dark:border-dark-900 shadow-lg">
            #{player.jersey}
          </div>
        </div>

        {/* Player Info */}
        <div className="relative z-10 flex-1 flex flex-col items-center md:items-start text-center md:text-left">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 mb-2">
            <h1 className="text-2xl sm:text-3xl font-black text-dark-900 dark:text-white uppercase tracking-tight">
              {player.name}
            </h1>
            <StatusBadge status={player.status === "Aktif" ? "active" : "inactive"} />
          </div>

          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-4">
            <PositionBadge position={player.position} />
            {player.secondaryPosition && player.secondaryPosition !== "-" && (
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400 font-semibold">
                Sekunder: {player.secondaryPosition}
              </span>
            )}
            <span className="text-xs text-dark-400 dark:text-dark-500">
              Bergabung {player.joinDate}
            </span>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Link
              href={`/players/${player.id}/face-registration`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 border border-primary-500/20 text-xs font-bold transition-colors"
            >
              <ScanFace className="w-4 h-4" />
              <span>{player.faceRegistered ? "Perbarui Wajah Absensi" : "Daftarkan Wajah Absensi"}</span>
            </Link>

            <Link
              href={`/players/${player.id}/evaluation`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-500/10 hover:bg-accent-500/20 text-accent-500 border border-accent-500/20 text-xs font-bold transition-colors"
            >
              <Zap className="w-4 h-4" />
              <span>Evaluasi Pemain</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-200 dark:border-dark-800 gap-1 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 font-bold text-sm tracking-wide transition-colors relative whitespace-nowrap ${
              activeTab === tab.id 
                ? "text-primary-500" 
                : "text-dark-400 hover:text-dark-700 dark:hover:text-dark-200"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <motion.div 
                layoutId="activeTabIndicator" 
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" 
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
        >
          {/* TAB 1: RINGKASAN */}
          {activeTab === "ringkasan" && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 glass bg-white dark:bg-dark-900 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 p-6 space-y-4">
                <h3 className="text-base font-bold text-dark-900 dark:text-white uppercase tracking-wider">
                  Informasi Detail
                </h3>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-800">
                    <span className="text-xs text-dark-400 block mb-1">Posisi Utama</span>
                    <span className="font-bold text-dark-900 dark:text-white">{player.position}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-800">
                    <span className="text-xs text-dark-400 block mb-1">Nomor Punggung</span>
                    <span className="font-bold text-dark-900 dark:text-white">#{player.jersey}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-800">
                    <span className="text-xs text-dark-400 block mb-1">Status Keaktifan</span>
                    <span className="font-bold text-dark-900 dark:text-white">{player.status}</span>
                  </div>
                  <div className="p-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-800">
                    <span className="text-xs text-dark-400 block mb-1">Biometrik Wajah</span>
                    <span className={`font-bold ${player.faceRegistered ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {player.faceRegistered ? "Terdaftar ✓" : "Belum Terdaftar"}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-dark-400 block mb-1 uppercase font-semibold">Catatan Pelatih</span>
                  <div className="p-4 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-100 dark:border-dark-800 text-sm text-dark-700 dark:text-dark-300">
                    {player.notes || "Belum ada catatan khusus untuk pemain ini."}
                  </div>
                </div>
              </div>

              {/* Status Wajah Card */}
              <div className="glass bg-white dark:bg-dark-900 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 p-6 flex flex-col justify-between">
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center mb-4">
                    <ScanFace className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-dark-900 dark:text-white mb-1">
                    Status Absensi Wajah
                  </h3>
                  <p className="text-xs text-dark-500 mb-4">
                    {player.faceRegistered 
                      ? "Pemain ini dapat dikenali secara otomatis saat berdiri di depan kamera Kiosk Absensi."
                      : "Wajah pemain belum terdaftar. Daftarkan sekarang agar pemain bisa absen otomatis via kamera."}
                  </p>
                </div>

                <Link
                  href={`/players/${player.id}/face-registration`}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-xs text-center shadow-lg shadow-primary-500/20 active:scale-95 transition-all"
                >
                  {player.faceRegistered ? "Pindai Ulang Wajah" : "Daftarkan Wajah Sekarang"}
                </Link>
              </div>
            </div>
          )}

          {/* TAB 2: ABSENSI */}
          {activeTab === "absensi" && (
            <div className="glass bg-white dark:bg-dark-900 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 overflow-hidden">
              <div className="p-4 border-b border-dark-100 dark:border-dark-800 flex justify-between items-center">
                <h3 className="text-base font-bold text-dark-900 dark:text-white">Riwayat Kehadiran Pemain</h3>
                <span className="text-xs text-dark-400">Total 5 Sesi Terakhir</span>
              </div>
              <div className="divide-y divide-dark-100 dark:divide-dark-800">
                {MOCK_ATTENDANCE.map((att) => (
                  <div key={att.id} className="p-4 flex items-center justify-between hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center font-bold text-xs text-dark-600 dark:text-dark-300">
                        <Calendar className="w-4 h-4 text-primary-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-dark-900 dark:text-white">{att.type} • {att.date}</p>
                        <p className="text-xs text-dark-400">Metode: {att.method === 'face_recognition' ? 'Otomatis Kamera' : 'Manual Pelatih'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono text-dark-400">{att.time}</span>
                      <StatusBadge status={att.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: EVALUASI */}
          {activeTab === "evaluasi" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-dark-900 dark:text-white">Riwayat Hasil Evaluasi</h3>
                <Link
                  href={`/players/${player.id}/evaluation`}
                  className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs"
                >
                  + Tambah Evaluasi
                </Link>
              </div>

              {MOCK_EVALUATIONS.map((ev) => (
                <div key={ev.id} className="glass bg-white dark:bg-dark-900 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 p-5 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-primary-500">{ev.date}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-500 font-bold">
                      Avg Score: {Math.round((ev.stamina + ev.passing + ev.shooting + ev.tactical) / 4)}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 rounded-xl bg-dark-50 dark:bg-dark-950">
                      <span className="text-[10px] text-dark-400 block">Stamina</span>
                      <span className="text-base font-black text-dark-900 dark:text-white">{ev.stamina}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-dark-50 dark:bg-dark-950">
                      <span className="text-[10px] text-dark-400 block">Passing</span>
                      <span className="text-base font-black text-dark-900 dark:text-white">{ev.passing}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-dark-50 dark:bg-dark-950">
                      <span className="text-[10px] text-dark-400 block">Shooting</span>
                      <span className="text-base font-black text-dark-900 dark:text-white">{ev.shooting}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-dark-50 dark:bg-dark-950">
                      <span className="text-[10px] text-dark-400 block">Taktikal</span>
                      <span className="text-base font-black text-dark-900 dark:text-white">{ev.tactical}</span>
                    </div>
                  </div>
                  <p className="text-xs text-dark-600 dark:text-dark-300 italic">
                    &ldquo;{ev.notes}&rdquo;
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* TAB 4: PERKEMBANGAN */}
          {activeTab === "perkembangan" && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="glass p-4 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 bg-white dark:bg-dark-900">
                  <div className="flex items-center gap-2 text-primary-500 mb-1">
                    <Zap className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Overall</span>
                  </div>
                  <div className="text-3xl font-black text-dark-900 dark:text-white tabular-nums">85.4</div>
                  <span className="text-[11px] font-bold text-emerald-500">▲ +4.2 musim ini</span>
                </div>
                <div className="glass p-4 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 bg-white dark:bg-dark-900">
                  <div className="flex items-center gap-2 text-cyan-500 mb-1">
                    <Target className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Teknikal</span>
                  </div>
                  <div className="text-3xl font-black text-dark-900 dark:text-white tabular-nums">86.2</div>
                  <span className="text-[11px] text-dark-500">Passing & Dribble</span>
                </div>
                <div className="glass p-4 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 bg-white dark:bg-dark-900">
                  <div className="flex items-center gap-2 text-amber-500 mb-1">
                    <Activity className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Fisik</span>
                  </div>
                  <div className="text-3xl font-black text-dark-900 dark:text-white tabular-nums">87.5</div>
                  <span className="text-[11px] text-dark-500">Speed & Stamina</span>
                </div>
                <div className="glass p-4 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 bg-white dark:bg-dark-900">
                  <div className="flex items-center gap-2 text-purple-500 mb-1">
                    <Award className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Taktikal</span>
                  </div>
                  <div className="text-3xl font-black text-dark-900 dark:text-white tabular-nums">81.0</div>
                  <span className="text-[11px] text-dark-500">Positioning</span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass p-6 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 bg-white dark:bg-dark-900 flex flex-col items-center">
                  <div className="w-full flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-dark-900 dark:text-white">Profil Atribut Skill</h3>
                      <p className="text-xs text-dark-500">Visualisasi 8 parameter kemampuan</p>
                    </div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary-500/10 text-primary-500 border border-primary-500/20">Radar Mode</span>
                  </div>
                  <div className="w-full h-72 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={[
                        { skill: "Passing", value: 85 },
                        { skill: "Dribble", value: 88 },
                        { skill: "Shooting", value: 92 },
                        { skill: "Kontrol", value: 80 },
                        { skill: "Speed", value: 90 },
                        { skill: "Stamina", value: 85 },
                        { skill: "Taktik", value: 78 },
                        { skill: "Teamwork", value: 84 },
                      ]}>
                        <PolarGrid stroke="#334155" opacity={0.3} />
                        <PolarAngleAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 600 }} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#475569" opacity={0.2} />
                        <Radar name="Skor Pemain" dataKey="value" stroke="#10b981" fill="#10b981" fillOpacity={0.35} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="glass p-6 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 bg-white dark:bg-dark-900 flex flex-col justify-between">
                  <div className="w-full flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-base font-bold text-dark-900 dark:text-white">Tren Perkembangan</h3>
                      <p className="text-xs text-dark-500">Riwayat performa 5 sesi evaluasi</p>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-emerald-500 font-medium">● Teknik</span>
                      <span className="text-amber-500 font-medium">● Fisik</span>
                    </div>
                  </div>

                  <div className="w-full h-72 sm:h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={[
                        { session: "Sesi 1", teknikal: 76, fisik: 78, taktikal: 68 },
                        { session: "Sesi 2", teknikal: 79, fisik: 80, taktikal: 70 },
                        { session: "Sesi 3", teknikal: 82, fisik: 83, taktikal: 74 },
                        { session: "Sesi 4", teknikal: 85, fisik: 86, taktikal: 76 },
                        { session: "Sesi 5", teknikal: 88, fisik: 89, taktikal: 79 },
                      ]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="session" stroke="#64748b" fontSize={11} />
                        <YAxis domain={[50, 100]} stroke="#64748b" fontSize={11} />
                        <Tooltip contentStyle={{ backgroundColor: "#0f172a", borderColor: "#1e293b", borderRadius: "12px", color: "#fff", fontSize: "12px" }} />
                        <Line type="monotone" dataKey="teknikal" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: "#10b981" }} />
                        <Line type="monotone" dataKey="fisik" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, fill: "#f59e0b" }} />
                        <Line type="monotone" dataKey="taktikal" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: "#8b5cf6" }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {isEditOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsEditOpen(false)}
              className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-4 top-[8%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-dark-100 dark:border-dark-800 mb-5">
                <h2 className="text-xl font-bold text-dark-900 dark:text-white">Edit Data Pemain</h2>
                <button 
                  onClick={() => setIsEditOpen(false)}
                  className="w-8 h-8 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-500 hover:text-dark-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {editError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveEdit} className="space-y-4">
                {/* Photo Preview & Upload */}
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800">
                  <div className="relative w-20 h-20 rounded-2xl bg-dark-200 dark:bg-dark-800 overflow-hidden shrink-0 flex items-center justify-center border border-dark-300 dark:border-dark-700">
                    {editPhoto ? (
                      <img src={editPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-dark-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-dark-900 dark:text-white uppercase tracking-wider mb-1">
                      Foto Profil / Wajah
                    </label>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{editPhoto ? "Ganti Foto" : "Unggah Foto"}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoUpload} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                    Nama Lengkap
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Nomor Punggung
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="99"
                      value={editJersey}
                      onChange={(e) => setEditJersey(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as PlayerData['status'])}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                    >
                      <option value="Aktif">Aktif</option>
                      <option value="Nonaktif">Nonaktif</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Posisi Utama
                    </label>
                    <select
                      value={editPosition}
                      onChange={(e) => setEditPosition(e.target.value as PlayerData['position'])}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                    >
                      <option value="Kiper">Kiper</option>
                      <option value="Anchor">Anchor</option>
                      <option value="Flank">Flank</option>
                      <option value="Pivot">Pivot</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Posisi Sekunder
                    </label>
                    <select
                      value={editSecondary}
                      onChange={(e) => setEditSecondary(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                    >
                      <option value="Kiper">Kiper</option>
                      <option value="Anchor">Anchor</option>
                      <option value="Flank">Flank</option>
                      <option value="Pivot">Pivot</option>
                      <option value="-">-</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                    Catatan Pelatih
                  </label>
                  <textarea
                    rows={2}
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditOpen(false)}
                    className="flex-1 py-3 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 font-bold text-sm"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/25 transition-all"
                  >
                    Simpan Perubahan
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
