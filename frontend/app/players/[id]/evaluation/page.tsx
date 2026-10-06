"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Save, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const EVALUATION_STEPS = [
  { id: 'technical', title: 'Teknik', skills: ['Passing', 'Dribbling', 'Ball Control', 'Shooting', 'First Touch'] },
  { id: 'physical', title: 'Fisik', skills: ['Speed', 'Stamina', 'Agility', 'Strength'] },
  { id: 'tactical', title: 'Taktik', skills: ['Positioning', 'Decision Making', 'Defensive Awareness', 'Attacking Awareness', 'Teamwork'] },
  { id: 'notes', title: 'Catatan', skills: [] }
];

const PREV_SCORES: Record<string, number> = {
  'Passing': 75, 'Dribbling': 80, 'Ball Control': 78, 'Shooting': 70, 'First Touch': 72,
  'Speed': 85, 'Stamina': 70, 'Agility': 82, 'Strength': 75,
  'Positioning': 78, 'Decision Making': 75, 'Defensive Awareness': 70, 'Attacking Awareness': 80, 'Teamwork': 85
};

import { useParams } from 'next/navigation';
import { getPlayers } from '@/lib/api';
import type { Player } from '@/types/player';

export default function EvaluationFormPage() {
  const routeParams = useParams();
  const playerId = (routeParams?.id as string) || '';
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>(
    Object.keys(PREV_SCORES).reduce((acc, key) => ({ ...acc, [key]: PREV_SCORES[key] }), {})
  );
  const [notes, setNotes] = useState({ strengths: '', weaknesses: '', focus: '', general: '' });

  React.useEffect(() => {
    if (!playerId) return;
    getPlayers()
      .then(res => {
        const found = res.data.find(p => String(p.id) === String(playerId));
        if (found) setPlayer(found);
      })
      .catch(() => {});
  }, [playerId]);

  const playerName = player ? player.full_name : 'Pemain Futsal';
  const playerJersey = player ? String(player.jersey_number) : '#';
  const playerAvatar = player ? player.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'FT';

  const handleScoreChange = (skill: string, value: number) => {
    setScores(prev => ({ ...prev, [skill]: value }));
  };

  const currentStepData = EVALUATION_STEPS[currentStep];
  const isLastStep = currentStep === EVALUATION_STEPS.length - 1;

  const renderScoreDiff = (skill: string, current: number) => {
    const prev = PREV_SCORES[skill];
    if (!prev) return null;
    const diff = current - prev;
    if (diff === 0) return <span className="text-gray-400 text-xs">-</span>;
    return (
      <span className={`text-xs font-bold flex items-center ${diff > 0 ? 'text-success-500' : 'text-danger-500'}`}>
        {diff > 0 ? '▲' : '▼'} {Math.abs(diff)}
      </span>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 pb-24 md:pb-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/evaluations" className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-lg shadow-lg relative">
            {playerAvatar}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-gray-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
              {playerJersey}
            </div>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white leading-tight">{playerName}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Evaluasi Performa Pemain</p>
          </div>
        </div>
      </div>

      {/* Stepper Progress */}
      <div className="flex items-center justify-between mb-8 relative">
        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 dark:bg-gray-800 -z-10 rounded-full" />
        <div 
          className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-primary-500 -z-10 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / (EVALUATION_STEPS.length - 1)) * 100}%` }}
        />
        {EVALUATION_STEPS.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors border-2 ${
              idx < currentStep ? 'bg-primary-500 border-primary-500 text-white' :
              idx === currentStep ? 'bg-gray-900 dark:bg-white border-gray-900 dark:border-white text-white dark:text-gray-900 shadow-[0_0_15px_rgba(52,211,153,0.5)]' :
              'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-400'
            }`}>
              {idx < currentStep ? <CheckCircle2 className="w-5 h-5" /> : idx + 1}
            </div>
            <span className={`text-xs font-semibold ${idx <= currentStep ? 'text-gray-900 dark:text-white' : 'text-gray-400'}`}>
              {step.title}
            </span>
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="glass rounded-3xl border border-gray-200 dark:border-gray-800 p-6 md:p-8 min-h-[400px] flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="flex-1"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              {currentStepData.title}
            </h2>

            {currentStepData.id !== 'notes' ? (
              <div className="space-y-8">
                {currentStepData.skills.map(skill => (
                  <div key={skill} className="space-y-3">
                    <div className="flex justify-between items-end">
                      <div>
                        <label className="font-semibold text-gray-800 dark:text-gray-200 block">{skill}</label>
                        <span className="text-xs text-gray-500 dark:text-gray-500">Sebelumnya: {PREV_SCORES[skill]}</span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-primary-600 dark:text-primary-400 leading-none">
                          {scores[skill]}
                        </span>
                        {renderScoreDiff(skill, scores[skill])}
                      </div>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={scores[skill]}
                      onChange={(e) => handleScoreChange(skill, parseInt(e.target.value))}
                      className="w-full h-2 bg-gray-200 dark:bg-gray-800 rounded-lg appearance-none cursor-pointer accent-primary-500"
                    />
                    <div className="flex justify-between text-xs text-gray-400 font-medium">
                      <span>Kurang</span>
                      <span>Cukup</span>
                      <span>Sangat Baik</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Kekuatan (Strengths)</label>
                  <textarea 
                    rows={3} 
                    value={notes.strengths}
                    onChange={(e) => setNotes({...notes, strengths: e.target.value})}
                    placeholder="Contoh: Stamina sangat bagus, visi bermain baik..."
                    className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Kelemahan (Weaknesses)</label>
                  <textarea 
                    rows={3} 
                    value={notes.weaknesses}
                    onChange={(e) => setNotes({...notes, weaknesses: e.target.value})}
                    placeholder="Contoh: Kurang tenang saat finishing..."
                    className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Fokus Latihan Selanjutnya</label>
                  <input 
                    type="text" 
                    value={notes.focus}
                    onChange={(e) => setNotes({...notes, focus: e.target.value})}
                    placeholder="Contoh: Shooting drill, 1v1 defending"
                    className="w-full p-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
            disabled={currentStep === 0}
            className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Kembali
          </button>

          {!isLastStep ? (
            <button
              onClick={() => setCurrentStep(prev => Math.min(EVALUATION_STEPS.length - 1, prev + 1))}
              className="btn-glow px-6 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex items-center gap-2 rounded-xl text-sm font-bold hover:scale-105 transition-all"
            >
              Selanjutnya <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              className="btn-glow px-6 py-2.5 bg-gradient-to-r from-primary-600 to-primary-500 text-white flex items-center gap-2 rounded-xl text-sm font-bold hover:scale-105 transition-all"
            >
              <Save className="w-4 h-4" /> Simpan Evaluasi
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
