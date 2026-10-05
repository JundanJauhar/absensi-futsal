import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'db.json');

interface DatabaseSchema {
  version: string;
  updatedAt: string;
  players: any[];
  sessions: any[];
  meetingNotes: any[];
  kioskAttendances: any[];
}

function readDatabase(): DatabaseSchema | null {
  try {
    if (!fs.existsSync(DB_FILE)) {
      return null;
    }
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[Sync API] Error reading db.json:', err);
    return null;
  }
}

function writeDatabase(data: DatabaseSchema): boolean {
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('[Sync API] Error writing db.json:', err);
    return false;
  }
}

// GET /api/sync - Retrieve shared database for laptop & phone
export async function GET() {
  const db = readDatabase();
  if (!db) {
    return NextResponse.json({
      exists: false,
      message: 'No shared database found yet',
    });
  }

  return NextResponse.json({
    exists: true,
    data: db,
  });
}

// POST /api/sync - Update shared database from any device (laptop or phone)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const existing = readDatabase();

    const updatedData: DatabaseSchema = {
      version: '0.2.0',
      updatedAt: new Date().toISOString(),
      players: body.players ?? existing?.players ?? [],
      sessions: body.sessions ?? existing?.sessions ?? [],
      meetingNotes: body.meetingNotes ?? existing?.meetingNotes ?? [],
      kioskAttendances: body.kioskAttendances ?? existing?.kioskAttendances ?? [],
    };

    const success = writeDatabase(updatedData);
    if (!success) {
      return NextResponse.json({ success: false, error: 'Failed to write data file' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updatedAt: updatedData.updatedAt });
  } catch (err: any) {
    console.error('[Sync API] POST error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
