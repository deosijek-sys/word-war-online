import React from 'react';
import { motion } from 'motion/react';
import { Shield, Swords, Users, Bot, Bolt, TrendingUp, ChevronRight } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { PlayerProfile, LeaderboardEntry, Screen } from '@/src/types';

interface DashboardProps {
  profile: PlayerProfile;
  leaderboard: LeaderboardEntry[];
  onStartGame: (mode: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ profile, leaderboard, onStartGame }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-12">
      {/* Hero Section */}
      <section className="lg:col-span-7 flex flex-col justify-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative group"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-primary to-tertiary rounded-full blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
          <div className="relative">
            <h1 className="font-headline text-7xl md:text-9xl font-extrabold tracking-tighter text-primary leading-none mb-4">
              LEXI<br /><span className="text-on-surface opacity-90">GRID</span>
            </h1>
            <div className="flex items-center gap-4 mb-8">
              <div className="h-[2px] w-12 bg-primary"></div>
              <p className="font-label uppercase tracking-[0.4em] text-tertiary text-sm">Tactical Word Warfare</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="relative aspect-video rounded-xl overflow-hidden glass border border-outline-variant/20 shadow-2xl"
        >
          <img 
            alt="LexiGrid Arena" 
            className="w-full h-full object-cover mix-blend-lighten opacity-60" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLk_yLkdX7DW4dyg-ft2jMXf7kFpBwhvQIg0HNY6tNNEu3UuRjowQegbhDaL75WXxmrb-5dmblLxApBsitoB4I25YgkdEmPCFgKqyQRwHhb_Exko_-3olR58_0fn4ht_Qj5e-YHyAKvnpRYPU9VkE-AbZzwj9LZj9lfjpBW60K2zyrK5Gij9tEZCaS4xaUu3V8_ONQItYLNwUj1qB0qt7BD-GMaLgYVP_7ZjHolUmYHbpYAPB4XNBm_vR7bHpFo6H_FmlkSOIjNcE" 
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent"></div>
          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex justify-between items-end">
              <div>
                <span className="font-label text-[10px] text-primary tracking-widest uppercase">System Status</span>
                <h3 className="font-headline text-2xl font-bold text-on-surface">OPERATIONAL</h3>
              </div>
              <div className="flex gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                <span className="w-2 h-2 rounded-full bg-primary/40"></span>
                <span className="w-2 h-2 rounded-full bg-primary/20"></span>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Menu & Profile */}
      <section className="lg:col-span-5 flex flex-col gap-6">
        {/* Profile Card */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="glass p-6 rounded-xl border border-outline-variant/10 relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Shield size={64} />
          </div>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 rounded-xl border-2 border-primary/50 p-1">
              <img 
                alt="Profile" 
                className="w-full h-full object-cover rounded-lg" 
                src={profile.avatarUrl} 
              />
            </div>
            <div>
              <h2 className="font-headline text-xl font-bold text-on-surface">{profile.name}</h2>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-secondary/20 text-secondary text-[10px] font-bold rounded border border-secondary/30 uppercase tracking-wider">RANK: {profile.rank}</span>
                <span className="text-on-surface-variant text-xs font-label">LVL {profile.level}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/10">
              <span className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase block mb-1">Total Wins</span>
              <span className="font-headline text-2xl font-bold text-primary">{profile.totalWins.toLocaleString()}</span>
            </div>
            <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant/10">
              <span className="font-label text-[10px] text-on-surface-variant tracking-widest uppercase block mb-1">Win Rate</span>
              <span className="font-headline text-2xl font-bold text-tertiary">{profile.winRate}</span>
            </div>
          </div>
        </motion.div>

        {/* Menu Options */}
        <nav className="flex flex-col gap-3">
          {[
            { id: 'online', label: '1v1 Online Multiplayer', icon: Swords },
            { id: 'local', label: 'Local Multiplayer', icon: Users },
            { id: 'solo', label: 'Solo (AI Words)', icon: Bot },
          ].map((item, idx) => (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + idx * 0.1 }}
              onClick={() => onStartGame(item.id)}
              className="group relative flex items-center justify-between p-5 rounded-xl bg-surface-container-highest border border-outline-variant/20 hover:border-primary/50 transition-all duration-300 active:scale-[0.98]"
            >
              <div className="flex items-center gap-4">
                <item.icon className="text-on-surface-variant group-hover:text-primary transition-colors" size={24} />
                <span className="font-headline font-bold text-lg tracking-tight">{item.label}</span>
              </div>
              <ChevronRight className="text-on-surface-variant group-hover:translate-x-1 transition-transform" size={20} />
            </motion.button>
          ))}

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            onClick={() => onStartGame('daily')}
            className="group relative flex items-center justify-between p-6 rounded-xl bg-gradient-to-br from-primary to-primary-container text-black shadow-[0_0_30px_rgba(202,253,0,0.3)] transition-all duration-300 active:scale-[0.98]"
          >
            <div className="flex items-center gap-4">
              <div className="bg-background/10 p-2 rounded-lg">
                <Bolt className="text-black font-bold" size={24} />
              </div>
              <div className="text-left">
                <span className="font-headline font-black text-xl tracking-tight leading-none block">Daily Challenge</span>
                <span className="text-[10px] font-label font-bold tracking-widest uppercase opacity-80">Refreshes in 4h 15m</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold font-label">+500 XP</span>
              <TrendingUp size={20} />
            </div>
          </motion.button>
        </nav>

        {/* Leaderboard Preview */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-4"
        >
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-label text-[10px] tracking-[0.2em] text-on-surface-variant uppercase">Global Leaderboard</h4>
            <span className="text-[10px] text-tertiary cursor-pointer hover:underline">VIEW ALL</span>
          </div>
          <div className="flex flex-col gap-2">
            {leaderboard.map((entry, idx) => (
              <div 
                key={idx}
                className={cn(
                  "flex items-center justify-between px-4 py-2 bg-surface-container-low rounded-lg border-l-2",
                  idx === 0 ? "border-primary/40" : "border-transparent"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("font-label text-xs font-bold", idx === 0 ? "text-primary" : "text-on-surface-variant")}>{entry.rank}</span>
                  <span className="text-xs font-medium">{entry.name}</span>
                </div>
                <span className="font-label text-xs text-on-surface-variant">{entry.score}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>
    </div>
  );
};
