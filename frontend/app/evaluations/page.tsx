"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, Star, TrendingUp, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface PendingEvaluation {
  id: string;
  name: string;
  jersey: number;
  position: string;
  lastEvalDate: string | null;
  avatar: string;
}

interface CompletedEvaluation {
  id: string;
  playerId: string;
  name: string;
  jersey: number;
  date: string;
  overallScore: number;
  summary: string;
  avatar: string;
  trend: 'up' | 'down' | 'neutral';
}

import { getPlayers } from '@/lib/api';

export default function EvaluationsPage() {
  const [activeTab, setActiveTab] = useState<'tertunda' | 'selesai'>('tertunda');
  const [search, setSearch] = useState('');
  const [pendingList, setPendingList] = useState<PendingEvaluation[]>([]);
  const [completedList, setCompletedList] = useState<CompletedEvaluation[]>([]);

  React.useEffect(() => {
    let mounted = true;
    getPlayers()
      .then(res => {
        if (!mounted) return;
        const posMap: Record<string, string> = {
          goalkeeper: 'Kiper',
          anchor: 'Anchor',
          flank: 'Flank',
          pivot: 'Pivot',
        };
        const mapped: PendingEvaluation[] = res.data.map(p => ({
          id: String(p.id),
          name: p.full_name,
          jersey: Number(p.jersey_number),
          position: posMap[p.primary_position] || p.primary_position,
          lastEvalDate: null,
          avatar: p.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        }));
        setPendingList(mapped);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const filteredPending = pendingList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCompleted = completedList.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="container mx-auto p-4 md:p-6 pb-24 md:pb-6 space-y-6 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Evaluasi Pemain</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Nilai performa pemain secara berkala</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white dark:bg-gray-900 p-2 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex w-full md:w-auto p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => setActiveTab('tertunda')}
            className={`flex-1 md:w-32 py-2 px-4 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'tertunda'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-4 h-4" />
              <span>Tertunda</span>
              <span className="bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 py-0.5 px-2 rounded-full text-xs">
                {pendingList.length}
              </span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('selesai')}
            className={`flex-1 md:w-32 py-2 px-4 text-sm font-medium rounded-lg transition-all ${
              activeTab === 'selesai'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CheckCircle className="w-4 h-4" />
              <span>Selesai</span>
            </div>
          </button>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari pemain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-gray-900 focus:border-primary-500 rounded-xl text-sm transition-all outline-none"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'tertunda' ? (
          <motion.div
            key="tertunda"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filteredPending.length > 0 ? (
              filteredPending.map((player, i) => (
                <motion.div 
                  key={player.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass p-5 rounded-2xl flex flex-col h-full border border-gray-200 dark:border-gray-800 hover:border-primary-500/50 dark:hover:border-primary-500/50 transition-colors group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-lg flex-shrink-0 border-2 border-white dark:border-gray-900 shadow-sm relative">
                      {player.avatar}
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
                        {player.jersey}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1">{player.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{player.position}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800/50">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> Eval Terakhir</span>
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {player.lastEvalDate ? new Date(player.lastEvalDate).toLocaleDateString('id-ID') : 'Belum pernah'}
                      </span>
                    </div>
                    <Link href={`/players/${player.id}/evaluation`} className="block w-full">
                      <button className="w-full py-2 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 hover:bg-primary-100 dark:hover:bg-primary-900/40 rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2 group-hover:bg-primary-500 group-hover:text-white">
                        Evaluasi Sekarang
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </button>
                    </Link>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                Tidak ada pemain yang cocok dengan pencarian.
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="selesai"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {filteredCompleted.length > 0 ? (
              filteredCompleted.map((evalData, i) => (
                <motion.div 
                  key={evalData.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass p-4 rounded-2xl border border-gray-200 dark:border-gray-800 flex flex-col sm:flex-row gap-4 sm:items-center"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 flex-shrink-0 relative">
                      {evalData.avatar}
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-[10px] font-bold rounded-full flex items-center justify-center border border-white dark:border-gray-800">
                        {evalData.jersey}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 dark:text-white">{evalData.name}</h3>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(evalData.date).toLocaleDateString('id-ID')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex-1 text-sm text-gray-600 dark:text-gray-400 hidden md:block">
                    {evalData.summary}
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 min-w-[120px] pt-3 sm:pt-0 border-t sm:border-t-0 border-gray-100 dark:border-gray-800/50">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Skor</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-xl font-black ${
                          evalData.overallScore >= 80 ? 'text-success-500' : 
                          evalData.overallScore >= 60 ? 'text-warning-500' : 'text-danger-500'
                        }`}>
                          {evalData.overallScore}
                        </span>
                        {evalData.trend === 'up' && <TrendingUp className="w-4 h-4 text-success-500" />}
                        {evalData.trend === 'down' && <TrendingUp className="w-4 h-4 text-danger-500 rotate-180" />}
                      </div>
                    </div>
                    
                    <button className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400">
                Tidak ada evaluasi yang cocok dengan pencarian.
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
