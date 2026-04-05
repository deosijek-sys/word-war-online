import React from 'react';
import { motion } from 'motion/react';
import { RotateCw, Undo2, CheckCircle2, Info, RefreshCw } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { GridCell } from '@/src/types';

interface DeploymentProps {
  grid: GridCell[];
  onFinalize: () => void;
  onReset: () => void;
}

export const Deployment: React.FC<DeploymentProps> = ({ grid, onFinalize, onReset }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-12">
      {/* Left: Deployment Intelligence */}
      <aside className="lg:col-span-3 space-y-6 order-2 lg:order-1">
        <div className="glass rounded-xl p-6 border border-outline-variant/20">
          <h2 className="font-headline text-xs font-bold tracking-[0.2em] text-tertiary mb-6">DEPLOYMENT INTEL</h2>
          <div className="space-y-4">
            {[
              { name: 'CYPHER', units: 6, status: 'READY FOR PLACEMENT', active: false, completed: true },
              { name: 'VOXEL', units: 5, status: 'PLACING...', active: true, completed: false },
              { name: 'GRID', units: 4, status: 'QUEUEING', active: false, completed: false },
              { name: 'HEX', units: 3, status: 'QUEUEING', active: false, completed: false },
            ].map((word) => (
              <div 
                key={word.name}
                className={cn(
                  "p-4 rounded-lg border-l-4 transition-all active:scale-95",
                  word.completed ? "bg-surface-container-highest/60 border-primary" : 
                  word.active ? "bg-surface-container-high border-tertiary" :
                  "bg-surface-container-low/40 border-outline-variant/40 opacity-60"
                )}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={cn("font-headline text-lg font-bold tracking-tight", word.completed || word.active ? "text-on-surface" : "text-on-surface-variant")}>
                    {word.name}
                  </span>
                  <span className={cn(
                    "font-label text-[10px] px-2 py-0.5 rounded",
                    word.completed ? "text-primary bg-primary/10" : 
                    word.active ? "text-tertiary bg-tertiary/10" : 
                    "text-on-surface-variant bg-surface-container-highest"
                  )}>
                    {word.units} UNITS
                  </span>
                </div>
                <div className={cn(
                  "flex items-center gap-2 text-xs",
                  word.completed ? "text-on-surface-variant" : 
                  word.active ? "text-tertiary" : 
                  "text-on-surface-variant/40"
                )}>
                  {word.completed ? <CheckCircle2 size={14} /> : word.active ? <RefreshCw size={14} className="animate-spin" /> : <Info size={14} />}
                  <span className="font-label uppercase tracking-widest">{word.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 rounded-xl bg-surface-container-low border border-outline-variant/10">
          <h3 className="font-headline text-[10px] font-bold tracking-[0.2em] text-on-surface-variant mb-4 uppercase">Operational Protocol</h3>
          <ul className="space-y-3">
            {[
              "Words must not intersect or touch adjacent cells.",
              "Full 10x10 perimeter is active for deployment.",
              "Tap to rotate word before confirmation."
            ].map((rule, idx) => (
              <li key={idx} className="flex gap-3 text-xs text-on-surface-variant">
                <span className="text-secondary font-bold font-headline">0{idx + 1}</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Center: Tactical Grid */}
      <section className="lg:col-span-6 order-1 lg:order-2">
        <div className="relative">
          <div className="flex justify-between px-8 mb-2 font-label text-[10px] text-on-surface-variant/40">
            {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].map(l => <span key={l}>{l}</span>)}
          </div>
          <div className="flex">
            <div className="flex flex-col justify-between py-8 mr-2 font-label text-[10px] text-on-surface-variant/40">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => <span key={n}>{n}</span>)}
            </div>
            <div className="grid grid-cols-10 grid-rows-10 gap-1 w-full aspect-square p-2 bg-surface-container-low rounded-xl border border-outline-variant/20 shadow-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-tertiary/5 to-transparent h-20 w-full top-[-5rem] opacity-20 pointer-events-none"></div>
              {grid.map((cell, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "rounded-sm transition-all duration-300 flex items-center justify-center font-headline font-bold text-sm",
                    cell.status === 'ACTIVE' ? "bg-tertiary/20 border border-tertiary/40 text-tertiary shadow-[inset_0_0_10px_rgba(143,245,255,0.3)]" :
                    cell.status === 'HIT' ? "bg-primary/40 border border-primary/60 text-on-primary-container" :
                    "bg-surface-container-highest/30"
                  )}
                >
                  {cell.letter}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex justify-between items-center bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
          <div className="flex gap-4">
            <button className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-surface-container-highest text-tertiary border border-tertiary/20 hover:bg-tertiary/10 transition-colors">
              <RotateCw size={20} />
              <span className="font-label text-[8px] mt-1 uppercase">ROTATE</span>
            </button>
            <button className="flex flex-col items-center justify-center w-14 h-14 rounded-lg bg-surface-container-highest text-on-surface-variant/60 border border-outline-variant/20 cursor-not-allowed">
              <Undo2 size={20} />
              <span className="font-label text-[8px] mt-1 uppercase">REVERT</span>
            </button>
          </div>
          <div className="text-right">
            <p className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Grid Status</p>
            <div className="flex items-center gap-2 text-tertiary">
              <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>
              <span className="font-headline font-bold text-sm tracking-tight">STABLE DEPLOYMENT</span>
            </div>
          </div>
        </div>
      </section>

      {/* Right: Tactical Dashboard */}
      <aside className="lg:col-span-3 space-y-6 order-3">
        <div className="glass rounded-xl p-6 border border-outline-variant/20">
          <h2 className="font-headline text-xs font-bold tracking-[0.2em] text-secondary mb-6">VALIDATION ENGINE</h2>
          <div className="space-y-6">
            {[
              { label: 'OVERLAP CHECK', status: 'CLEAR', color: 'text-primary', progress: 100 },
              { label: 'ADJACENCY SCAN', status: 'CLEAR', color: 'text-primary', progress: 100 },
              { label: 'GRID INTEGRITY', status: 'CALCULATING', color: 'text-secondary', progress: 66 },
            ].map((check) => (
              <div key={check.label} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-label text-xs text-on-surface-variant">{check.label}</span>
                  <span className={cn("font-headline text-sm font-bold", check.color)}>{check.status}</span>
                </div>
                <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all duration-500", check.color.replace('text-', 'bg-'))} 
                    style={{ width: `${check.progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <button 
            onClick={onFinalize}
            className="w-full py-4 rounded-xl bg-gradient-to-br from-primary to-primary-container text-black font-headline font-bold tracking-widest uppercase text-sm shadow-[0_0_20px_rgba(202,253,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all"
          >
            Finalize Grid
          </button>
          <button 
            onClick={onReset}
            className="w-full py-4 rounded-xl bg-surface-container-highest border border-secondary/20 text-secondary font-headline font-bold tracking-widest uppercase text-sm hover:bg-secondary/5 transition-all"
          >
            Reset Deployment
          </button>
        </div>

        <div className="aspect-video rounded-xl overflow-hidden relative border border-outline-variant/20 group">
          <img 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBhoV2Vo51t7NBzhYh3K7nNKj1vXOuT1KBX3DwmJ9Ps2NDlsixPLBWe4g6JdRd98JMsjb7eLVRX3XS33v9EUmpvRsmYk-ziU6YZA7Lc210bNz3Tyr7PCKsawLFGkv0BdGPNs5S9FKqZyl77c6fFMQUDO9aqoQtuVSrkc5sr2p8ILRzK-fIvsPB_L-VeEr9CBFE_ZF7qffLJcE_1tjH3Kz-jfPW6EGeBlgAru1tWWRTihsH4cqsdrEL-qz4lpFT_hDWzCtcwSuHE8mY" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-60"></div>
          <div className="absolute bottom-4 left-4">
            <p className="font-label text-[10px] text-tertiary tracking-widest">LIVE HUD PREVIEW</p>
            <p className="font-headline text-xs text-on-surface/80">SECTOR 7G ANALYSIS</p>
          </div>
        </div>
      </aside>
    </div>
  );
};
