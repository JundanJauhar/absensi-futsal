"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Search, 
  Users, 
  CalendarDays, 
  CheckCircle2, 
  Award, 
  ArrowUpRight, 
  TrendingUp, 
  Clock, 
  XCircle, 
  AlertCircle,
  Filter,
  RefreshCw,
  GraduationCap,
  Sparkles,
  ChevronRight
} from "lucide-react";
import clsx from "clsx";
import { getSummaryReport, downloadReportCsv, type PlayerReportItem, type ReportSummaryResponse, getPlayers, getTrainingSessions, getAttendance } from "@/lib/api";
import { PlayerAvatar, PositionBadge } from "@/components/ui/States";

const CLASSES = [
  { id: "all", label: "Semua Kelas" },
  { id: "10", label: "Kelas 10" },
  { id: "11", label: "Kelas 11" },
  { id: "12", label: "Kelas 12" },
] as const;

export default function SummaryReportPage() {
  const [selectedClass, setSelectedClass] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [reportData, setReportData] = useState<ReportSummaryResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await getSummaryReport({
        class_grade: selectedClass !== "all" ? selectedClass : undefined,
      });
      setReportData(data);
    } catch (err) {
      console.warn("Failed to fetch report from server API, falling back to local aggregations:", err);
      // Client-side fallback aggregation using getPlayers & getTrainingSessions
      try {
        const [playersRes, sessionsRes] = await Promise.all([
          getPlayers(),
          getTrainingSessions().catch(() => ({ data: [] })),
        ]);

        const sessions = Array.isArray(sessionsRes.data) ? sessionsRes.data : [];
        const totalSessions = sessions.length;

        // Fetch attendances for sessions if available
        let allAttendances: any[] = [];
        try {
          const attRes = await getAttendance();
          allAttendances = Array.isArray(attRes) ? attRes : [];
        } catch {
          allAttendances = [];
        }

        const filteredPlayers = selectedClass === "all" 
          ? playersRes.data 
          : playersRes.data.filter(p => (p.class_grade || "10") === selectedClass);

        const mappedPlayers: PlayerReportItem[] = filteredPlayers.map(p => {
          const pId = p.id;
          const pAtt = allAttendances.filter(a => Number(a.player_id) === pId);
          const present = pAtt.filter(a => a.status === 'present').length;
          const late = pAtt.filter(a => a.status === 'late').length;
          const attended = present + late;
          const absent = Math.max(0, totalSessions - attended);
          const rate = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

          return {
            id: p.id,
            full_name: p.full_name,
            jersey_number: p.jersey_number,
            class_grade: p.class_grade || "10",
            primary_position: p.primary_position,
            secondary_position: p.secondary_position,
            primary_kick: p.primary_kick || "right",
            status: p.status,
            profile_photo: p.profile_photo,
            attendance: {
              total_sessions: totalSessions,
              present,
              late,
              absent,
              rate,
            },
            evaluation: {
              evaluations_count: 0,
              average_score: null,
              grade_label: "Belum Dinilai",
              latest_date: null,
              latest_notes: null,
            },
          };
        });

        const totalStudents = mappedPlayers.length;
        const avgRate = totalStudents > 0 
          ? Math.round(mappedPlayers.reduce((acc, curr) => acc + curr.attendance.rate, 0) / totalStudents) 
          : 0;

        setReportData({
          summary: {
            total_students: totalStudents,
            total_sessions: totalSessions,
            overall_attendance_rate: avgRate,
            overall_evaluation_score: null,
            by_class: {
              "10": { label: "Kelas 10", students_count: playersRes.data.filter(p => (p.class_grade || "10") === "10").length, attendance_rate: avgRate, average_score: null },
              "11": { label: "Kelas 11", students_count: playersRes.data.filter(p => p.class_grade === "11").length, attendance_rate: avgRate, average_score: null },
              "12": { label: "Kelas 12", students_count: playersRes.data.filter(p => p.class_grade === "12").length, attendance_rate: avgRate, average_score: null },
            },
          },
          players: mappedPlayers,
        });
      } catch (fallbackErr) {
        setErrorMsg("Gagal memuat ringkasan laporan.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedClass]);

  // Handle Export CSV
  const handleDownloadCsv = async () => {
    setIsDownloading(true);
    try {
      await downloadReportCsv(selectedClass);
    } catch (err) {
      // Client-side CSV generation fallback
      if (reportData && reportData.players) {
        generateClientCsv(reportData.players, selectedClass);
      } else {
        alert("Gagal mengunduh laporan.");
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const generateClientCsv = (players: PlayerReportItem[], classFilter: string) => {
    const classLabel = classFilter !== "all" ? `Kelas_${classFilter}` : "Semua_Kelas";
    let csvContent = "\uFEFF"; // UTF-8 BOM
    csvContent += "LAPORAN RINGKASAN KEHADIRAN DAN PENILAIAN SISWA FUTSAL\n";
    csvContent += `Filter Kelas:,${classLabel}\n`;
    csvContent += `Tanggal Unduh:,${new Date().toLocaleDateString("id-ID")}\n\n`;
    csvContent += "No,Nama Lengkap,No Punggung,Kelas,Posisi,Total Sesi,Hadir,Terlambat,Absen,Kehadiran (%),Rata-rata Nilai,Predikat,Catatan\n";

    players.forEach((p, idx) => {
      csvContent += `${idx + 1},"${p.full_name}",${p.jersey_number},Kelas ${p.class_grade},${p.primary_position},${p.attendance.total_sessions},${p.attendance.present},${p.attendance.late},${p.attendance.absent},${p.attendance.rate}%,${p.evaluation.average_score ?? "-"},"${p.evaluation.grade_label}","${p.evaluation.latest_notes ?? "-"}"\n`;
    });

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `laporan_futsal_${classLabel}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Players for Table display
  const tablePlayers = useMemo(() => {
    if (!reportData?.players) return [];
    return reportData.players.filter(p => {
      const matchSearch = p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          String(p.jersey_number).includes(searchQuery);
      const matchPos = positionFilter === "all" || p.primary_position === positionFilter;
      return matchSearch && matchPos;
    });
  }, [reportData, searchQuery, positionFilter]);

  return (
    <div className="space-y-6 pb-12 print:p-0 print:space-y-4">
      
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-dark-200 dark:border-dark-800 pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
              Otomatis & Real-time
            </span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-dark-900 dark:text-white uppercase italic">
            Summary <span className="gradient-text">Report</span>
          </h1>
          <p className="text-sm text-dark-500 dark:text-dark-400 mt-1">
            Laporan lengkap absensi kehadiran dan evaluasi performa per kelas (10, 11, 12).
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchReport()}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800 transition-colors shadow-sm"
            title="Muat Ulang Data"
          >
            <RefreshCw className={clsx("w-4 h-4", isLoading && "animate-spin text-primary-500")} />
          </button>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-dark-200 dark:border-dark-800 bg-white dark:bg-dark-900 text-dark-700 dark:text-dark-200 hover:bg-dark-100 dark:hover:bg-dark-800 text-xs font-bold transition-all shadow-sm"
          >
            <Printer className="w-4 h-4 text-dark-500" />
            <span>Cetak / PDF</span>
          </button>

          <button
            onClick={handleDownloadCsv}
            disabled={isDownloading || isLoading}
            className="btn-glow flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-500/25 active:scale-95 transition-all disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>{isDownloading ? "Mengunduh..." : "Download Excel / CSV"}</span>
          </button>
        </div>
      </div>

      {/* Print-Only Title Header */}
      <div className="hidden print:block text-center border-b pb-4 mb-4">
        <h1 className="text-2xl font-black uppercase">LAPORAN KEHADIRAN & PENILAIAN SISWA EKSTRAKURIKULER FUTSAL</h1>
        <p className="text-sm text-gray-600 mt-1">
          {selectedClass !== "all" ? `Kelas ${selectedClass}` : "Semua Kelas (10, 11, 12)"} · Dicetak pada {new Date().toLocaleDateString("id-ID", { dateStyle: "long" })}
        </p>
      </div>

      {/* ── Class Switcher Tabs ── */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 glass p-2 rounded-2xl border border-dark-200 dark:border-dark-800 print:hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide py-0.5">
          <span className="text-xs font-bold uppercase tracking-wider text-dark-400 dark:text-dark-500 px-2 shrink-0 flex items-center gap-1">
            <GraduationCap className="w-4 h-4 text-primary-500" />
            <span>Filter Kelas:</span>
          </span>
          {CLASSES.map((c) => {
            const isCurrent = selectedClass === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClass(c.id)}
                className={clsx(
                  "px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2",
                  isCurrent
                    ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
                    : "text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800"
                )}
              >
                <span>{c.label}</span>
                {reportData?.summary.by_class[c.id] && (
                  <span className={clsx(
                    "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                    isCurrent ? "bg-white/20 text-white" : "bg-dark-200 dark:bg-dark-700 text-dark-500"
                  )}>
                    {reportData.summary.by_class[c.id].students_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-dark-400 dark:text-dark-500 px-2 text-right">
          Menampilkan <span className="font-bold text-dark-900 dark:text-white">{tablePlayers.length}</span> siswa
        </div>
      </div>

      {/* ── Class Breakdown Comparison Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
        {(["10", "11", "12"] as const).map((cls) => {
          const classInfo = reportData?.summary.by_class[cls];
          const isSelected = selectedClass === cls;
          return (
            <div
              key={cls}
              onClick={() => setSelectedClass(isSelected ? "all" : cls)}
              className={clsx(
                "p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden",
                isSelected
                  ? "bg-primary-500/10 border-primary-500 dark:bg-primary-500/15 ring-2 ring-primary-500/30 shadow-lg shadow-primary-500/10"
                  : "glass hover:bg-dark-100 dark:hover:bg-dark-800/60 border-dark-200 dark:border-dark-800"
              )}
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-950/60 px-2 py-0.5 rounded-lg border border-primary-500/20">
                    Tingkat Kelas
                  </span>
                  <h3 className="text-lg font-black text-dark-900 dark:text-white mt-1">
                    Kelas {cls}
                  </h3>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-dark-900 dark:text-white font-mono">
                    {classInfo?.students_count || 0}
                  </span>
                  <p className="text-[10px] text-dark-400">Siswa</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-dark-100 dark:border-dark-800/80 text-xs">
                <div>
                  <span className="text-dark-400 text-[11px]">Kehadiran:</span>
                  <div className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span>{classInfo?.attendance_rate ?? 0}%</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-dark-400 text-[11px]">Rata-rata Nilai:</span>
                  <div className="font-bold text-primary-600 dark:text-primary-400 font-mono">
                    {classInfo?.average_score !== null && classInfo?.average_score !== undefined
                      ? classInfo.average_score
                      : "Belum Ada"}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Key Metrics Overview ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass p-4 rounded-2xl border border-dark-200 dark:border-dark-800">
          <div className="flex items-center gap-2 text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Users className="w-4 h-4 text-primary-500" />
            <span>Total Siswa</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-dark-900 dark:text-white font-mono">
            {reportData?.summary.total_students || 0}
          </div>
          <span className="text-[11px] text-dark-400">
            {selectedClass !== "all" ? `Terdaftar di Kelas ${selectedClass}` : "Semua kelas terdaftar"}
          </span>
        </div>

        <div className="glass p-4 rounded-2xl border border-dark-200 dark:border-dark-800">
          <div className="flex items-center gap-2 text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">
            <CalendarDays className="w-4 h-4 text-primary-500" />
            <span>Sesi Latihan</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-dark-900 dark:text-white font-mono">
            {reportData?.summary.total_sessions || 0}
          </div>
          <span className="text-[11px] text-dark-400">Total sesi terselenggara</span>
        </div>

        <div className="glass p-4 rounded-2xl border border-dark-200 dark:border-dark-800">
          <div className="flex items-center gap-2 text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Rata Kehadiran</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            {reportData?.summary.overall_attendance_rate || 0}%
          </div>
          <div className="w-full bg-dark-100 dark:bg-dark-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${reportData?.summary.overall_attendance_rate || 0}%` }}
            />
          </div>
        </div>

        <div className="glass p-4 rounded-2xl border border-dark-200 dark:border-dark-800">
          <div className="flex items-center gap-2 text-dark-400 text-xs font-bold uppercase tracking-wider mb-1">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Rata Penilaian</span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">
            {reportData?.summary.overall_evaluation_score !== null && reportData?.summary.overall_evaluation_score !== undefined
              ? reportData.summary.overall_evaluation_score
              : "-"}
          </div>
          <span className="text-[11px] text-dark-400">
            {reportData?.summary.overall_evaluation_score && reportData.summary.overall_evaluation_score >= 80 
              ? "Performa Sangat Baik" 
              : "Berdasarkan penilaian pelatih"}
          </span>
        </div>
      </div>

      {/* ── Table Filter and Search Toolbar ── */}
      <div className="glass p-3.5 rounded-2xl flex flex-col md:flex-row gap-3 justify-between items-start md:items-center border border-dark-200 dark:border-dark-800 print:hidden">
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-dark-400" />
          </div>
          <input
            type="text"
            placeholder="Cari siswa atau nomor punggung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-dark-950 border border-dark-200 dark:border-dark-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 outline-none transition-all dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <span className="text-xs text-dark-400 hidden sm:inline">Posisi:</span>
          <select
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-dark-950 border border-dark-200 dark:border-dark-700 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-primary-500 outline-none text-dark-800 dark:text-dark-200"
          >
            <option value="all">Semua Posisi</option>
            <option value="goalkeeper">Kiper</option>
            <option value="anchor">Anchor</option>
            <option value="flank">Flank</option>
            <option value="pivot">Pivot</option>
          </select>
        </div>
      </div>

      {/* ── Informative Summary Report Table ── */}
      <div className="glass rounded-2xl border border-dark-200 dark:border-dark-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-dark-200 dark:border-dark-800 bg-dark-100/70 dark:bg-dark-900/80 font-bold uppercase tracking-wider text-dark-500 dark:text-dark-400">
              <tr>
                <th className="py-3.5 px-4 w-12 text-center">No</th>
                <th className="py-3.5 px-4">Informasi Siswa</th>
                <th className="py-3.5 px-3">Kelas</th>
                <th className="py-3.5 px-3">Posisi</th>
                <th className="py-3.5 px-3 text-center">Kehadiran (H / T / A)</th>
                <th className="py-3.5 px-4 text-center">% Kehadiran</th>
                <th className="py-3.5 px-3 text-center">Rata Nilai</th>
                <th className="py-3.5 px-3 text-center">Predikat</th>
                <th className="py-3.5 px-4">Catatan Perkembangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-200 dark:divide-dark-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-dark-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary-500 mb-2" />
                    <p>Memuat rekap data siswa...</p>
                  </td>
                </tr>
              ) : tablePlayers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-dark-400">
                    <Users className="w-8 h-8 mx-auto text-dark-300 dark:text-dark-600 mb-2" />
                    <p className="font-semibold text-dark-800 dark:text-dark-200">Tidak ada data siswa ditemukan</p>
                    <p className="text-[11px] text-dark-400 mt-1">Coba sesuaikan filter kelas atau kata kunci pencarian.</p>
                  </td>
                </tr>
              ) : (
                tablePlayers.map((player, idx) => {
                  const posLabels: Record<string, string> = {
                    goalkeeper: "Kiper",
                    anchor: "Anchor",
                    flank: "Flank",
                    pivot: "Pivot",
                  };
                  return (
                    <tr 
                      key={player.id} 
                      className="hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors group"
                    >
                      {/* No */}
                      <td className="py-3.5 px-4 text-center font-mono text-dark-400">
                        {idx + 1}
                      </td>

                      {/* Student Info */}
                      <td className="py-3.5 px-4">
                        <Link href={`/players/${player.id}`} className="flex items-center gap-3 group-hover:text-primary-500 transition-colors">
                          <PlayerAvatar photo={player.profile_photo} name={player.full_name} size="sm" />
                          <div>
                            <div className="font-bold text-dark-900 dark:text-white flex items-center gap-1.5 text-sm">
                              <span>{player.full_name}</span>
                              <span className="font-mono text-xs text-dark-400">#{player.jersey_number}</span>
                            </div>
                            <span className="text-[11px] text-dark-400">
                              Kaki {player.primary_kick === 'left' ? 'Kiri' : player.primary_kick === 'both' ? 'Kedua Kaki' : 'Kanan'}
                            </span>
                          </div>
                        </Link>
                      </td>

                      {/* Class Grade Badge */}
                      <td className="py-3.5 px-3">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-lg text-xs font-bold border",
                          player.class_grade === "10" && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
                          player.class_grade === "11" && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
                          player.class_grade === "12" && "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
                          !["10", "11", "12"].includes(player.class_grade) && "bg-dark-100 dark:bg-dark-800 text-dark-600 dark:text-dark-300 border-dark-200 dark:border-dark-700"
                        )}>
                          Kelas {player.class_grade}
                        </span>
                      </td>

                      {/* Position */}
                      <td className="py-3.5 px-3">
                        <span className="font-medium text-dark-700 dark:text-dark-300">
                          {posLabels[player.primary_position] || player.primary_position}
                        </span>
                      </td>

                      {/* Attendance Breakdown (H / T / A) */}
                      <td className="py-3.5 px-3 text-center">
                        <div className="inline-flex items-center gap-1.5 font-mono text-xs">
                          <span className="text-emerald-600 dark:text-emerald-400 font-bold" title="Hadir Tepat Waktu">
                            {player.attendance.present}H
                          </span>
                          <span className="text-dark-300 dark:text-dark-600">/</span>
                          <span className="text-amber-500 font-bold" title="Terlambat">
                            {player.attendance.late}T
                          </span>
                          <span className="text-dark-300 dark:text-dark-600">/</span>
                          <span className="text-rose-500 font-bold" title="Absen / Tidak Hadir">
                            {player.attendance.absent}A
                          </span>
                        </div>
                      </td>

                      {/* Attendance Rate */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={clsx(
                            "font-bold font-mono text-xs",
                            player.attendance.rate >= 80 && "text-emerald-600 dark:text-emerald-400",
                            player.attendance.rate >= 60 && player.attendance.rate < 80 && "text-amber-500",
                            player.attendance.rate < 60 && "text-rose-500"
                          )}>
                            {player.attendance.rate}%
                          </span>
                          <div className="w-16 bg-dark-100 dark:bg-dark-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={clsx(
                                "h-full rounded-full",
                                player.attendance.rate >= 80 && "bg-emerald-500",
                                player.attendance.rate >= 60 && player.attendance.rate < 80 && "bg-amber-500",
                                player.attendance.rate < 60 && "bg-rose-500"
                              )} 
                              style={{ width: `${player.attendance.rate}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Average Score */}
                      <td className="py-3.5 px-3 text-center">
                        <span className="font-mono font-bold text-sm text-dark-900 dark:text-white">
                          {player.evaluation.average_score !== null ? player.evaluation.average_score : "-"}
                        </span>
                      </td>

                      {/* Grade Predicate Badge */}
                      <td className="py-3.5 px-3 text-center">
                        <span className={clsx(
                          "px-2 py-0.5 rounded-md text-[11px] font-bold",
                          player.evaluation.grade_label.includes("A") && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                          player.evaluation.grade_label.includes("B") && "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
                          player.evaluation.grade_label.includes("C") && "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
                          player.evaluation.grade_label.includes("D") && "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20",
                          player.evaluation.grade_label === "Belum Dinilai" && "bg-dark-100 dark:bg-dark-800 text-dark-400"
                        )}>
                          {player.evaluation.grade_label}
                        </span>
                      </td>

                      {/* Latest Notes */}
                      <td className="py-3.5 px-4 text-dark-600 dark:text-dark-300 max-w-xs truncate">
                        {player.evaluation.latest_notes || "-"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary Bar */}
        <div className="p-4 bg-dark-50/50 dark:bg-dark-900/50 border-t border-dark-200 dark:border-dark-800 flex flex-col sm:flex-row justify-between items-center text-xs text-dark-400 gap-2">
          <div>
            Keterangan: <span className="font-semibold text-emerald-600">H = Hadir</span>, <span className="font-semibold text-amber-500">T = Terlambat</span>, <span className="font-semibold text-rose-500">A = Absen / Belum Hadir</span>
          </div>
          <div className="font-mono">
            FTMS Automatic Report Generator
          </div>
        </div>
      </div>

    </div>
  );
}
