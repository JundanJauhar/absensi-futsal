"use client";

import { motion } from "framer-motion";
import {
  Palette,
  Type,
  Square,
  Layers,
  Zap,
  Users,
  Calendar,
  Check,
  AlertCircle,
  Inbox,
  Loader2,
  ScanFace,
} from "lucide-react";
import {
  StatCard,
  PositionBadge,
  StatusBadge,
  PlayerAvatar,
  EmptyState,
  ErrorState,
  SkeletonCard,
} from "@/components/ui/States";

const colors = [
  { name: "Primary 500", value: "#10b981", class: "bg-primary-500" },
  { name: "Primary 600", value: "#059669", class: "bg-primary-600" },
  { name: "Primary 700", value: "#047857", class: "bg-primary-700" },
  { name: "Accent 500", value: "#f59e0b", class: "bg-accent-500" },
  { name: "Neon", value: "#34d399", class: "bg-neon" },
  { name: "Dark 900", value: "#0f172a", class: "bg-dark-900" },
  { name: "Dark 950", value: "#020617", class: "bg-dark-950" },
  { name: "Success", value: "#22c55e", class: "bg-success" },
  { name: "Warning", value: "#f59e0b", class: "bg-warning" },
  { name: "Danger", value: "#ef4444", class: "bg-danger" },
  { name: "Info", value: "#3b82f6", class: "bg-info" },
];

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const item = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0 },
};

