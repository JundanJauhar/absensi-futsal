// Client-side data store with LocalStorage persistence for FTMS
export interface PlayerData {
  id: string;
  name: string;
  jersey: string;
  position: 'Kiper' | 'Anchor' | 'Flank' | 'Pivot';
  secondaryPosition?: string;
  status: 'Aktif' | 'Nonaktif';
  faceRegistered: boolean;
  avatarUrl: string;
  joinDate: string;
  notes?: string;
}

export interface TrainingSessionData {
  id: string;
  title: string;
  date: string; // ISO date string "2026-10-02"
  time: string; // "16:00"
  endTime?: string;
  location: string;
  type: 'Latihan Rutin' | 'Pertandingan' | 'Latihan Taktik';
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  attendanceOpenAt?: string;
  attendanceCloseAt?: string;
  attendanceCount?: number;
  totalPlayers?: number;
  rescheduledFrom?: {
    date: string;
    time: string;
    reason: string;
  };
}

export type AttendanceState = 'NO_ACTIVE_SESSION' | 'UPCOMING_SESSION' | 'ACTIVE_ATTENDANCE' | 'ATTENDANCE_CLOSED';

export interface AttendanceRecord {
  id: string;
  sessionId: string; // Bound to specific training session
  playerId: string;
  name: string;
  jersey: string;
  time: string;
  method: 'face_recognition' | 'manual';
  status: 'present' | 'late';
  confidence?: number;
}

