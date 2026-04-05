import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Zap, RefreshCcw, Plus, Share2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface VictoryProps {
  score: number;
  rank: string;
  onRematch: () => void;
  onNewGame: () => void;
}

export const Victory: React.FC<VictoryProps> = ({ score, rank, onRematch, onNewGame }) => {
  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-8 py-12">
      {/* Victory Section */}
      <section className="relative flex flex-col items-center text-center py-12">
        <div className="absolute inset-0 bg-primary/5 blur-[120px] rounded-full pointer-events-none"></div>
        <motion.h1 
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="font-headline font-bold text-7xl md:text-9xl text-primary neon-text-primary tracking-tighter leading-none mb-2"
        >
          VICTORY
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="font-label text-sm uppercase tracking-[0.4em] text-primary/80 mb-8"
        >
          System Dominance Confirmed
        </motion.p>

        {/* Performance Bento */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 w-full mt-8">
          {/* Score Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="md:col-span-2 bg-surface-container-low p-8 rounded-xl relative overflow-hidden flex flex-col justify-center text-left"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Trophy size={96} />
            </div>
            <span className="font-label text-[10px] tracking-[0.2em] text-on-surface-variant mb-2">TOTAL PROTOCOL SCORE</span>
            <div className="font-headline text-6xl font-bold text-primary">{score.toLocaleString()}</div>
            <div className="mt-4 flex items-center gap-2">
              <span className="px-2 py-1 bg-primary text-black font-label text-[10px] rounded font-bold uppercase">RANK: {rank}</span>
            </div>
          </motion.div>

          {/* Breakdown Cards */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-surface-container-high p-6 rounded-xl flex flex-col justify-between border-l-2 border-primary text-left"
          >
            <span className="font-label text-[10px] tracking-widest text-on-surface-variant">GRID HITS</span>
            <div>
              <div className="font-headline text-3xl font-bold text-on-surface">8,200</div>
              <div className="text-[10px] text-on-surface-variant">+200 avg/hit</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-surface-container-high p-6 rounded-xl flex flex-col justify-between border-l-2 border-tertiary text-left"
          >
            <span className="font-label text-[10px] tracking-widest text-on-surface-variant">EARLY GUESS</span>
            <div>
              <div className="font-headline text-3xl font-bold text-tertiary">3,500</div>
              <div className="text-[10px] text-on-surface-variant">Speed bonus active</div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="md:col-span-4 bg-gradient-to-r from-surface-container-low to-surface-container-high p-4 rounded-xl flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-primary/20 rounded flex items-center justify-center text-primary">
                <Zap size={20} />
              </div>
              <div className="text-left">
                <div className="font-label text-xs tracking-widest text-on-surface">COMBO MULTIPLIER</div>
                <div className="text-[10px] text-on-surface-variant">x1.75 Multiplier Applied to base score</div>
              </div>
            </div>
            <div className="font-headline text-2xl font-bold text-primary">+750</div>
          </motion.div>
        </div>
      </section>

      {/* Grid Reveal Section */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center py-12">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.8 }}
          className="order-2 md:order-1"
        >
          <div className="mb-6">
            <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">OPPONENT INTEL</h2>
            <p className="text-on-surface-variant text-sm mt-2 font-body max-w-sm">
              Declassification complete. We've mapped the enemy word structures that were concealed in Sector-7.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { name: 'CYBERNETIC', letters: 10 },
              { name: 'OBSIDIAN', letters: 8 },
              { name: 'NEXUS', letters: 5 },
            ].map((intel) => (
              <div key={intel.name} className="flex items-center justify-between p-3 bg-surface-container-low rounded border border-outline-variant/10">
                <div className="flex items-center gap-3">
                  <span className="w-2 h-2 rounded-full bg-secondary"></span>
                  <span className="font-label text-xs tracking-widest uppercase">{intel.name}</span>
                </div>
                <span className="font-headline text-xs text-on-surface-variant">{intel.letters} LETTERS</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Visual Representation of the Grid */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.9 }}
          className="order-1 md:order-2 glass p-4 rounded-xl border border-outline-variant/20 aspect-square grid grid-cols-8 grid-rows-8 gap-1"
        >
          {Array.from({ length: 64 }).map((_, idx) => {
            const isNexus = idx >= 9 && idx <= 13;
            const nexusChars = ['N', 'E', 'X', 'U', 'S'];
            return (
              <div 
                key={idx} 
                className={cn(
                  "rounded-sm flex items-center justify-center font-headline text-[10px]",
                  isNexus ? "bg-secondary/40 text-on-surface" : "bg-surface-container-highest"
                )}
              >
                {isNexus ? nexusChars[idx - 9] : ''}
              </div>
            );
          })}
        </motion.div>
      </section>

      {/* Final Actions */}
      <section className="flex flex-col md:flex-row gap-4 justify-center items-center py-8">
        <button 
          onClick={onRematch}
          className="w-full md:w-auto px-8 h-14 bg-gradient-to-br from-primary to-primary-container text-black font-headline font-bold rounded-xl active:scale-95 transition-transform uppercase tracking-widest"
        >
          REMATCH
        </button>
        <button 
          onClick={onNewGame}
          className="w-full md:w-auto px-8 h-14 bg-surface-container-highest border border-secondary/20 text-on-surface font-headline font-bold rounded-xl active:scale-95 transition-transform flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          <Plus size={18} />
          NEW GAME
        </button>
        <button className="w-full md:w-auto px-8 h-14 bg-transparent border border-outline-variant/40 text-on-surface-variant font-headline font-bold rounded-xl hover:bg-surface-container-low transition-colors flex items-center justify-center gap-2 uppercase tracking-widest">
          <Share2 size={18} />
          SHARE STATS
        </button>
      </section>
    </div>
  );
};
