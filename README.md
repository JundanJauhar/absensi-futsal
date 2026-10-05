# FTMS — Futsal Team Management System

FTMS dibangun sesuai `FTMS_Master_Prompt_v2.md`. Implementasi operasional lokal saat ini mencakup fondasi pemain, latihan, absensi manual, kiosk, evaluasi, dan kontrak Face Service:

- PWA Next.js mobile-first dengan design system Emerald Lapangan.
- AppShell responsif: bottom navigation di mobile dan sidebar di layar besar.
- Dashboard awal, halaman Style Guide, serta state loading/empty/error/success.
- Face service FastAPI dengan health, enrollment, dan recognition contract endpoint. Mesin model biometrik produksi tetap dapat dipasang tanpa mengubah kontrak Laravel.
- Docker Compose untuk frontend, face service, PostgreSQL, dan Redis.
- Laravel 12 API + Sanctum, migration pemain, seeder 18 pemain, serta Player CRUD.
- Halaman `/players` dengan pencarian, filter posisi, kartu responsif, state lengkap, dan form tambah pemain.
- Login Coach, proteksi API dengan Sanctum, edit/hapus pemain, dan upload foto profil.
- Jadwal latihan, reschedule, riwayat reschedule, dan halaman `/training`.
- Absensi manual idempoten per pemain/sesi melalui `/attendance` dan halaman `/attendance`.
- Kiosk manual field-ready di `/kiosk/attendance`; pengenalan wajah dapat dihubungkan melalui endpoint `/attendance/recognize`.
- Evaluasi pemain berbasis slider dan endpoint riwayat perkembangan.
- Halaman registrasi wajah terpandu, notifikasi, dan pengaturan Telegram sebagai fondasi integrasi.

## Menjalankan frontend

```powershell
cd frontend
npm install
npm run dev
```

Buka `http://localhost:3001`. Style guide tersedia di `http://localhost:3001/style-guide`.

## Menjalankan Laravel API secara lokal

```powershell
cd backend
php artisan migrate --force
php artisan serve --host=0.0.0.0 --port=8000
```

Health check: `http://localhost:8000/api/v1/health`. API pemain: `http://localhost:8000/api/v1/players`.
Login: `http://localhost:3001/login`. Akun demo: `coach@ftms.test` / `password`.

## Menjalankan service pendukung

```powershell
docker compose up --build
```

Endpoint health face service: `http://localhost:8001/health`.

## Environment

Salin `.env.example` menjadi `.env.local` di folder `frontend`. Secret backend tidak boleh diletakkan di frontend.

Untuk deployment:

- Set Railway Root Directory ke `backend` agar Railway menggunakan `backend/Dockerfile`.
- Set Vercel Root Directory ke `frontend`.
- Set `NEXT_PUBLIC_API_URL` di Vercel ke URL Railway backend + `/api/v1`.
- Set `FRONTEND_URL` di Railway ke URL Vercel.
- Jangan menjalankan `migrate:fresh` pada database Supabase yang sudah berisi data.

## Checklist implementasi operasional

- [ ] Jalankan frontend dan buka dashboard pada lebar 360, 390, 768, dan 1280 px.
- [ ] Pastikan tidak ada scroll horizontal dan tombol dapat dijangkau satu tangan.
- [ ] Buka `/style-guide` dan periksa token warna, badge, kartu, state, dan navigasi.
- [ ] Jalankan `docker compose up --build` jika Docker tersedia.
- [x] API Laravel mengembalikan health check dan 18 pemain demo.
- [x] Build frontend dan smoke test halaman `/players` berhasil.
- [x] Uji create/delete pemain melalui API berhasil.
- [x] Autentikasi Coach/Sanctum dan proteksi endpoint pemain.
- [x] Edit/hapus pemain, upload foto, dan form bottom sheet.
- [x] Test otomatis Player API (4 test, 11 assertion).
- [x] Halaman profil/detail pemain, tab data, dan audit log.
- [x] API jadwal latihan: upcoming, daftar sesi, buat sesi, dan reschedule.
- [x] Halaman `/training` dengan status sesi, create session, dan reschedule bottom sheet.
- [x] Test otomatis Training API dan seluruh suite backend (8 test, 20 assertion).
- [x] Phase 3: attendance manual, pencegahan duplikat, statistik sesi.
- [x] Phase 4: kiosk manual, daftar check-in, fallback manual.
- [x] Phase 5: kontrak FastAPI health/enroll/recognize dan UI consent registrasi wajah.
- [x] Phase 9: evaluasi pemain dan endpoint development history.
- [x] Frontend build production dan test runner.
- [ ] Opsional: pasang model face recognition sungguhan pada service Python.
- [ ] Opsional: hubungkan Telegram Bot API dan Grafana ke deployment produksi.

Untuk pengembangan lokal, backend menggunakan PostgreSQL Supabase melalui konfigurasi `.env`. Test PHPUnit memakai SQLite in-memory sehingga tidak menghapus database development. Docker Compose menyiapkan PostgreSQL, Redis, dan service backend untuk lingkungan terkontainerisasi. Pada environment ini Docker dan Python CLI tidak tersedia, jadi validasi Docker/Face Service penuh perlu dijalankan pada mesin yang memiliki Docker atau Python.

## Endpoint utama

- `POST /api/v1/auth/login`
- `GET|POST /api/v1/players`
- `GET|POST /api/v1/training/sessions`
- `POST /api/v1/training/sessions/{id}/reschedule`
- `GET|POST /api/v1/attendance`
- `GET /api/v1/attendance/session/{id}`
- `POST /api/v1/attendance/recognize`
- `GET|POST|PUT /api/v1/evaluations`
- `GET /api/v1/players/{id}/evaluations`
- `GET /api/v1/players/{id}/development`
