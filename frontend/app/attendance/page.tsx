"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  ScanFace,
  UserCheck,
  Search,
  MapPin,
  Sparkles,
  Loader2,
  Calendar,
  Users
} from 'lucide-react';
import clsx from 'clsx';

// Services & API
import { 
  getTrainingSessions, 
  getAttendance, 
  getActiveSession,
  getPlayers,
} from '@/lib/api';
import type { PlayerData, AttendanceRecord } from '@/lib/dataStore';
import { PlayerAvatar } from '@/components/ui/States';

// --- Types ---
type AttendanceStatus = 'hadir' | 'terlambat' | 'absen' | 'izin';
type VerificationMethod = 'face_recognition' | 'manual';

interface PlayerAttendanceRow {
  id: string;
  name: string;
  jerseyNumber: string | number;
  classGrade: string;
  avatarUrl?: string;
  checkInTime?: string;
  status: AttendanceStatus;
  method?: VerificationMethod;
}

interface DisplaySession {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime?: string;
  location: string;
  status: string;
  isToday: boolean;
  isActive: boolean;
  type: string;
}

const getStatusDetails = (status: AttendanceStatus) => {
  switch (status) {
    case 'hadir': return { label: 'Hadir', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20', icon: CheckCircle2 };
    case 'terlambat': return { label: 'Terlambat', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20', icon: Clock };
    case 'absen': return { label: 'Absen', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20', icon: XCircle };
    case 'izin': return { label: 'Izin', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20', icon: AlertCircle };
  }
};

export default function AttendanceHistoryPage() {
  const [sessions, setSessions] = useState<DisplaySession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [players, setPlayers] = useState<PlayerData[]>([]);
  const [activeClassFilter, setActiveClassFilter] = useState<'semua' | '10' | '11' | '12'>('semua');
  const [activeFilter, setActiveFilter] = useState<'semua' | AttendanceStatus>('semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [sessionAttendanceMap, setSessionAttendanceMap] = useState<Record<string, AttendanceRecord[]>>({});

  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, []);

  // Fetch all sessions & team players
  const loadData = useCallback(async () => {
    const playersResponse = await getPlayers();
    setPlayers(playersResponse.data.map(player => ({
      id: String(player.id),
      name: player.full_name,
      jersey: String(player.jersey_number),
      classGrade: player.class_grade || '10',
      position: ({ goalkeeper: 'Kiper', anchor: 'Anchor', flank: 'Flank', pivot: 'Pivot' } as const)[player.primary_position],
      secondaryPosition: player.secondary_position ? ({ goalkeeper: 'Kiper', anchor: 'Anchor', flank: 'Flank', pivot: 'Pivot' } as const)[player.secondary_position] : undefined,
      primaryKick: ({ right: 'Kanan', left: 'Kiri', both: 'Kedua Kaki' } as const)[player.primary_kick as 'right' | 'left' | 'both'] || 'Kanan',
      status: player.status === 'active' ? 'Aktif' : 'Nonaktif',
      faceRegistered: player.face_registered,
      avatarUrl: player.profile_photo || '',
      joinDate: player.joined_at,
      notes: player.notes || undefined,
    })));

    let allSessionsList: DisplaySession[] = [];

    // 1. Try Laravel API for sessions
    try {
      const apiSessionsRes = await getTrainingSessions();
      if (apiSessionsRes && Array.isArray(apiSessionsRes.data)) {
        allSessionsList = apiSessionsRes.data.map(s => {
          const sDate = s.training_date ? s.training_date.split('T')[0] : '';
          return {
            id: String(s.id),
            title: s.title || 'Latihan Futsal',
            date: sDate,
            time: s.start_time,
            endTime: s.end_time,
            location: s.location,
            status: s.status,
            isToday: sDate === todayStr,
            isActive: s.status === 'active',
            type: 'Latihan Rutin',
          };
        });
      }
    } catch (err) {
      console.warn('API getTrainingSessions unavailable, using local store:', err);
    }

    // Sort: newest date & time first
    allSessionsList.sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.time.localeCompare(a.time);
    });

    setSessions(allSessionsList);

    // Auto-select session: Prioritize today's session, then first session
    if (allSessionsList.length > 0) {
      const todaySession = allSessionsList.find(s => s.isToday);
      const defaultId = todaySession ? todaySession.id : allSessionsList[0].id;
      setSelectedSessionId(prev => prev || defaultId);
    }

    setLoading(false);
  }, [todayStr]);

  // Load attendance for the currently selected session
  const loadAttendanceForSession = useCallback(async (sessionId: string) => {
    if (!sessionId) return;

    const localRecords: AttendanceRecord[] = [];
    
    // Also try to fetch from API
    try {
      const numId = parseInt(sessionId, 10);
      if (!isNaN(numId)) {
        const apiRecords = await getAttendance(numId);
        if (Array.isArray(apiRecords)) {
          // Merge unique by player_id
          const map = new Map<string, AttendanceRecord>();
          localRecords.forEach(r => map.set(String(r.playerId), r));
          apiRecords.forEach(ar => {
            const pId = String(ar.player_id);
            if (!map.has(pId)) {
              map.set(pId, {
                id: String(ar.id),
                sessionId: String(ar.training_session_id),
                playerId: pId,
                name: ar.player?.full_name || ar.player_name || 'Pemain',
                jersey: String(ar.player?.jersey_number || ar.jersey_number || '0'),
                time: ar.check_in_at ? new Date(ar.check_in_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB' : '',
                method: ar.verification_method === 'face_recognition' ? 'face_recognition' : 'manual',
                status: (ar.status === 'late' ? 'late' : 'present'),
                confidence: ar.confidence,
              });
            }
          });
          const merged = Array.from(map.values());
          setSessionAttendanceMap(prev => ({ ...prev, [sessionId]: merged }));
          return;
        }
      }
    } catch (e) {
      // Local fallback is already ready
    }

    setSessionAttendanceMap(prev => ({ ...prev, [sessionId]: [] }));
  }, []);

  // Initial mount & window focus refetch
  useEffect(() => {
    loadData();

    const handleFocus = () => {
      loadData();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadData]);

  // When selected session changes, fetch its attendance
  useEffect(() => {
    if (selectedSessionId) {
      loadAttendanceForSession(selectedSessionId);
    }
  }, [selectedSessionId, loadAttendanceForSession]);

  const selectedSession = sessions.find(s => s.id === selectedSessionId) || sessions[0];
  const currentAttendances = selectedSession ? (sessionAttendanceMap[selectedSession.id] || []) : [];

  // Build the complete player list for the selected session
  const playerRows: PlayerAttendanceRow[] = useMemo(() => {
    if (!selectedSession) return [];

    const attendanceByPlayerId = new Map<string, AttendanceRecord>();
    currentAttendances.forEach(att => {
      attendanceByPlayerId.set(String(att.playerId), att);
    });

    return players.map(p => {
      const pId = String(p.id);
      const att = attendanceByPlayerId.get(pId);

      if (att) {
        // Late calculation: If status in record is 'late', or checked in > 15 mins after session start
        let isLate = att.status === 'late';
        if (!isLate && att.time && selectedSession.time) {
          const [sH, sM] = selectedSession.time.split(':').map(Number);
          const timeParts = att.time.replace(/[^0-9:]/g, '').split(':').map(Number);
          if (timeParts.length >= 2) {
            const checkInMinutes = timeParts[0] * 60 + timeParts[1];
            const startMinutes = sH * 60 + sM;
            if (checkInMinutes - startMinutes > 15) {
              isLate = true;
            }
          }
        }

        return {
          id: pId,
          name: p.name,
          jerseyNumber: p.jersey,
          classGrade: p.classGrade || '10',
          avatarUrl: p.avatarUrl,
          checkInTime: att.time,
          status: isLate ? 'terlambat' : 'hadir',
          method: att.method,
        };
      } else {
        return {
          id: pId,
          name: p.name,
          jerseyNumber: p.jersey,
          classGrade: p.classGrade || '10',
          avatarUrl: p.avatarUrl,
          checkInTime: undefined,
          status: 'absen',
          method: undefined,
        };
      }
    });
  }, [selectedSession, currentAttendances, players]);

  // Class filtered rows (used for class-specific statistics & display)
  const classPlayerRows = useMemo(() => {
    if (activeClassFilter === 'semua') return playerRows;
    return playerRows.filter(p => p.classGrade === activeClassFilter);
  }, [playerRows, activeClassFilter]);

  // Filtered rows for list display
  const filteredPlayers = useMemo(() => {
    return classPlayerRows.filter(player => {
      const matchesFilter = activeFilter === 'semua' || player.status === activeFilter;
      const matchesSearch = 
        player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(player.jerseyNumber).includes(searchQuery);
      return matchesFilter && matchesSearch;
    });
  }, [classPlayerRows, activeFilter, searchQuery]);

  // Dynamic Statistics computed for the selected class
  const stats = useMemo(() => {
    const totalPresent = classPlayerRows.filter(p => p.status === 'hadir').length;
    const totalLate = classPlayerRows.filter(p => p.status === 'terlambat').length;
    const totalAbsent = classPlayerRows.filter(p => p.status === 'absen').length;
    const attendedCount = totalPresent + totalLate;
    const totalPlayersCount = classPlayerRows.length;
    const attendanceRate = totalPlayersCount > 0 ? Math.round((attendedCount / totalPlayersCount) * 100) : 0;

    return {
      totalSessions: sessions.length,
      totalStudents: totalPlayersCount,
      attendanceRate,
      totalPresent,
      totalLate,
      totalAbsent,
    };
  }, [sessions, classPlayerRows]);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-50 dark:bg-dark-950 flex flex-col items-center justify-center text-dark-500">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500 mb-3" />
        <p className="text-sm">Memuat data riwayat kehadiran...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-50 dark:bg-dark-950 p-4 md:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-dark-900 dark:text-white uppercase italic">
            Riwayat <span className="gradient-text">Kehadiran</span>
          </h1>
          <p className="text-xs sm:text-sm text-dark-500 dark:text-dark-400 mt-1">
            Data kehadiran pemain terintegrasi real-time per sesi latihan & pertandingan.
          </p>
        </div>

        {selectedSession && (
          <Link
            href={`/kiosk/attendance?session=${selectedSession.id}`}
            className="px-4 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-primary-500/20 active:scale-95 transition-all flex items-center gap-2"
          >
            <ScanFace className="w-4 h-4" />
            <span>Buka Kiosk Absensi</span>
          </Link>
        )}
      </div>

      {/* Stats Scrollable Bar (Real Data) */}
      <div className="flex overflow-x-auto pb-2 gap-4 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        <StatCard title="Total Sesi" value={stats.totalSessions} unit="Sesi" icon={CalendarDays} />
        <StatCard title={activeClassFilter === 'semua' ? 'Total Siswa' : `Siswa Kelas ${activeClassFilter}`} value={stats.totalStudents} unit="Orang" icon={Users} />
        <StatCard title="Tingkat Kehadiran" value={stats.attendanceRate} unit="%" icon={CheckCircle2} />
        <StatCard title="Hadir Tepat Waktu" value={stats.totalPresent} icon={UserCheck} />
        <StatCard title="Terlambat" value={stats.totalLate} icon={Clock} />
        <StatCard title="Belum / Tidak Hadir" value={stats.totalAbsent} icon={XCircle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Session Selector (Left Panel) */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-dark-800 dark:text-dark-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary-500" />
              <span>Pilih Sesi</span>
            </h2>
            <span className="text-xs text-dark-400 font-mono">({sessions.length})</span>
          </div>

          <div className="flex flex-col gap-2.5 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="p-6 text-center text-xs text-dark-400 glass rounded-xl border border-dark-200 dark:border-dark-800">
                Belum ada sesi latihan. Buat sesi di menu Jadwal Latihan.
              </div>
            ) : (
              sessions.map(session => {
                const isSelected = selectedSessionId === session.id;
                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={clsx(
                      "text-left p-3.5 rounded-2xl border transition-all relative overflow-hidden",
                      isSelected 
                        ? "bg-primary-500/10 border-primary-500/60 dark:bg-primary-500/20 shadow-md shadow-primary-500/10 ring-1 ring-primary-500/40" 
                        : "glass hover:bg-dark-100 dark:hover:bg-dark-800/60 border-dark-200 dark:border-dark-800"
                    )}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-bold text-sm text-dark-900 dark:text-white truncate">
                        {session.title}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {session.isToday && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-500 text-white">
                            Hari Ini
                          </span>
                        )}
                        {session.isActive && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-500 text-white animate-pulse">
                            Berlangsung
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-dark-500 dark:text-dark-400 mt-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary-500" />
                      <span>{session.date}</span>
                      <span>•</span>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{session.time} {session.endTime ? `- ${session.endTime}` : ''} WIB</span>
                    </div>

                    <div className="text-xs text-dark-600 dark:text-dark-300 mt-1 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-dark-400 shrink-0" />
                      <span className="truncate">{session.location}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Attendance List (Right Panel) */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Class Filter Tabs */}
          <div className="glass p-2 rounded-2xl flex items-center justify-between gap-2 border border-dark-200 dark:border-dark-800 bg-white/50 dark:bg-dark-900/50">
            <div className="flex items-center gap-1.5 overflow-x-auto w-full scrollbar-hide py-0.5">
              <span className="text-xs font-bold uppercase tracking-wider text-dark-400 dark:text-dark-500 px-2 shrink-0">Kelas:</span>
              <button
                onClick={() => setActiveClassFilter('semua')}
                className={clsx(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
                  activeClassFilter === 'semua'
                    ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
                    : "text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800"
                )}
              >
                Semua Kelas ({playerRows.length})
              </button>
              {(['10', '11', '12'] as const).map(cls => {
                const countInClass = playerRows.filter(p => p.classGrade === cls).length;
                return (
                  <button
                    key={cls}
                    onClick={() => setActiveClassFilter(cls)}
                    className={clsx(
                      "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5",
                      activeClassFilter === cls
                        ? "bg-primary-500 text-white shadow-md shadow-primary-500/20"
                        : "text-dark-600 dark:text-dark-300 hover:bg-dark-100 dark:hover:bg-dark-800"
                    )}
                  >
                    <span>Kelas {cls}</span>
                    <span className={clsx(
                      "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                      activeClassFilter === cls
                        ? "bg-white/20 text-white"
                        : "bg-dark-200 dark:bg-dark-700 text-dark-500 dark:text-dark-300"
                    )}>
                      {countInClass}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Controls Bar */}
          <div className="glass p-3.5 rounded-2xl flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border border-dark-200 dark:border-dark-800">
            <div className="flex flex-wrap gap-2">
              <FilterChip label="Semua" active={activeFilter === 'semua'} onClick={() => setActiveFilter('semua')} />
              <FilterChip label="Hadir" active={activeFilter === 'hadir'} onClick={() => setActiveFilter('hadir')} color="emerald" />
              <FilterChip label="Terlambat" active={activeFilter === 'terlambat'} onClick={() => setActiveFilter('terlambat')} color="amber" />
              <FilterChip label="Absen" active={activeFilter === 'absen'} onClick={() => setActiveFilter('absen')} color="rose" />
            </div>

            <div className="relative w-full sm:w-auto">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-dark-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nama atau no. punggung..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-white dark:bg-dark-900 border border-dark-200 dark:border-dark-700 rounded-xl text-xs focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all dark:text-white"
              />
            </div>
          </div>

          {/* Table Container */}
          <div className="glass rounded-2xl border border-dark-200 dark:border-dark-800 overflow-hidden shadow-sm">
            <div className="grid grid-cols-12 gap-3 p-3.5 border-b border-dark-200 dark:border-dark-800 bg-dark-100/60 dark:bg-dark-900/60 text-xs font-bold text-dark-500 dark:text-dark-400 uppercase tracking-wider">
              <div className="col-span-5 md:col-span-4">Nama Pemain</div>
              <div className="col-span-4 md:col-span-3">Waktu Masuk</div>
              <div className="col-span-3 md:col-span-3">Status</div>
              <div className="hidden md:block col-span-2 text-right">Metode</div>
            </div>

            <div className="divide-y divide-dark-200 dark:divide-dark-800">
              <AnimatePresence mode="popLayout">
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player, index) => (
                    <motion.div
                      key={player.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ delay: index * 0.02 }}
                      className="grid grid-cols-12 gap-3 p-3.5 items-center hover:bg-dark-50 dark:hover:bg-dark-800/50 transition-colors"
                    >
                      {/* Player Info */}
                      <div className="col-span-5 md:col-span-4 flex items-center gap-3 min-w-0">
                        <PlayerAvatar photo={player.avatarUrl} name={player.name} size="sm" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-dark-900 dark:text-white truncate text-sm">
                              {player.name}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20 shrink-0">
                              Kelas {player.classGrade}
                            </span>
                          </div>
                          <div className="text-[11px] text-dark-400 font-mono">
                            #{player.jerseyNumber}
                          </div>
                        </div>
                      </div>

                      {/* Check-in Time */}
                      <div className="col-span-4 md:col-span-3 flex items-center text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {player.checkInTime ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 opacity-70 shrink-0" />
                            <span>{player.checkInTime}</span>
                          </div>
                        ) : (
                          <span className="text-dark-400 dark:text-dark-600 font-sans font-normal">- Belum Hadir -</span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className="col-span-3 md:col-span-3 flex items-center">
                        <StatusBadge status={player.status} />
                      </div>

                      {/* Method */}
                      <div className="hidden md:flex col-span-2 justify-end items-center">
                        {player.method === 'face_recognition' ? (
                          <div className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 text-xs font-bold" title="Face Recognition">
                            <ScanFace className="w-4 h-4" />
                            <span>Kamera</span>
                          </div>
                        ) : player.method === 'manual' ? (
                          <div className="text-amber-500 flex items-center gap-1 text-xs font-bold" title="Manual">
                            <UserCheck className="w-4 h-4" />
                            <span>Manual</span>
                          </div>
                        ) : (
                          <span className="text-dark-400 dark:text-dark-600 text-xs">-</span>
                        )}
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <motion.div 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }} 
                    className="p-12 text-center flex flex-col items-center justify-center"
                  >
                    <div className="w-14 h-14 bg-dark-100 dark:bg-dark-800 rounded-full flex items-center justify-center mb-3">
                      <Search className="w-6 h-6 text-dark-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-dark-900 dark:text-white">Tidak ada data</h3>
                    <p className="text-xs text-dark-500 mt-1">Coba sesuaikan filter atau kata kunci pencarian Anda.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function StatCard({ title, value, unit, icon: Icon }: { title: string, value: number, unit?: string, icon: any }) {
  return (
    <div className="glass flex-shrink-0 w-40 md:w-auto md:flex-1 p-4 rounded-2xl border border-dark-200 dark:border-dark-800">
      <div className="flex items-center gap-2 text-dark-500 dark:text-dark-400 mb-2">
        <Icon className="w-4 h-4" />
        <span className="text-xs font-medium uppercase tracking-wider">{title}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold text-dark-900 dark:text-white font-mono">{value}</span>
        {unit && <span className="text-sm font-medium text-dark-500">{unit}</span>}
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick, color = 'primary' }: { label: string, active: boolean, onClick: () => void, color?: 'primary' | 'emerald' | 'amber' | 'rose' }) {
  const baseClasses = "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border";
  
  let colorClasses = "";
  if (active) {
    if (color === 'primary') colorClasses = "bg-primary-500 text-white border-primary-500 shadow-sm";
    if (color === 'emerald') colorClasses = "bg-emerald-500 text-white border-emerald-500 shadow-sm";
    if (color === 'amber') colorClasses = "bg-amber-500 text-white border-amber-500 shadow-sm";
    if (color === 'rose') colorClasses = "bg-rose-500 text-white border-rose-500 shadow-sm";
  } else {
    colorClasses = "bg-transparent text-dark-600 dark:text-dark-300 border-dark-200 dark:border-dark-700 hover:bg-dark-100 dark:hover:bg-dark-800";
  }

  return (
    <button onClick={onClick} className={clsx(baseClasses, colorClasses)}>
      {label}
    </button>
  );
}

function StatusBadge({ status }: { status: AttendanceStatus }) {
  const { label, color, icon: Icon } = getStatusDetails(status);
  
  return (
    <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border", color)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
