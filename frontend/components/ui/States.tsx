"use client";

import { motion } from "framer-motion";
import { AlertCircle, RefreshCw, Inbox, Loader2 } from "lucide-react";

/* ── Skeleton ── */
export function SkeletonCard() {
  return (
    <div className="rounded-2xl p-5 bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 rounded-xl skeleton" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 rounded-lg skeleton" />
          <div className="h-3 w-1/3 rounded-lg skeleton" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full rounded-lg skeleton" />
        <div className="h-3 w-4/5 rounded-lg skeleton" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-2xl p-4 bg-white dark:bg-dark-900 border border-dark-200/50 dark:border-dark-800/50">
          <div className="w-16 h-16 rounded-2xl skeleton mx-auto mb-3" />
          <div className="h-4 w-2/3 rounded-lg skeleton mx-auto mb-2" />
          <div className="h-3 w-1/2 rounded-lg skeleton mx-auto" />
        </div>
      ))}
    </div>
  );
}

/* ── Empty State ── */
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-dark-100 dark:bg-dark-800 flex items-center justify-center mb-4">
        {icon || <Inbox className="w-8 h-8 text-dark-400 dark:text-dark-500" />}
      </div>
      <h3 className="text-lg font-bold text-dark-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-sm text-dark-500 dark:text-dark-400 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-5 px-5 py-2.5 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 active:scale-95 transition-all shadow-lg shadow-primary-600/25"
        >
          {action.label}
        </button>
      )}
    </motion.div>
  );
}

/* ── Error State ── */
interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Terjadi Kesalahan",
  description = "Tidak dapat memuat data. Periksa koneksi internet Anda.",
  onRetry,
}: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-16 h-16 rounded-2xl bg-danger/10 dark:bg-danger/20 flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-danger" />
      </div>
      <h3 className="text-lg font-bold text-dark-900 dark:text-white mb-1.5">{title}</h3>
      <p className="text-sm text-dark-500 dark:text-dark-400 max-w-sm">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 px-5 py-2.5 rounded-xl bg-dark-100 dark:bg-dark-800 text-dark-700 dark:text-dark-300 text-sm font-bold hover:bg-dark-200 dark:hover:bg-dark-700 active:scale-95 transition-all flex items-center gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </button>
      )}
    </motion.div>
  );
}

/* ── Loading Spinner ── */
export function LoadingSpinner({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className={`${sizeClasses[size]} text-primary-500 animate-spin`} />
    </div>
  );
}

/* ── Stat Card ── */
interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  color?: "emerald" | "amber" | "purple" | "blue" | "rose";
}

const colorMap = {
  emerald: {
    bg: "bg-primary-50 dark:bg-primary-950/30",
    icon: "bg-primary-100 dark:bg-primary-900/50 text-primary-600 dark:text-primary-400",
    value: "text-primary-700 dark:text-primary-400",
  },
  amber: {
    bg: "bg-accent-50 dark:bg-accent-900/20",
    icon: "bg-accent-100 dark:bg-accent-900/40 text-accent-600 dark:text-accent-400",
    value: "text-accent-700 dark:text-accent-400",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    icon: "bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400",
    value: "text-purple-700 dark:text-purple-400",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    icon: "bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400",
    value: "text-blue-700 dark:text-blue-400",
  },
  rose: {
    bg: "bg-rose-50 dark:bg-rose-950/30",
    icon: "bg-rose-100 dark:bg-rose-900/50 text-rose-600 dark:text-rose-400",
    value: "text-rose-700 dark:text-rose-400",
  },
};

export function StatCard({ label, value, detail, icon, trend, color = "emerald" }: StatCardProps) {
  const colors = colorMap[color];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-2xl p-4 ${colors.bg} border border-dark-200/30 dark:border-dark-800/30`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${colors.icon} flex items-center justify-center`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-bold ${trend === "up" ? "text-success" : trend === "down" ? "text-danger" : "text-dark-400"}`}>
            {trend === "up" ? "↑" : trend === "down" ? "↓" : "→"}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold text-dark-500 dark:text-dark-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-extrabold tabular-nums ${colors.value}`}>{value}</p>
      {detail && <p className="text-xs text-dark-500 dark:text-dark-400 mt-1">{detail}</p>}
    </motion.div>
  );
}

/* ── Position Badge ── */
const positionColors: Record<string, string> = {
  goalkeeper: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  anchor: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
  flank: "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400",
  pivot: "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
};

const positionLabels: Record<string, string> = {
  goalkeeper: "Kiper",
  anchor: "Anchor",
  flank: "Flank",
  pivot: "Pivot",
};

export function PositionBadge({ position }: { position: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide ${positionColors[position] || "bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-400"}`}>
      {positionLabels[position] || position}
    </span>
  );
}

/* ── Status Badge ── */
const statusColors: Record<string, string> = {
  present: "bg-success/10 text-success border-success/20",
  late: "bg-accent-500/10 text-accent-600 dark:text-accent-400 border-accent-500/20",
  absent: "bg-danger/10 text-danger border-danger/20",
  excused: "bg-info/10 text-info border-info/20",
  active: "bg-success/10 text-success border-success/20",
  inactive: "bg-dark-200 dark:bg-dark-700 text-dark-500 dark:text-dark-400 border-dark-300 dark:border-dark-600",
  scheduled: "bg-primary-50 dark:bg-primary-950/30 text-primary-600 dark:text-primary-400 border-primary-200 dark:border-primary-800",
  completed: "bg-success/10 text-success border-success/20",
  cancelled: "bg-danger/10 text-danger border-danger/20",
};

const statusLabels: Record<string, string> = {
  present: "Hadir",
  late: "Terlambat",
  absent: "Absen",
  excused: "Izin",
  active: "Aktif",
  inactive: "Nonaktif",
  scheduled: "Terjadwal",
  completed: "Selesai",
  cancelled: "Dibatalkan",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${statusColors[status] || "bg-dark-100 text-dark-600"}`}>
      {statusLabels[status] || status}
    </span>
  );
}

/* ── Player Avatar ── */
interface PlayerAvatarProps {
  name: string;
  photo?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const avatarSizes = {
  sm: "w-8 h-8 text-xs rounded-lg",
  md: "w-12 h-12 text-sm rounded-xl",
  lg: "w-16 h-16 text-lg rounded-2xl",
  xl: "w-20 h-20 text-2xl rounded-2xl",
};

const avatarGradients = [
  "from-primary-400 to-emerald-500",
  "from-blue-400 to-cyan-500",
  "from-purple-400 to-pink-500",
  "from-amber-400 to-orange-500",
  "from-rose-400 to-red-500",
  "from-teal-400 to-cyan-500",
];

function getGradient(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarGradients[Math.abs(hash) % avatarGradients.length];
}

export function PlayerAvatar({ name, photo, size = "md", className = "" }: PlayerAvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const gradient = getGradient(name);

  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`${avatarSizes[size]} object-cover flex-shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${avatarSizes[size]} bg-gradient-to-br ${gradient} text-white font-extrabold flex items-center justify-center flex-shrink-0 shadow-lg ${className}`}
    >
      {initials}
    </div>
  );
}
