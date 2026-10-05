"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, User, Lock, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { login, getToken } from '@/lib/api';

function getNextPath(): string {
  if (typeof window === 'undefined') return '/';
  const next = new URLSearchParams(window.location.search).get('next');
  // Only allow internal paths
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : '/';
}

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Already logged in → go straight to the app
  useEffect(() => {
    if (getToken()) window.location.replace(getNextPath());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(username.trim(), password);
      window.location.replace(getNextPath());
    } catch (err) {
      setError(
        err instanceof Error && err.message === 'LOGIN_THROTTLED'
          ? 'Terlalu banyak percobaan. Tunggu 1 menit lalu coba lagi.'
          : 'Username atau password salah'
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-950 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-500/20 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-500/20 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md px-4 relative z-10"
      >
        <div className="glass p-8 md:p-10 rounded-3xl shadow-xl border border-white/20 dark:border-white/10 relative overflow-hidden">
          {/* Subtle inner glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent dark:from-white/5 pointer-events-none" />
          
          <div className="text-center mb-8 relative z-10">
            <motion.div 
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 to-primary-600 shadow-lg shadow-primary-500/30 mb-4"
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
            >
              <Zap className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-2">FTMS</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Sistem Manajemen Tim Futsal Sangar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 relative z-10">
            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="bg-danger-50 dark:bg-danger-500/10 border border-danger-200 dark:border-danger-500/20 text-danger-600 dark:text-danger-400 p-3 rounded-xl flex items-start gap-2 text-sm"
              >
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="username">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-200 dark:border-gray-800 rounded-xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholder="Masukkan username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-800 rounded-xl bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-glow w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-700 hover:to-primary-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-70 transition-all active:scale-[0.98] mt-6 group"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Memproses...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Masuk Sistem</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              )}
            </button>
          </form>

          <div className="mt-8 text-center relative z-10">
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Khusus pengurus &amp; staf tim futsal
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
