import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, X, Settings, Zap, TrendingUp } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GridCell, WordTarget } from '@/src/types';

interface BattleProps {
  grid: GridCell[];
  targets: WordTarget[];
  score: number;
  turn: string;
  onGuess: (guess: string) => void;
}

export const Battle: React.FC<BattleProps> = ({ grid, targets, score, turn, onGuess }) => {
  const [inputValue, setInputValue] = React.useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onGuess(inputValue.toUpperCase());
      setInputValue('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-12">
      {/* Left/Center Column: Tactical Grid */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Top Stats/Turn Indicator */}
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="font-label text-[10px] tracking-[0.2em] text-secondary uppercase mb-1">Combat Status</span>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-primary animate-pulse shadow-[0_0_8px_#cafd00]"></div>
              <h2 className="font-headline text-2xl font-bold tracking-tight">{turn}</h2>
            </div>
          </div>
          <div className="text-right">
            <span className="font-label text-[10px] tracking-[0.2em] text-on-surface-variant uppercase mb-1">Grid Score</span>
            <div className="font-headline text-4xl font-extrabold text-primary tracking-tighter">{score.toLocaleString()}</div>
          </div>
        </div>

        {/* 10x10 Tactical Word Grid */}
        <div className="glass p-4 md:p-6 aspect-square max-w-[600px] mx-auto w-full grid grid-cols-10 grid-rows-10 gap-1 md:gap-2 rounded-xl">
          {grid.map((cell, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.005 }}
              className={cn(
                "w-full h-full rounded-sm border flex items-center justify-center font-headline font-bold text-sm md:text-base transition-all duration-300",
                cell.status === 'EMPTY' && "bg-surface-container-low/40 border-outline-variant/10",
                cell.status === 'MISS' && "bg-surface-container-highest/20 border-outline-variant/30",
                cell.status === 'HIT' && "bg-secondary-container/40 border-secondary shadow-[0_0_15px_rgba(188,131,255,0.3)] text-on-surface",
                cell.status === 'ACTIVE' && "bg-primary/20 border-primary shadow-[0_0_15px_rgba(202,253,0,0.3)] text-primary"
              )}
            >
              {cell.status === 'MISS' ? (
                <X size={12} className="text-outline-variant" />
              ) : (
                cell.letter
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Right Panel: Hidden Words Progress */}
      <aside className="lg:col-span-4 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="font-label text-[10px] tracking-[0.2em] text-tertiary uppercase">Target Intel</span>
          <h3 className="font-headline text-xl font-bold">REMAINING_UPLINKS</h3>
        </div>

        <div className="flex flex-col gap-4">
          {targets.map((target) => (
            <div 
              key={target.id}
              className={cn(
                "glass rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden transition-all duration-300",
                target.status === 'SECURED' ? "border-secondary/40" : "border-outline-variant/20",
                target.status === 'LOCKED' && "opacity-60"
              )}
            >
              {target.status === 'SECURED' && (
                <div className="absolute top-0 right-0 p-2 bg-secondary/20 rounded-bl-xl">
                  <CheckCircle2 size={14} className="text-secondary" />
                </div>
              )}
              <span className={cn(
                "font-label text-[10px] tracking-widest font-bold",
                target.status === 'SECURED' ? "text-secondary" : "text-on-surface-variant"
              )}>
                {target.id} [{target.status}]
              </span>
              <div className="flex gap-1.5 mt-1">
                {target.word.split('').map((char, idx) => (
                  <span 
                    key={idx}
                    className={cn(
                      "w-8 h-10 border-b-2 flex items-center justify-center font-headline text-xl font-bold",
                      target.status === 'SECURED' ? "border-secondary text-secondary" : 
                      target.status === 'INTERCEPTING' && target.foundLetters.includes(char) ? "border-primary text-primary" :
                      "border-outline-variant/40 text-on-surface-variant"
                    )}
                  >
                    {target.status === 'SECURED' || (target.status === 'INTERCEPTING' && target.foundLetters.includes(char)) ? char : '_'}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Tactical Action Tip */}
        <div className="mt-auto bg-surface-container-high/50 p-4 rounded-xl border-l-4 border-tertiary">
          <p className="text-sm text-on-surface-variant italic leading-relaxed">
            <span className="font-bold text-tertiary">PRO-TIP:</span> Grid cells highlighted in cyan indicate secondary word intersections. Use tactical strikes to reveal adjacent sectors.
          </p>
        </div>
      </aside>

      {/* Bottom Action Console */}
      <div className="fixed bottom-20 left-0 w-full px-6 md:px-12 z-40">
        <form 
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto glass border border-primary/20 rounded-2xl p-3 md:p-4 shadow-2xl flex flex-col md:flex-row gap-4 items-center"
        >
          <div className="relative w-full">
            <span className="absolute -top-3 left-4 px-2 bg-background text-[10px] font-label font-bold tracking-widest text-primary uppercase">System Ready</span>
            <input 
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="w-full bg-transparent border-b border-outline-variant focus:border-primary focus:ring-0 text-primary font-headline text-lg tracking-widest py-3 px-2 transition-colors uppercase placeholder:text-on-surface-variant/30 outline-none" 
              placeholder="ENTER TACTICAL GUESS..." 
              type="text"
            />
          </div>
          <button 
            type="submit"
            className="w-full md:w-auto px-10 py-4 bg-gradient-to-br from-primary/80 to-primary text-black font-headline font-extrabold text-sm tracking-widest rounded-xl hover:scale-[1.02] active:scale-95 transition-all shadow-lg neon-glow-primary whitespace-nowrap uppercase"
          >
            Execute Guess
          </button>
        </form>
      </div>
    </div>
  );
};
