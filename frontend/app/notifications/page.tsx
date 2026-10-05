"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Calendar, AlertTriangle, BarChart3, CheckCircle2, XCircle, Clock, RefreshCw, Check } from 'lucide-react';
import clsx from 'clsx';

interface Notification {
  id: string;
  type: 'training_reminder' | 'reschedule' | 'evaluation_reminder';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}

interface DeliveryLog {
  id: string;
  recipient: string;
  type: string;
  status: 'sent' | 'failed' | 'pending';
  timestamp: string;
}

const NOTIFICATIONS_MOCK: Notification[] = [
  { id: 'n1', type: 'reschedule', title: 'Perubahan Jadwal', message: 'Latihan hari ini diundur menjadi 20:00 WIB dikarenakan lapangan penuh.', timestamp: '10 menit yang lalu', isRead: false },
  { id: 'n2', type: 'evaluation_reminder', title: 'Evaluasi Tertunda', message: 'Ada 6 pemain yang belum dievaluasi bulan ini.', timestamp: '1 jam yang lalu', isRead: false },
  { id: 'n3', type: 'training_reminder', title: 'Pengingat Latihan', message: 'Latihan rutin di GOR Surya besok 19:00 WIB.', timestamp: 'Kemarin, 15:00', isRead: true },
  { id: 'n4', type: 'training_reminder', title: 'Latihan Selesai', message: 'Ringkasan kehadiran latihan telah dibuat.', timestamp: '3 hari yang lalu', isRead: true },
  { id: 'n5', type: 'evaluation_reminder', title: 'Evaluasi Selesai', message: 'Laporan evaluasi bulanan sudah tersedia.', timestamp: 'Minggu lalu', isRead: true },
  { id: 'n6', type: 'training_reminder', title: 'Pengingat Latihan', message: 'Latihan rutin di GOR Surya.', timestamp: 'Minggu lalu', isRead: true },
  { id: 'n7', type: 'reschedule', title: 'Latihan Dibatalkan', message: 'Latihan dibatalkan karena cuaca buruk.', timestamp: '2 minggu yang lalu', isRead: true },
  { id: 'n8', type: 'training_reminder', title: 'Jadwal Baru', message: 'Jadwal latihan bulan depan telah diupdate.', timestamp: '3 minggu yang lalu', isRead: true },
];

const LOGS_MOCK: DeliveryLog[] = [
  { id: 'l1', recipient: 'Grup Telegram Tim', type: 'Pengingat Latihan', status: 'sent', timestamp: '14:00 WIB' },
  { id: 'l2', recipient: 'Budi Santoso (Bot)', type: 'Pesan Personal', status: 'failed', timestamp: '13:45 WIB' },
  { id: 'l3', recipient: 'Grup Pengurus', type: 'Laporan Kehadiran', status: 'pending', timestamp: '13:30 WIB' },
  { id: 'l4', recipient: 'Grup Telegram Tim', type: 'Perubahan Jadwal', status: 'sent', timestamp: 'Kemarin' },
  { id: 'l5', recipient: 'Andi Wijaya (Bot)', type: 'Hasil Evaluasi', status: 'sent', timestamp: 'Kemarin' },
];

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'semua' | 'log'>('semua');
  const [notifications, setNotifications] = useState(NOTIFICATIONS_MOCK);
  
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
  };

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'training_reminder': return <Calendar className="w-5 h-5 text-blue-500" />;
      case 'reschedule': return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      case 'evaluation_reminder': return <BarChart3 className="w-5 h-5 text-purple-500" />;
    }
  };

  const getIconBg = (type: Notification['type']) => {
    switch (type) {
      case 'training_reminder': return 'bg-blue-100 dark:bg-blue-500/20';
      case 'reschedule': return 'bg-amber-100 dark:bg-amber-500/20';
      case 'evaluation_reminder': return 'bg-purple-100 dark:bg-purple-500/20';
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Bell className="w-8 h-8 text-primary-500" />
            Notifikasi
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Pemberitahuan sistem dan log pengiriman pesan</p>
        </div>
        {activeTab === 'semua' && notifications.some(n => !n.isRead) && (
          <button 
            onClick={markAllAsRead}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            <Check className="w-4 h-4" /> Tandai semua dibaca
          </button>
        )}
      </div>

      <div className="flex p-1 bg-gray-100 dark:bg-gray-900 rounded-xl max-w-md border border-gray-200 dark:border-gray-800">
        <button
          onClick={() => setActiveTab('semua')}
          className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'semua'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Semua
        </button>
        <button
          onClick={() => setActiveTab('log')}
          className={`flex-1 py-2 px-4 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'log'
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          Log Pengiriman
        </button>
      </div>

      <div className="glass rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'semua' ? (
            <motion.div
              key="semua"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-gray-100 dark:divide-gray-800/50"
            >
              {notifications.map((notif, i) => (
                <motion.div 
                  key={notif.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className={clsx(
                    "p-4 md:p-5 flex gap-4 transition-colors hover:bg-gray-50/50 dark:hover:bg-gray-800/30",
                    !notif.isRead ? "bg-primary-50/30 dark:bg-primary-900/10" : ""
                  )}
                >
                  <div className={clsx("w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0", getIconBg(notif.type))}>
                    {getIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className={clsx("font-semibold text-base truncate", !notif.isRead ? "text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300")}>
                        {notif.title}
                      </h4>
                      <span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap mt-1">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {notif.message}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="w-2 h-2 rounded-full bg-primary-500 flex-shrink-0 mt-2" />
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="log"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="divide-y divide-gray-100 dark:divide-gray-800/50"
            >
              {LOGS_MOCK.map((log, i) => (
                <motion.div 
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white">{log.recipient}</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-500">• {log.timestamp}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Pesan: {log.type}</p>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto mt-2 sm:mt-0">
                    {log.status === 'sent' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-100 dark:bg-success-500/20 text-success-700 dark:text-success-400 text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Terkirim
                      </span>
                    )}
                    {log.status === 'pending' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-100 dark:bg-warning-500/20 text-warning-700 dark:text-warning-400 text-xs font-semibold">
                        <Clock className="w-3.5 h-3.5" /> Menunggu
                      </span>
                    )}
                    {log.status === 'failed' && (
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-danger-100 dark:bg-danger-500/20 text-danger-700 dark:text-danger-400 text-xs font-semibold">
                          <XCircle className="w-3.5 h-3.5" /> Gagal
                        </span>
                        <button className="flex items-center gap-1 text-xs font-bold text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300">
                          <RefreshCw className="w-3.5 h-3.5" /> Kirim Ulang
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
