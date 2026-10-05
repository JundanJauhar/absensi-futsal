"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Search, 
  Plus, 
  ScanFace, 
  Frown, 
  X, 
  Upload, 
  Camera, 
  Check, 
  AlertCircle,
  UserPlus
} from "lucide-react";
import { PlayerAvatar, PositionBadge, SkeletonGrid, EmptyState } from "@/components/ui/States";
import { createPlayer, getPlayers } from "@/lib/api";
import type { Player } from "@/types/player";
import type { PlayerData } from "@/lib/dataStore";

const POSITIONS = ["Semua", "Kiper", "Anchor", "Flank", "Pivot"] as const;
const STATUSES = ["Semua", "Aktif", "Nonaktif"] as const;

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

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { opacity: 1, scale: 1 }
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [search, setSearch] = useState("");
  const [filterPosition, setFilterPosition] = useState<string>("Semua");
  const [filterStatus, setFilterStatus] = useState<string>("Semua");
  const [isLoading, setIsLoading] = useState(true);

  // Add Player Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formJersey, setFormJersey] = useState("");
  const [formPosition, setFormPosition] = useState<PlayerData['position']>("Flank");
  const [formSecondary, setFormSecondary] = useState<string>("Pivot");
  const [formPhoto, setFormPhoto] = useState<string>("");
  const [formNotes, setFormNotes] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    let mounted = true;
    getPlayers()
      .then((response) => {
        if (mounted) setPlayers(response.data.map(toPlayerData));
      })
      .catch((error) => {
        console.error("Failed to load players:", error);
        if (mounted) setFormError("Data pemain tidak dapat dimuat dari server.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Handle photo file selection
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setFormError("Ukuran foto maksimal 5 MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormPhoto(reader.result as string);
        setFormError("");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSavePlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!formName.trim()) {
      setFormError("Nama lengkap wajib diisi");
      return;
    }
    if (!formJersey.trim()) {
      setFormError("Nomor punggung wajib diisi");
      return;
    }

    // Check unique jersey
    const exists = players.some(p => p.jersey === formJersey.trim() && p.status === "Aktif");
    if (exists) {
      setFormError(`Nomor punggung #${formJersey.trim()} sudah digunakan oleh pemain aktif lain!`);
      return;
    }

    try {
      const positions: Record<PlayerData["position"], string> = {
        Kiper: "goalkeeper",
        Anchor: "anchor",
        Flank: "flank",
        Pivot: "pivot",
      };
      const createdResponse = await createPlayer({
        full_name: formName.trim(),
        jersey_number: Number(formJersey),
        primary_position: positions[formPosition],
        secondary_position: positions[formSecondary as PlayerData["position"]],
        joined_at: new Date().toISOString().split("T")[0],
        status: "active",
        notes: formNotes.trim(),
      });
      setPlayers(prev => [toPlayerData(createdResponse), ...prev]);
      setIsAddModalOpen(false);
    } catch (error) {
      console.error("Failed to create player:", error);
      setFormError("Pemain tidak dapat disimpan ke server.");
      return;
    }

    // Reset form
    setFormName("");
    setFormJersey("");
    setFormPosition("Flank");
    setFormSecondary("Pivot");
    setFormPhoto("");
    setFormNotes("");
    setFormError("");
  };

  // Filtered players
  const filteredPlayers = useMemo(() => {
    return players.filter(player => {
      const matchSearch = player.name.toLowerCase().includes(search.toLowerCase()) || 
                          player.jersey.includes(search);
      const matchPosition = filterPosition === "Semua" || player.position === filterPosition;
      const matchStatus = filterStatus === "Semua" || player.status === filterStatus;
      return matchSearch && matchPosition && matchStatus;
    });
  }, [players, search, filterPosition, filterStatus]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-dark-900 dark:text-white uppercase italic">
            Daftar <span className="gradient-text">Pemain</span>
          </h1>
          <p className="text-dark-500 dark:text-dark-400 mt-1">
            Kelola profil, nomor punggung, dan data wajah pemain tim futsal Anda.
          </p>
        </div>

        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="btn-glow flex items-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 text-white px-5 py-3 rounded-2xl transition-all font-bold whitespace-nowrap shadow-lg shadow-primary-500/30 active:scale-95"
        >
          <UserPlus className="w-5 h-5" />
          <span>Tambah Pemain</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="glass bg-white/80 dark:bg-dark-900/80 p-4 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-dark-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2.5 border border-dark-200 dark:border-dark-700 rounded-xl leading-5 bg-white dark:bg-dark-950 text-dark-900 dark:text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors"
            placeholder="Cari nama atau nomor punggung..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-dark-500 dark:text-dark-400 mr-1 hidden sm:inline-block">Posisi:</span>
            {POSITIONS.map(pos => (
              <button
                key={pos}
                onClick={() => setFilterPosition(pos)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filterPosition === pos 
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400" 
                    : "bg-dark-50 text-dark-600 hover:bg-dark-100 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
          
          <div className="h-px w-full sm:h-full sm:w-px bg-dark-200 dark:bg-dark-700 mx-1"></div>
          
          <div className="flex flex-wrap gap-2 items-center">
             <span className="text-sm text-dark-500 dark:text-dark-400 mr-1 hidden sm:inline-block">Status:</span>
            {STATUSES.map(stat => (
              <button
                key={stat}
                onClick={() => setFilterStatus(stat)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  filterStatus === stat 
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-900/40 dark:text-primary-400" 
                    : "bg-dark-50 text-dark-600 hover:bg-dark-100 dark:bg-dark-800 dark:text-dark-300 dark:hover:bg-dark-700"
                }`}
              >
                {stat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <SkeletonGrid count={8} />
      ) : filteredPlayers.length === 0 ? (
        <EmptyState 
          icon={<Frown className="w-8 h-8 text-dark-400 dark:text-dark-500" />} 
          title="Tidak ada pemain ditemukan" 
          description="Coba sesuaikan kata kunci pencarian atau filter yang digunakan." 
        />
      ) : (
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          <AnimatePresence>
            {filteredPlayers.map((player) => (
              <motion.div key={player.id} variants={itemVariants} layout>
                <Link href={`/players/${player.id}`} className="block h-full group">
                  <div className="glass group relative h-full flex flex-col items-center p-6 bg-white dark:bg-dark-900 rounded-2xl border border-dark-200/50 dark:border-dark-800/50 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/10 dark:hover:shadow-primary-900/20 hover:border-primary-500/30">
                    
                    {/* Big Watermark Jersey Number */}
                    <div className="absolute -top-4 -right-2 text-8xl font-black italic text-dark-100 dark:text-dark-800/50 select-none z-0 transition-transform group-hover:scale-110 group-hover:text-dark-200 dark:group-hover:text-dark-800">
                      {player.jersey}
                    </div>

                    <div className="relative z-10 flex flex-col items-center w-full">
                      <PlayerAvatar 
                        name={player.name} 
                        photo={player.avatarUrl} 
                        size="lg" 
                        className="mb-4 ring-4 ring-white dark:ring-dark-950 shadow-md group-hover:ring-primary-100 dark:group-hover:ring-primary-900/30 transition-all"
                      />
                      
                      <h3 className="text-lg font-bold text-dark-900 dark:text-white text-center mb-1 line-clamp-1 group-hover:text-primary-500 transition-colors">
                        {player.name}
                      </h3>
                      
                      <div className="flex flex-col items-center gap-2 mt-2">
                        <PositionBadge position={player.position} />
                        
                        <div className="flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-full bg-dark-50 dark:bg-dark-800/80 border border-dark-100 dark:border-dark-700/50">
                          <ScanFace className={`w-3.5 h-3.5 ${player.faceRegistered ? 'text-emerald-500' : 'text-dark-400'}`} />
                          <span className={`text-xs font-medium ${player.faceRegistered ? 'text-emerald-600 dark:text-emerald-400' : 'text-dark-500 dark:text-dark-400'}`}>
                            {player.faceRegistered ? "Wajah Terdaftar" : "Belum Ada Wajah"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* MODAL: Tambah Pemain */}
      <AnimatePresence>
        {isAddModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="fixed inset-0 bg-dark-950/80 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-x-4 top-[8%] md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg z-50 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto"
            >
              <div className="flex justify-between items-center pb-4 border-b border-dark-100 dark:border-dark-800 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center font-bold">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-dark-900 dark:text-white">Tambah Pemain Baru</h2>
                    <p className="text-xs text-dark-400">Daftarkan pemain & foto wajah untuk absensi</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-dark-100 dark:bg-dark-800 flex items-center justify-center text-dark-500 hover:text-dark-900 dark:hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSavePlayer} className="space-y-4">
                {/* Photo Upload with preview */}
                <div className="flex items-center gap-4 p-3 rounded-2xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800">
                  <div className="relative w-20 h-20 rounded-2xl bg-dark-200 dark:bg-dark-800 overflow-hidden shrink-0 flex items-center justify-center border border-dark-300 dark:border-dark-700">
                    {formPhoto ? (
                      <img src={formPhoto} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <Camera className="w-8 h-8 text-dark-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-xs font-bold text-dark-900 dark:text-white uppercase tracking-wider mb-1">
                      Foto Profil / Wajah
                    </label>
                    <p className="text-xs text-dark-500 mb-2">
                      Foto ini digunakan untuk identifikasi & absensi wajah otomatis.
                    </p>
                    <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-xs font-semibold cursor-pointer transition-colors">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{formPhoto ? "Ganti Foto" : "Unggah Foto"}</span>
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
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Nomor Punggung <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="1 - 99"
                      min="1"
                      max="99"
                      value={formJersey}
                      onChange={(e) => setFormJersey(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                      Posisi Utama <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={formPosition}
                      onChange={(e) => setFormPosition(e.target.value as PlayerData['position'])}
                      className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                    >
                      <option value="Kiper">Kiper</option>
                      <option value="Anchor">Anchor</option>
                      <option value="Flank">Flank</option>
                      <option value="Pivot">Pivot</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                    Posisi Sekunder
                  </label>
                  <select
                    value={formSecondary}
                    onChange={(e) => setFormSecondary(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  >
                    <option value="Kiper">Kiper</option>
                    <option value="Anchor">Anchor</option>
                    <option value="Flank">Flank</option>
                    <option value="Pivot">Pivot</option>
                    <option value="-">-</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-dark-700 dark:text-dark-300 mb-1">
                    Catatan Pelatih
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Catatan kelebihan, fokus latihan..."
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-dark-50 dark:bg-dark-950 border border-dark-200 dark:border-dark-800 text-dark-900 dark:text-white text-sm focus:outline-none focus:border-primary-500 transition-colors"
                  />
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="flex-1 py-3.5 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 font-bold text-sm hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-primary-600 to-primary-500 text-white font-bold text-sm shadow-lg shadow-primary-500/25 active:scale-95 transition-all"
                  >
                    Simpan Pemain
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
