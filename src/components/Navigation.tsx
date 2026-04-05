import React from 'react';
import { LayoutGrid, Sword, BarChart3, MessageSquare } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Screen } from '@/src/types';

interface NavbarProps {
  currentScreen: Screen;
  onScreenChange: (screen: Screen) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentScreen, onScreenChange }) => {
  const navItems = [
    { id: 'DASHBOARD', label: 'DASHBOARD', icon: LayoutGrid },
    { id: 'BATTLE', label: 'BATTLE', icon: Sword },
    { id: 'INTEL', label: 'INTEL', icon: BarChart3 },
    { id: 'COMMS', label: 'COMMS', icon: MessageSquare },
  ];

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-6 pt-2 bg-background/40 backdrop-blur-md border-t border-outline-variant/20 md:hidden">
      {navItems.map((item) => {
        const isActive = currentScreen === item.id || (item.id === 'BATTLE' && (currentScreen === 'DEPLOYMENT' || currentScreen === 'VICTORY'));
        const Icon = item.icon;
        
        return (
          <button
            key={item.id}
            onClick={() => onScreenChange(item.id as Screen)}
            className={cn(
              "flex flex-col items-center justify-center p-2 transition-all duration-150 active:scale-90",
              isActive 
                ? "bg-gradient-to-br from-primary/80 to-primary text-black rounded-lg" 
                : "text-on-surface/40 hover:text-tertiary"
            )}
          >
            <Icon size={20} className={cn("mb-1", isActive && "fill-current")} />
            <span className="font-label text-[10px] font-bold tracking-[0.1em]">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export const DesktopHeader: React.FC<NavbarProps> = ({ currentScreen, onScreenChange }) => {
  const navItems = ['DASHBOARD', 'BATTLE', 'INTEL', 'COMMS'];

  return (
    <header className="fixed top-0 w-full bg-background/80 backdrop-blur-xl z-50 flex justify-between items-center px-6 h-16 shadow-[0px_24px_48px_rgba(188,131,255,0.08)]">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl overflow-hidden border border-outline-variant/30">
          <img 
            alt="Player Avatar" 
            className="w-full h-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC7NIYjICQdjMbHA5sP7Os8xmWlcfYAm8YNxlw3R--OW0WoC8JH2D-Yiz_VPrajpEUL_vM_utKRgl1i5UfL90JZkkaheMTVzRArLbhXITgItNLG6HXGooHWEY6GbRxRwjlrmzht2Lc0XZ1Dr6jFZ5lAmfCWZd_lXAQVD0oHZpIfsAOpoZrxrwAloFvmCAIP9I09PBIv1vZnin-45VDlYN46yLn3778Glby1N8V65mvAtID2_a39NM-uWOv82ZgkkhDhhAlrtCTJsIY" 
          />
        </div>
        <span className="text-xl font-bold tracking-tighter text-primary font-headline uppercase">LEXIGRID</span>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex gap-8 text-on-surface/60 font-label text-xs tracking-widest">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => onScreenChange(item as Screen)}
              className={cn(
                "transition-all cursor-pointer hover:text-tertiary",
                currentScreen === item && "text-primary"
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="bg-surface-container-highest px-3 py-1 rounded-lg border border-outline-variant/20">
          <span className="text-primary font-label text-sm font-bold tracking-widest">08:45</span>
        </div>
      </div>
    </header>
  );
};
