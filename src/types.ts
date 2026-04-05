export type Screen = 'DASHBOARD' | 'BATTLE' | 'DEPLOYMENT' | 'VICTORY';

export interface PlayerProfile {
  name: string;
  rank: string;
  level: number;
  totalWins: number;
  winRate: string;
  avatarUrl: string;
}

export interface WordTarget {
  id: string;
  word: string;
  status: 'LOCKED' | 'INTERCEPTING' | 'SECURED';
  foundLetters: string[];
}

export interface GridCell {
  x: number;
  y: number;
  letter: string | null;
  status: 'EMPTY' | 'HIT' | 'MISS' | 'ACTIVE';
}

export interface LeaderboardEntry {
  rank: string;
  name: string;
  score: string;
}