const DEFAULT_PLAYERS: PlayerData[] = [
  { id: "1", name: "Budi Santoso", jersey: "10", position: "Flank", secondaryPosition: "Pivot", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-01-15", notes: "Pemain dengan kecepatan tinggi, spesialis kaki kiri." },
  { id: "2", name: "Andi Wijaya", jersey: "1", position: "Kiper", secondaryPosition: "Anchor", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-02-10", notes: "Refleks cepat, tangguh duel satu lawan satu." },
  { id: "3", name: "Reza Pratama", jersey: "5", position: "Anchor", secondaryPosition: "Flank", status: "Aktif", faceRegistered: false, avatarUrl: "", joinDate: "2023-03-01", notes: "Distribusi bola sangat baik, vokal dalam bertahan." },
  { id: "4", name: "Deni Saputra", jersey: "9", position: "Pivot", secondaryPosition: "Flank", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-03-15", notes: "Kuat menahan bola, akurasi shooting tajam." },
  { id: "5", name: "Kevin Sanjaya", jersey: "11", position: "Flank", secondaryPosition: "Pivot", status: "Nonaktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-04-01", notes: "Sedang pemulihan cedera pergelangan kaki." },
  { id: "6", name: "Taufik Hidayat", jersey: "7", position: "Flank", secondaryPosition: "Anchor", status: "Aktif", faceRegistered: false, avatarUrl: "", joinDate: "2023-04-15", notes: "Stamina prima dan daya jelajah tinggi." },
  { id: "7", name: "Marcus Fernaldi", jersey: "8", position: "Anchor", secondaryPosition: "Pivot", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-05-01", notes: "Gaya main lugas dan disiplin transisi bertahan." },
  { id: "8", name: "Hendra Setiawan", jersey: "4", position: "Anchor", secondaryPosition: "Anchor", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-05-15", notes: "Ketenangan tinggi, membaca arah serangan lawan." },
  { id: "9", name: "Mohammad Ahsan", jersey: "2", position: "Kiper", secondaryPosition: "Anchor", status: "Aktif", faceRegistered: false, avatarUrl: "", joinDate: "2023-06-01", notes: "Kiper kedua dengan jangkauan tangkapan lebar." },
  { id: "10", name: "Jonathan Christie", jersey: "14", position: "Flank", secondaryPosition: "Pivot", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-06-15", notes: "Agresif menusuk pertahanan dari sayap kanan." },
  { id: "11", name: "Anthony Ginting", jersey: "15", position: "Flank", secondaryPosition: "Pivot", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-07-01", notes: "Footwork lincah, pandai mencari celah tembak." },
  { id: "12", name: "Tommy Sugiarto", jersey: "16", position: "Pivot", secondaryPosition: "Flank", status: "Nonaktif", faceRegistered: false, avatarUrl: "", joinDate: "2023-07-15", notes: "Absen sementara urusan dinas luar kota." },
  { id: "13", name: "Ricky Subagja", jersey: "3", position: "Anchor", secondaryPosition: "Anchor", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-08-01", notes: "Intersep bola akurat dan tekel bersih." },
  { id: "14", name: "Rexy Mainaky", jersey: "6", position: "Anchor", secondaryPosition: "Flank", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-08-15", notes: "Kepemimpinan di lapangan solid." },
  { id: "15", name: "Simon Santoso", jersey: "12", position: "Flank", secondaryPosition: "Pivot", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-09-01", notes: "Dribble tipuan sayap kiri efektif." },
  { id: "16", name: "Sony Dwi Kuncoro", jersey: "17", position: "Flank", secondaryPosition: "Anchor", status: "Aktif", faceRegistered: false, avatarUrl: "", joinDate: "2023-09-15", notes: "Spesialis set piece tendangan bebas." },
  { id: "17", name: "Fajar Alfian", jersey: "18", position: "Pivot", secondaryPosition: "Flank", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-10-01", notes: "Target man dengan fisik kuat." },
  { id: "18", name: "Rian Ardianto", jersey: "19", position: "Kiper", secondaryPosition: "Kiper", status: "Aktif", faceRegistered: true, avatarUrl: "", joinDate: "2023-10-15", notes: "Distribusi lemparan akurat untuk counter attack." }
];

const DEFAULT_SESSIONS: TrainingSessionData[] = [
  {
    id: "s1",
    title: "Latihan Rutin Jumat",
    date: "2026-10-02",
    time: "16:00",
    endTime: "18:00",
    location: "Pondok Pesantren Sunan Pandanaran",
    type: "Latihan Rutin",
    status: "scheduled",
    attendanceCount: 0,
    totalPlayers: 18,
  },
  {
    id: "s2",
    title: "Simulasi Taktik Menyerang",
    date: "2026-10-09",
    time: "16:00",
    endTime: "18:00",
    location: "Lapangan Futsal Utama",
    type: "Latihan Taktik",
    status: "scheduled",
    attendanceCount: 0,
    totalPlayers: 18,
  },
  {
    id: "s3",
    title: "Friendly Match vs Tim Alumni",
    date: "2026-10-16",
    time: "15:30",
    endTime: "17:30",
    location: "GOR Futsal Sleman",
    type: "Pertandingan",
    status: "scheduled",
    attendanceCount: 0,
    totalPlayers: 18,
  },
  {
    id: "s4",
    title: "Latihan Rutin Pekan Lalu",
    date: "2026-09-25",
    time: "16:00",
    endTime: "18:00",
    location: "Pondok Pesantren Sunan Pandanaran",
    type: "Latihan Rutin",
    status: "completed",
    attendanceCount: 15,
    totalPlayers: 18,
  }
];

// Helper functions for Players
export function getStoredPlayers(): PlayerData[] {
  if (typeof window === 'undefined') return DEFAULT_PLAYERS;
  try {
    const raw = localStorage.getItem('ftms_players');
    if (!raw) {
      localStorage.setItem('ftms_players', JSON.stringify(DEFAULT_PLAYERS));
      return DEFAULT_PLAYERS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PLAYERS;
  }
}

export function saveStoredPlayers(players: PlayerData[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ftms_players', JSON.stringify(players));
    pushToServer();
  } catch (err) {
    console.error('Error saving players:', err);
  }
}

export function getPlayerById(id: string | number): PlayerData | undefined {
  const players = getStoredPlayers();
  return players.find(p => String(p.id) === String(id));
}

export function addStoredPlayer(newPlayer: Omit<PlayerData, 'id'>): PlayerData {
  const players = getStoredPlayers();
  const nextId = String(Date.now());
  const created: PlayerData = { ...newPlayer, id: nextId };
  const updated = [created, ...players];
  saveStoredPlayers(updated);
  return created;
}

export function updateStoredPlayer(id: string | number, updates: Partial<PlayerData>): PlayerData | undefined {
  const players = getStoredPlayers();
  const index = players.findIndex(p => String(p.id) === String(id));
  if (index === -1) return undefined;
  players[index] = { ...players[index], ...updates };
  saveStoredPlayers(players);
  return players[index];
}

export function deleteStoredPlayer(id: string | number) {
  const players = getStoredPlayers();
  const filtered = players.filter(p => String(p.id) !== String(id));
  saveStoredPlayers(filtered);
}

// Helper functions for Sessions
export function getStoredSessions(): TrainingSessionData[] {
  if (typeof window === 'undefined') return DEFAULT_SESSIONS;
  try {
    const raw = localStorage.getItem('ftms_sessions');
    if (!raw) {
      localStorage.setItem('ftms_sessions', JSON.stringify(DEFAULT_SESSIONS));
      return DEFAULT_SESSIONS;
    }
    return JSON.parse(raw);
  } catch {
    return DEFAULT_SESSIONS;
  }
}

export function saveStoredSessions(sessions: TrainingSessionData[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ftms_sessions', JSON.stringify(sessions));
    pushToServer();
  } catch (err) {
    console.error('Error saving sessions:', err);
  }
}

export function addStoredSession(session: Omit<TrainingSessionData, 'id'>): TrainingSessionData {
  const sessions = getStoredSessions();
  const nextId = "s_" + Date.now();
  const created: TrainingSessionData = { ...session, id: nextId };
  const updated = [created, ...sessions];
  saveStoredSessions(updated);
  return created;
}

export function rescheduleStoredSession(id: string, newDate: string, newTime: string, reason: string) {
  const sessions = getStoredSessions();
  const index = sessions.findIndex(s => s.id === id);
  if (index === -1) return;
  const current = sessions[index];
  sessions[index] = {
    ...current,
    rescheduledFrom: {
      date: current.date,
      time: current.time,
      reason: reason || "Perubahan ketersediaan fasilitas",
    },
    date: newDate,
    time: newTime,
  };
  saveStoredSessions(sessions);
}

// Helper functions for Session Attendance Lifecycle
export function openStoredSessionAttendance(sessionId: string): TrainingSessionData | undefined {
  const sessions = getStoredSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index === -1) return undefined;
  sessions[index] = {
    ...sessions[index],
    status: 'active',
    attendanceOpenAt: new Date().toISOString(),
    attendanceCloseAt: undefined,
  };
  saveStoredSessions(sessions);
  return sessions[index];
}

export function closeStoredSessionAttendance(sessionId: string): TrainingSessionData | undefined {
  const sessions = getStoredSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index === -1) return undefined;
  sessions[index] = {
    ...sessions[index],
    status: 'completed',
    attendanceCloseAt: new Date().toISOString(),
  };
  saveStoredSessions(sessions);
  return sessions[index];
}

export function reopenStoredSessionAttendance(sessionId: string): TrainingSessionData | undefined {
  const sessions = getStoredSessions();
  const index = sessions.findIndex(s => s.id === sessionId);
  if (index === -1) return undefined;
  // Reopening strictly preserves ALL existing attendance records
  sessions[index] = {
    ...sessions[index],
    status: 'active',
    attendanceCloseAt: undefined,
  };
  saveStoredSessions(sessions);
  return sessions[index];
}

// Compute session attendance state
export function getSessionAttendanceState(session: TrainingSessionData, now: Date = new Date()): AttendanceState {
  if (session.status === 'completed' || session.status === 'cancelled') {
    return 'ATTENDANCE_CLOSED';
  }
  if (session.status === 'active') {
    return 'ACTIVE_ATTENDANCE';
  }

  // Calculate window from date and time
  const [startHour, startMin] = (session.time || '16:00').split(':').map(Number);
  const sessionStart = new Date(session.date);
  sessionStart.setHours(startHour, startMin, 0, 0);

  let sessionEnd = new Date(session.date);
  if (session.endTime) {
    const [endHour, endMin] = session.endTime.split(':').map(Number);
    sessionEnd.setHours(endHour, endMin, 0, 0);
  } else {
    // Default 2 hours duration
    sessionEnd.setHours(startHour + 2, startMin, 0, 0);
  }

  // Attendance window: 30 minutes before start to 30 minutes after end
  const openWindow = new Date(sessionStart.getTime() - 30 * 60 * 1000);
  const closeWindow = new Date(sessionEnd.getTime() + 30 * 60 * 1000);

  if (now.getTime() < openWindow.getTime()) {
    return 'UPCOMING_SESSION';
  }
  if (now.getTime() >= openWindow.getTime() && now.getTime() <= closeWindow.getTime()) {
    return 'ACTIVE_ATTENDANCE';
  }
  return 'ATTENDANCE_CLOSED';
}

// Resolve active session from available stored sessions
export function resolveActiveStoredSession(targetSessionId?: string): {
  session: TrainingSessionData | null;
  state: AttendanceState;
} {
  const sessions = getStoredSessions();
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let target: TrainingSessionData | null = null;

  // 1. Explicit ID requested
  if (targetSessionId) {
    target = sessions.find(s => String(s.id) === String(targetSessionId)) || null;
  }

  // 2. Explicitly active session
  if (!target) {
    target = sessions.find(s => s.status === 'active') || null;
  }

  // 3. Today's session that is active or scheduled
  if (!target) {
    const todaySessions = sessions.filter(s => s.date === todayStr && s.status !== 'cancelled');
    // First look for active window today
    for (const s of todaySessions) {
      if (getSessionAttendanceState(s, now) === 'ACTIVE_ATTENDANCE') {
        target = s;
        break;
      }
    }
    // Next look for upcoming today
    if (!target && todaySessions.length > 0) {
      target = todaySessions[0];
    }
  }

  // 4. Next upcoming scheduled session
  if (!target) {
    const upcoming = sessions
      .filter(s => s.status === 'scheduled' && s.date >= todayStr)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    if (upcoming.length > 0) {
      target = upcoming[0];
    }
  }

  // 5. Fallback to latest session if nothing else
  if (!target && sessions.length > 0) {
    target = sessions[0];
  }

  if (!target) {
    return { session: null, state: 'NO_ACTIVE_SESSION' };
  }

  return {
    session: target,
    state: getSessionAttendanceState(target, now),
  };
}

// Helper functions for Kiosk Attendance (strictly session-aware & deduplicated)
export function getStoredKioskAttendances(sessionId?: string): AttendanceRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('ftms_kiosk_attendances');
    if (!raw) return [];
    const all: AttendanceRecord[] = JSON.parse(raw);

    // Guaranteed deduplication per (sessionId, playerId)
    const seen = new Set<string>();
    const deduplicated: AttendanceRecord[] = [];
    for (const r of all) {
      const sId = r.sessionId || 's1';
      const pId = String(r.playerId);
      const key = `${sId}_${pId}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push({ ...r, sessionId: sId, playerId: pId });
      }
    }

    if (!sessionId) return deduplicated;
    return deduplicated.filter(r => String(r.sessionId) === String(sessionId));
  } catch {
    return [];
  }
}

export function saveStoredKioskAttendances(records: AttendanceRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ftms_kiosk_attendances', JSON.stringify(records));
    pushToServer();
  } catch (err) {
    console.error('Error saving kiosk attendances:', err);
  }
}

export function addKioskAttendance(record: Omit<AttendanceRecord, 'id'>): { record: AttendanceRecord; isNew: boolean } {
  const all = getStoredKioskAttendances();
  const targetSessionId = String(record.sessionId);
  const targetPlayerId = String(record.playerId);

  // Check duplicate ONLY within the same training session
  const existing = all.find(
    r => String(r.sessionId) === targetSessionId && String(r.playerId) === targetPlayerId
  );
  if (existing) {
    return { record: existing, isNew: false };
  }

  const newRec: AttendanceRecord = { 
    ...record, 
    sessionId: targetSessionId,
    playerId: targetPlayerId,
    id: "att_" + Date.now() 
  };
  const updated = [newRec, ...all];
  saveStoredKioskAttendances(updated);

  // Update session attendance counter in stored sessions
  if (targetSessionId) {
    const sessions = getStoredSessions();
    const sIdx = sessions.findIndex(s => String(s.id) === targetSessionId);
    if (sIdx !== -1) {
      const sessionRecords = updated.filter(r => String(r.sessionId) === targetSessionId);
      sessions[sIdx] = {
        ...sessions[sIdx],
        attendanceCount: sessionRecords.length,
      };
      saveStoredSessions(sessions);
    }
  }

  return { record: newRec, isNew: true };
}

// ============================
// MEETING NOTES (Catatan Pertemuan / Buku Latihan)
// ============================

export interface ActivityItem {
  id: string;
  text: string;
  done: boolean;
}

export interface MeetingNote {
  id: string;
  sessionId: string;         // Reference to TrainingSessionData.id
  sessionTitle: string;
  sessionDate: string;
  activities: ActivityItem[];
  notes: string;             // Free-form coach notes
  photos: string[];          // base64 data URLs of documentation photos
  createdAt: string;
  updatedAt: string;
}

export function getStoredMeetingNotes(): MeetingNote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('ftms_meeting_notes');
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveStoredMeetingNotes(notes: MeetingNote[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('ftms_meeting_notes', JSON.stringify(notes));
    pushToServer();
  } catch (err) {
    console.error('Error saving meeting notes:', err);
  }
}

export function getMeetingNoteBySessionId(sessionId: string): MeetingNote | undefined {
  const notes = getStoredMeetingNotes();
  return notes.find(n => n.sessionId === sessionId);
}

export function saveMeetingNote(note: MeetingNote) {
  const notes = getStoredMeetingNotes();
  const index = notes.findIndex(n => n.id === note.id);
  if (index >= 0) {
    notes[index] = { ...note, updatedAt: new Date().toISOString() };
  } else {
    notes.push(note);
  }
  saveStoredMeetingNotes(notes);
}

export function deleteMeetingNote(noteId: string) {
  const notes = getStoredMeetingNotes();
  saveStoredMeetingNotes(notes.filter(n => n.id !== noteId));
}

// ============================
// DATA EXPORT / IMPORT (untuk sinkronisasi antar perangkat)
// ============================

export interface FtmsBackup {
  version: string;
  exportedAt: string;
  players: PlayerData[];
  sessions: TrainingSessionData[];
  meetingNotes: MeetingNote[];
  kioskAttendances: AttendanceRecord[];
}

export function exportAllData(): FtmsBackup {
  return {
    version: "0.2.0",
    exportedAt: new Date().toISOString(),
    players: getStoredPlayers(),
    sessions: getStoredSessions(),
    meetingNotes: getStoredMeetingNotes(),
    kioskAttendances: getStoredKioskAttendances(),
  };
}

export function importAllData(backup: FtmsBackup) {
  if (backup.players) saveStoredPlayers(backup.players);
  if (backup.sessions) saveStoredSessions(backup.sessions);
  if (backup.meetingNotes) saveStoredMeetingNotes(backup.meetingNotes);
  if (backup.kioskAttendances) saveStoredKioskAttendances(backup.kioskAttendances);
}

export function downloadBackupFile() {
  const data = exportAllData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ftms-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ============================
// REAL-TIME SERVER SYNC (Sinkronisasi Laptop & HP)
// ============================

let isPushing = false;

export async function pushToServer() {
  if (typeof window === 'undefined' || isPushing) return;
  isPushing = true;
  try {
    const payload = exportAllData();
    await fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // Offline mode: gracefully continue
  } finally {
    isPushing = false;
  }
}

export async function syncWithServer(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  try {
    const res = await fetch('/api/sync', { cache: 'no-store' });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.exists && json.data) {
      const serverData = json.data;
      if (serverData.players && serverData.players.length > 0) {
        localStorage.setItem('ftms_players', JSON.stringify(serverData.players));
      }
      if (serverData.sessions && serverData.sessions.length > 0) {
        localStorage.setItem('ftms_sessions', JSON.stringify(serverData.sessions));
      }
      if (serverData.meetingNotes) {
        localStorage.setItem('ftms_meeting_notes', JSON.stringify(serverData.meetingNotes));
      }
      if (serverData.kioskAttendances) {
        localStorage.setItem('ftms_kiosk_attendances', JSON.stringify(serverData.kioskAttendances));
      }
      window.dispatchEvent(new Event('ftms_sync_updated'));
      return true;
    } else {
      // Server has no data file yet, push our current seed/local data to it
      await pushToServer();
      return true;
    }
  } catch (err) {
    // Device is offline, continues with localStorage
    return false;
  }
}

