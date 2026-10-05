"use client";

import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  MessageCircle, 
  Clock, 
  MapPin, 
  Moon, 
  Sun, 
  Monitor, 
  Info, 
  ChevronRight, 
  CheckCircle2,
  Smartphone,
  Wifi,
  Download,
  Upload,
  Database,
  Check
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { downloadBackupFile, importAllData, FtmsBackup } from '@/lib/dataStore';
import { logout } from '@/lib/api';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="container mx-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary-500" />
          Pengaturan
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Konfigurasi sistem FTMS</p>
      </div>

      <div className="space-y-6">
        {/* Telegram Connection */}
        <section className="glass rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageCircle className="w-5 h-5 text-blue-500" />
              Koneksi Telegram
            </h2>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <div className="flex items-center justify-between p-3 bg-success-50 dark:bg-success-900/10 border border-success-200 dark:border-success-800/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-success-100 dark:bg-success-800/30 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success-600 dark:text-success-400" />
                </div>
                <div>
                  <p className="font-semibold text-success-900 dark:text-success-100">Bot Terhubung</p>
                  <p className="text-xs text-success-700 dark:text-success-400">@SangarFutsalBot aktif</p>
                </div>
              </div>
              <button className="px-3 py-1.5 bg-success-600 hover:bg-success-700 text-white text-sm font-medium rounded-lg transition-colors">
                Kirim Pesan Uji
              </button>
            </div>
            
            <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
              <p className="font-medium">Cara menghubungkan pemain ke Bot:</p>
              <ol className="list-decimal list-inside space-y-1 ml-1">
                <li>Buka aplikasi Telegram</li>
                <li>Cari bot <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-primary-600 dark:text-primary-400">@SangarFutsalBot</span></li>
                <li>Ketik <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-800 dark:text-gray-200">/start</span> untuk mendapatkan Chat ID</li>
                <li>Masukkan Chat ID ke profil pemain</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Training Defaults */}
        <section className="glass rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" />
              Pengaturan Latihan Default
            </h2>
          </div>
          <div className="p-4 md:p-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Hari Latihan Rutin</label>
                <select className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
                  <option>Senin</option>
                  <option>Selasa</option>
                  <option>Rabu</option>
                  <option>Kamis</option>
                  <option>Jumat</option>
                  <option>Sabtu</option>
                  <option>Minggu</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Waktu Latihan</label>
                <input 
                  type="time" 
                  defaultValue="19:00"
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Lokasi Default</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input 
                    type="text" 
                    defaultValue="GOR Surya, Seturan"
                    className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Toleransi Keterlambatan (menit)</label>
                <input 
                  type="number" 
                  defaultValue="15"
                  min="0"
                  max="60"
                  className="w-full px-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
                <p className="text-xs text-gray-500 mt-1.5">Pemain yang absen setelah waktu ini akan ditandai terlambat.</p>
              </div>
            </div>
            <div className="pt-2">
              <button className="btn-glow px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl text-sm transition-colors">
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </section>

        {/* Appearance */}
        <section className="glass rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Monitor className="w-5 h-5 text-accent-500" />
              Tampilan
            </h2>
          </div>
          <div className="p-4 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Tema Gelap (Dark Mode)</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">Sesuaikan tampilan antarmuka</p>
              </div>
              <div className="flex bg-gray-100 dark:bg-gray-900 p-1 rounded-xl border border-gray-200 dark:border-gray-800">
                <button 
                  onClick={() => setTheme('light')}
                  className={`p-2 rounded-lg transition-colors ${theme === 'light' ? 'bg-white text-amber-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  aria-label="Light mode"
                >
                  <Sun className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setTheme('dark')}
                  className={`p-2 rounded-lg transition-colors ${theme === 'dark' ? 'bg-gray-800 text-blue-400 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  aria-label="Dark mode"
                >
                  <Moon className="w-5 h-5" />
                </button>
                <button 
                  onClick={() => setTheme('system')}
                  className={`p-2 rounded-lg transition-colors ${theme === 'system' ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  aria-label="System theme"
                >
                  <Monitor className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Device Sync & Network Connection */}
        <section className="glass rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-500" />
              Koneksi HP & Laptop (Satu Jaringan WiFi)
            </h2>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
              Anda dapat mengoperasikan sistem dari <strong>HP</strong> di lapangan futsal dan mengupdate data dari <strong>Laptop</strong> di rumah/kantor dengan menghubungkannya ke jaringan WiFi yang sama.
            </p>

            <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs text-slate-700 dark:text-slate-300">
              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-500" />
                <span>Langkah Menghubungkan HP ke Laptop:</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 ml-1 leading-relaxed">
                <li>Pastikan <strong>Laptop dan HP terhubung ke WiFi / Hotspot yang sama</strong>.</li>
                <li>Di laptop, jalankan perintah: <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono text-emerald-600 dark:text-emerald-400">npm run dev -- -H 0.0.0.0</code></li>
                <li>Cek IP Laptop Anda (buka CMD, ketik <code className="bg-slate-200 dark:bg-slate-800 px-1 rounded font-mono">ipconfig</code>, cari IPv4 Address, misal: <span className="font-mono font-bold text-primary-500">192.168.1.10</span>).</li>
                <li>Di HP, buka browser Chrome dan ketik alamat: <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono font-bold text-primary-500">http://[IP-Laptop]:3000</code></li>
                <li>Di Chrome HP, ketuk menu titik tiga ⋮ lalu pilih <strong>&ldquo;Tambahkan ke Layar Utama&rdquo; (Install App)</strong> agar dapat dibuka seperti aplikasi native!</li>
              </ol>
            </div>
          </div>
        </section>

        {/* Backup & Restore Data */}
        <section className="glass rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-500" />
              Cadangan & Sinkronisasi Data Offline
            </h2>
          </div>
          <div className="p-4 md:p-5 space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Gunakan fitur ini untuk memindahkan atau menyelaraskan data (pemain, catatan latihan, absensi) antara laptop dan HP tanpa perlu koneksi internet.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => downloadBackupFile()}
                className="flex-1 py-3 px-4 rounded-xl bg-primary-600 hover:bg-primary-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 transition-all active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>Unduh Cadangan Data (JSON)</span>
              </button>

              <label className="flex-1 py-3 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition-colors border border-slate-200 dark:border-slate-700">
                <Upload className="w-4 h-4 text-emerald-500" />
                <span>Pulihkan / Impor Data</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (event) => {
                        try {
                          const backup = JSON.parse(event.target?.result as string);
                          importAllData(backup);
                          alert("Data berhasil dipulihkan & disinkronkan!");
                          window.location.reload();
                        } catch {
                          alert("Format file cadangan tidak valid.");
                        }
                      };
                      reader.readAsText(file);
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="glass rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-800/50 bg-gray-50/50 dark:bg-gray-800/20">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Info className="w-5 h-5 text-gray-500" />
              Tentang Aplikasi
            </h2>
          </div>
          <div className="p-0 divide-y divide-gray-100 dark:divide-gray-800/50">
            <div className="p-4 md:p-5 flex justify-between items-center">
              <span className="text-gray-700 dark:text-gray-300">Versi Sistem</span>
              <span className="font-mono text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-gray-600 dark:text-gray-400">v2.1.0</span>
            </div>
            <button className="w-full p-4 md:p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors text-left">
              <span className="text-gray-700 dark:text-gray-300">Kebijakan Privasi</span>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
            <button
              onClick={() => logout()}
              className="w-full p-4 md:p-5 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors text-left text-danger-600 dark:text-danger-500 font-medium"
            >
              <span>Keluar (Logout)</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
