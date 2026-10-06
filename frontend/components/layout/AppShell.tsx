"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import {
  Home,
  Users,
  Calendar,
  ClipboardCheck,
  MoreHorizontal,
  ChartBar,
  Bell,
  Settings,
  Moon,
  Sun,
  X,
  Activity,
  Zap,
  BookOpen,
  FileSpreadsheet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const mainNav = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/players", label: "Pemain", icon: Users },
  { href: "/training", label: "Latihan", icon: Calendar },
  { href: "/attendance", label: "Absensi", icon: ClipboardCheck },
  { href: "#more", label: "Lainnya", icon: MoreHorizontal },
];

const moreMenu = [
  { href: "/reports", label: "Laporan", icon: FileSpreadsheet },
  { href: "/evaluations", label: "Evaluasi", icon: ChartBar },
  { href: "/meeting-notes", label: "Buku Latihan", icon: BookOpen },
  { href: "/notifications", label: "Notifikasi", icon: Bell },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

const sidebarNav = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/players", label: "Pemain", icon: Users },
  { href: "/training", label: "Latihan", icon: Calendar },
  { href: "/attendance", label: "Absensi", icon: ClipboardCheck },
  { href: "/reports", label: "Laporan", icon: FileSpreadsheet },
  { href: "/evaluations", label: "Evaluasi", icon: ChartBar },
  { href: "/meeting-notes", label: "Buku Latihan", icon: BookOpen },
  { href: "/notifications", label: "Notifikasi", icon: Bell },
  { href: "/settings", label: "Pengaturan", icon: Settings },
];

import { getToken } from "@/lib/api";
import { syncLocalFacesToServer } from "@/lib/faceStore";

function isFullscreenRoute(pathname: string) {
  return pathname.startsWith("/kiosk") || pathname.includes("/face-registration");
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [moreOpen, setMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
    const token = getToken();
    const authed = !!token;
    setIsAuthenticated(authed);

    if (!authed && pathname !== "/login") {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      window.location.replace(`/login?next=${next}`);
      return;
    }

    if (authed) {
      // In the background, upload any enrollments created on this laptop before server sync existed
      syncLocalFacesToServer().catch(() => {});
    }
  }, [pathname]);

  // Login page always renders freely
  if (pathname === "/login") {
    return <>{children}</>;
  }

  // Not authenticated or still checking: block the screen completely
  if (isAuthenticated !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950 text-white">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Fullscreen modes = no shell
  if (isFullscreenRoute(pathname)) {
    return <>{children}</>;
  }

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-dvh bg-dark-50 dark:bg-dark-950">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 border-r border-dark-200 dark:border-dark-800 bg-white/80 dark:bg-dark-900/80 backdrop-blur-xl">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 pt-7 pb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-lg font-extrabold tracking-tight text-dark-900 dark:text-white">FTMS</span>
            <p className="text-[11px] text-dark-400 dark:text-dark-500 font-medium -mt-0.5">Futsal Manager</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-1" aria-label="Navigasi utama">
          {sidebarNav.map((item) => {
            const active = isActive(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  active
                    ? "bg-primary-50 dark:bg-primary-950/50 text-primary-700 dark:text-primary-400 shadow-sm"
                    : "text-dark-500 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800/50 hover:text-dark-900 dark:hover:text-white"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={`w-5 h-5 ${active ? "text-primary-600 dark:text-primary-400" : ""}`} />
                {item.label}
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-500 animate-glow-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Theme Toggle & Footer */}
        <div className="px-4 pb-6 space-y-3">
          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-semibold text-dark-500 dark:text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800/50 transition-colors"
              aria-label="Ganti tema"
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
            </button>
          )}
          <div className="px-4 text-xs text-dark-400 dark:text-dark-600">
            FTMS v0.1.0 · Phase 1
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b border-dark-200/50 dark:border-dark-800/50 bg-white/80 dark:bg-dark-950/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight text-dark-900 dark:text-white">FTMS</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse mr-2" />
            <Link
              href="/notifications"
              className="w-10 h-10 rounded-xl flex items-center justify-center text-dark-400 dark:text-dark-500 hover:bg-dark-100 dark:hover:bg-dark-800/50 transition-colors relative"
              aria-label="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 md:px-8 py-5 md:py-8 pb-24 md:pb-8 max-w-6xl w-full mx-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ── Mobile Bottom Nav ── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-dark-950/90 backdrop-blur-2xl border-t border-dark-200/50 dark:border-dark-800/50 safe-bottom"
        aria-label="Navigasi mobile"
      >
        <div className="flex items-stretch h-16">
          {mainNav.map((item) => {
            const Icon = item.icon;
            if (item.href === "#more") {
              return (
                <button
                  key="more"
                  onClick={() => setMoreOpen(!moreOpen)}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-colors ${
                    moreOpen
                      ? "text-primary-600 dark:text-primary-400"
                      : "text-dark-400 dark:text-dark-500"
                  }`}
                  aria-expanded={moreOpen}
                  aria-label="Menu lainnya"
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.label}</span>
                </button>
              );
            }

            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-bold transition-all relative ${
                  active
                    ? "text-primary-600 dark:text-primary-400"
                    : "text-dark-400 dark:text-dark-500"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <div className={`relative ${active ? "scale-110" : ""} transition-transform`}>
                  <Icon className="w-5 h-5" />
                  {active && (
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary-500" />
                  )}
                </div>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── FAB: Mulai Absensi ── */}
      <Link
        href="/kiosk/attendance"
        className="md:hidden fixed bottom-20 right-4 z-50 w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 text-white flex items-center justify-center shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 active:scale-95 transition-all"
        aria-label="Mulai absensi kiosk"
      >
        <ClipboardCheck className="w-6 h-6" />
      </Link>

      {/* ── More Menu Sheet ── */}
      <AnimatePresence>
        {moreOpen && (
          <>
            <motion.div
              className="md:hidden fixed inset-0 bg-black/40 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-900 rounded-t-3xl p-5 pb-8 safe-bottom"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
            >
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-dark-300 dark:bg-dark-700 mx-auto mb-5" />

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-dark-900 dark:text-white">Lainnya</h3>
                <button
                  onClick={() => setMoreOpen(false)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-dark-400 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors"
                  aria-label="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {moreMenu.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreOpen(false)}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-dark-50 dark:bg-dark-800/50 hover:bg-primary-50 dark:hover:bg-primary-950/30 transition-colors group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white dark:bg-dark-700 flex items-center justify-center shadow-sm group-hover:bg-primary-100 dark:group-hover:bg-primary-900/50 transition-colors">
                        <Icon className="w-6 h-6 text-dark-500 dark:text-dark-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                      </div>
                      <span className="text-sm font-semibold text-dark-700 dark:text-dark-300">{item.label}</span>
                    </Link>
                  );
                })}
              </div>

              {/* Theme toggle mobile */}
              {mounted && (
                <button
                  onClick={() => {
                    setTheme(theme === "dark" ? "light" : "dark");
                    setMoreOpen(false);
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-dark-100 dark:bg-dark-800 text-sm font-semibold text-dark-600 dark:text-dark-400 hover:bg-dark-200 dark:hover:bg-dark-700 transition-colors"
                >
                  {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {theme === "dark" ? "Mode Terang" : "Mode Gelap"}
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
