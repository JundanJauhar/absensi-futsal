import Link from 'next/link';
import { Home, Calendar, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4 py-12">
      <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/20 flex items-center justify-center text-primary-500 mb-4">
        <span className="text-2xl font-black">404</span>
      </div>
      <h2 className="text-xl font-bold text-dark-900 dark:text-white mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-sm text-dark-500 dark:text-dark-400 max-w-sm mb-6">
        Alamat yang Anda akses tidak tersedia atau telah dipindahkan.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary-500/20 transition-all"
        >
          <Home className="w-4 h-4" />
          <span>Ke Beranda</span>
        </Link>
        <Link
          href="/training"
          className="px-5 py-2.5 rounded-xl bg-dark-100 dark:bg-dark-800 hover:bg-dark-200 dark:hover:bg-dark-700 text-dark-800 dark:text-dark-200 text-xs font-bold flex items-center gap-2 transition-all border border-dark-200 dark:border-dark-700"
        >
          <Calendar className="w-4 h-4" />
          <span>Jadwal Latihan</span>
        </Link>
      </div>
    </div>
  );
}