export default function StyleGuidePage() {
  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
      {/* Header */}
      <motion.div variants={item}>
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-600 dark:text-primary-400 mb-1">
          DESIGN SYSTEM
        </p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-dark-900 dark:text-white">
          Style Guide
        </h1>
        <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
          Panduan visual dan komponen untuk FTMS &ldquo;Sangar Sport&rdquo; theme
        </p>
      </motion.div>

      {/* Colors */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold text-dark-900 dark:text-white">Warna</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {colors.map((c) => (
            <div
              key={c.name}
              className={`${c.class} h-24 rounded-2xl p-3 flex flex-col justify-end shadow-lg`}
            >
              <p className="text-white text-xs font-bold drop-shadow">{c.name}</p>
              <p className="text-white/70 text-[10px] font-mono">{c.value}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Gradient Text */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold text-dark-900 dark:text-white">Tipografi & Efek</h2>
        </div>
        <div className="rounded-2xl bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50 p-6 space-y-4">
          <p className="text-3xl font-extrabold gradient-text">Gradient Text Effect</p>
          <p className="text-2xl font-extrabold text-dark-900 dark:text-white">Heading Extra Bold</p>
          <p className="text-lg font-bold text-dark-700 dark:text-dark-300">Heading Bold</p>
          <p className="text-base text-dark-600 dark:text-dark-400">Body text regular</p>
          <p className="text-sm text-dark-500 dark:text-dark-500">Small text muted</p>
          <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-primary-600 dark:text-primary-400">EYEBROW LABEL</p>
          <p className="text-3xl font-extrabold tabular-nums text-dark-900 dark:text-white">1,234.56 (tabular-nums)</p>
        </div>
      </motion.section>

      {/* Badges */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Square className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold text-dark-900 dark:text-white">Badge</h2>
        </div>
        <div className="rounded-2xl bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50 p-6 space-y-4">
          <div>
            <p className="text-xs font-bold text-dark-500 mb-2 uppercase">Posisi</p>
            <div className="flex flex-wrap gap-2">
              <PositionBadge position="goalkeeper" />
              <PositionBadge position="anchor" />
              <PositionBadge position="flank" />
              <PositionBadge position="pivot" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-dark-500 mb-2 uppercase">Status Absensi</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="present" />
              <StatusBadge status="late" />
              <StatusBadge status="absent" />
              <StatusBadge status="excused" />
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-dark-500 mb-2 uppercase">Status Lainnya</p>
            <div className="flex flex-wrap gap-2">
              <StatusBadge status="active" />
              <StatusBadge status="inactive" />
              <StatusBadge status="scheduled" />
              <StatusBadge status="completed" />
              <StatusBadge status="cancelled" />
            </div>
          </div>
        </div>
      </motion.section>

      {/* Avatars */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold text-dark-900 dark:text-white">Avatar</h2>
        </div>
        <div className="rounded-2xl bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50 p-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="text-center space-y-2">
              <PlayerAvatar name="Andi Pratama" size="sm" />
              <p className="text-xs text-dark-500">SM</p>
            </div>
            <div className="text-center space-y-2">
              <PlayerAvatar name="Budi Santoso" size="md" />
              <p className="text-xs text-dark-500">MD</p>
            </div>
            <div className="text-center space-y-2">
              <PlayerAvatar name="Candra Wijaya" size="lg" />
              <p className="text-xs text-dark-500">LG</p>
            </div>
            <div className="text-center space-y-2">
              <PlayerAvatar name="Dani Saputra" size="xl" />
              <p className="text-xs text-dark-500">XL</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Stat Cards */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold text-dark-900 dark:text-white">Stat Cards</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Pemain Aktif" value="18" detail="+2 bulan ini" icon={<Users className="w-5 h-5" />} trend="up" color="emerald" />
          <StatCard label="Kehadiran" value="85%" detail="Rata-rata" icon={<Calendar className="w-5 h-5" />} trend="up" color="blue" />
          <StatCard label="Tertunda" value="4" icon={<AlertCircle className="w-5 h-5" />} color="amber" />
          <StatCard label="Wajah" value="14" icon={<ScanFace className="w-5 h-5" />} color="purple" />
        </div>
      </motion.section>

      {/* Buttons */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold text-dark-900 dark:text-white">Buttons</h2>
        </div>
        <div className="rounded-2xl bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50 p-6 space-y-4">
          <div className="flex flex-wrap gap-3">
            <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/25 hover:shadow-xl active:scale-95 transition-all">
              Primary
            </button>
            <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 text-white font-bold text-sm shadow-lg shadow-accent-500/25 active:scale-95 transition-all">
              Accent
            </button>
            <button className="px-5 py-3 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 font-bold text-sm hover:bg-dark-200 dark:hover:bg-dark-700 active:scale-95 transition-all">
              Secondary
            </button>
            <button className="px-5 py-3 rounded-xl border border-dark-200 dark:border-dark-700 text-dark-700 dark:text-dark-300 font-bold text-sm hover:bg-dark-50 dark:hover:bg-dark-800 active:scale-95 transition-all">
              Outline
            </button>
            <button className="px-5 py-3 rounded-xl bg-danger text-white font-bold text-sm shadow-lg shadow-danger/25 active:scale-95 transition-all">
              Danger
            </button>
          </div>
          <div className="flex flex-wrap gap-3">
            <button className="px-5 py-3 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-bold text-sm shadow-lg shadow-primary-500/25 flex items-center gap-2">
              <Zap className="w-4 h-4" /> Dengan Ikon
            </button>
            <button className="w-12 h-12 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-500 flex items-center justify-center hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors">
              <Zap className="w-5 h-5" />
            </button>
          </div>
        </div>
      </motion.section>

      {/* States */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold text-dark-900 dark:text-white">States</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50 overflow-hidden">
            <p className="text-xs font-bold text-dark-500 uppercase tracking-wider px-4 pt-4 mb-2">Loading</p>
            <SkeletonCard />
          </div>
          <div className="rounded-2xl bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50 overflow-hidden">
            <p className="text-xs font-bold text-dark-500 uppercase tracking-wider px-4 pt-4">Empty</p>
            <EmptyState title="Belum ada data" description="Data akan muncul di sini setelah ditambahkan." />
          </div>
          <div className="rounded-2xl bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50 overflow-hidden">
            <p className="text-xs font-bold text-dark-500 uppercase tracking-wider px-4 pt-4">Error</p>
            <ErrorState title="Gagal memuat" description="Koneksi bermasalah." onRetry={() => alert("Retry!")} />
          </div>
        </div>
      </motion.section>

      {/* Glass Effect */}
      <motion.section variants={item}>
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-primary-500" />
          <h2 className="text-lg font-bold text-dark-900 dark:text-white">Glass Effect</h2>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-primary-600 to-cyan-600 p-8 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
          <div className="relative glass rounded-2xl p-6">
            <h3 className="text-lg font-bold text-dark-900 dark:text-white mb-1">Glassmorphism Card</h3>
            <p className="text-sm text-dark-600 dark:text-dark-300">
              Efek kaca dengan backdrop-blur untuk tampilan modern dan elegan.
            </p>
          </div>
        </div>
      </motion.section>
    </motion.div>
  );
}
