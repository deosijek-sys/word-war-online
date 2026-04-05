import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2, Copy, Crown, LoaderCircle, LogIn, PlusCircle,
  RotateCw, Send, Shield, Swords, Target, User, Zap, XCircle, MessageSquare,
} from 'lucide-react';

type Orientation = 'horizontal' | 'vertical';
type SetupWord = { id: string; length: number; value: string; placement?: Placement; };
type Placement = { row: number; col: number; orientation: Orientation; cells: number[]; };
type PublicWordState = { id: string; length: number; guessed: boolean; revealed: string[]; };
type ChatMessage = { id: string; playerId: string; playerName: string; text: string; createdAt: number; };
type RoomSummary = {
  code: string;
  status: 'waiting' | 'setup' | 'battle' | 'finished';
  turn: string | null;
  winnerId: string | null;
  players: Array<{ id: string; name: string; ready: boolean; connected: boolean; score: number; moves: number; }>;
  viewerId: string;
  enemyGrid: Array<'unknown' | 'miss' | 'hit' | 'secured'>;
  yourDefenseGrid: Array<'empty' | 'occupied' | 'miss' | 'hit' | 'secured'>;
  yourWords: PublicWordState[];
  opponentWords: PublicWordState[];
  messages: Array<{ id: string; text: string; kind: 'info' | 'success' | 'error' }>;
  chat: ChatMessage[];
};
type Auth = { roomCode: string; playerId: string; token: string };
type Toast = { kind: 'success' | 'error' | 'info'; text: string };

const GRID_SIZE = 10;
const DEFAULT_WORDS: SetupWord[] = [
  { id: 'W6', length: 6, value: '' },
  { id: 'W5', length: 5, value: '' },
  { id: 'W4', length: 4, value: '' },
  { id: 'W3', length: 3, value: '' },
];
const LETTERS = Array.from({ length: GRID_SIZE }, (_, i) => String.fromCharCode(65 + i));

function toIndex(row: number, col: number) { return row * GRID_SIZE + col; }
function fromIndex(index: number) { return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE }; }
function normalizeWord(v: string) { return v.toUpperCase().replace(/[^A-ZČĆŽŠĐ]/g, '').trim(); }

function getPlacementCells(row: number, col: number, length: number, orientation: Orientation) {
  const cells: number[] = [];
  for (let i = 0; i < length; i++) {
    const r = orientation === 'vertical' ? row + i : row;
    const c = orientation === 'horizontal' ? col + i : col;
    if (r >= GRID_SIZE || c >= GRID_SIZE) return null;
    cells.push(toIndex(r, c));
  }
  return cells;
}

function getAdjacentCells(index: number) {
  const { row, col } = fromIndex(index);
  const around: number[] = [];
  for (let r = row - 1; r <= row + 1; r++) for (let c = col - 1; c <= col + 1; c++) {
    if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) continue;
    around.push(toIndex(r, c));
  }
  return around;
}

function canPlaceWord(word: SetupWord, row: number, col: number, orientation: Orientation, placedWords: SetupWord[]) {
  const cells = getPlacementCells(row, col, word.length, orientation);
  if (!cells) return { valid: false, cells: [] as number[] };
  const occupied = new Set<number>(); const blocked = new Set<number>();
  placedWords.filter((w) => w.id !== word.id && w.placement).forEach((w) => {
    w.placement?.cells.forEach((cell) => { occupied.add(cell); getAdjacentCells(cell).forEach((adj) => blocked.add(adj)); });
  });
  return { valid: cells.every((cell) => !occupied.has(cell) && !blocked.has(cell)), cells };
}

function initialWords() { return DEFAULT_WORDS.map((w) => ({ ...w })); }

async function api<T>(path: string, options?: RequestInit) {
  const response = await fetch(path, { headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) }, ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Greška na serveru.');
  return data as T;
}

export default function App() {
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [auth, setAuth] = useState<Auth | null>(null);
  const [room, setRoom] = useState<RoomSummary | null>(null);
  const [words, setWords] = useState<SetupWord[]>(initialWords);
  const [orientation, setOrientation] = useState<Orientation>('horizontal');
  const [activeWordId, setActiveWordId] = useState('W6');
  const [hoverCells, setHoverCells] = useState<number[]>([]);
  const [hoverValid, setHoverValid] = useState(true);
  const [guessText, setGuessText] = useState('');
  const [guessTarget, setGuessTarget] = useState('W6');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [seenChatCount, setSeenChatCount] = useState(0);
  const [tab, setTab] = useState<'defense' | 'attack' | 'feed'>('defense');

  const setupInputRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const chatInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const s = localStorage.getItem('word-war-auth');
    if (s) { try { setAuth(JSON.parse(s)); } catch { localStorage.removeItem('word-war-auth'); } }
  }, []);

  useEffect(() => {
    if (!auth) return;
    let cancelled = false; let timer: number | undefined;
    const poll = async () => {
      try {
        const state = await api<RoomSummary>(`/api/rooms/${auth.roomCode}/state?playerId=${auth.playerId}&token=${auth.token}`);
        if (!cancelled) {
          setRoom(state);
          setGuessTarget((cur) => {
            const still = state.opponentWords.some((w) => w.id === cur && !w.guessed);
            return still ? cur : state.opponentWords.find((w) => !w.guessed)?.id ?? cur;
          });
        }
      } catch (e) { if (!cancelled) showToast({ kind: 'error', text: e instanceof Error ? e.message : 'Veza prekinuta.' }); }
      finally { if (!cancelled) timer = window.setTimeout(poll, 1200); }
    };
    poll();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [auth]);

  useEffect(() => { if (!toast) return; const t = window.setTimeout(() => setToast(null), 2600); return () => window.clearTimeout(t); }, [toast]);
  useEffect(() => { if (room?.status === 'battle') setTab('attack'); }, [room?.status]);

  // Auto-scroll chat to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setSeenChatCount(room?.chat.length ?? 0);
  }, [room?.chat.length]);

  const activeWord = words.find((w) => w.id === activeWordId) ?? words[0];
  const selectedCells = activeWord?.placement?.cells ?? [];
  const defenseLetters = useMemo(() => {
    const map: Record<number, string> = {};
    words.forEach((word) => {
      if (!word.placement) return;
      word.placement.cells.forEach((cell, i) => { if (word.value[i]) map[cell] = word.value[i]; });
    });
    return map;
  }, [words]);

  const placementDone = words.every((w) => w.placement && w.value.length === w.length);
  const canSubmitSetup = placementDone && auth && room && room.status !== 'battle';
  const inBattle = room?.status === 'battle' || room?.status === 'finished';
  const isYourTurn = room?.turn === auth?.playerId;
  const enemyName = useMemo(() => room && auth ? (room.players.find((p) => p.id !== auth.playerId)?.name ?? 'Protivnik') : 'Protivnik', [room, auth]);
  const yourPlayer = room?.players.find((p) => p.id === auth?.playerId) ?? null;
  const enemyPlayer = room?.players.find((p) => p.id !== auth?.playerId) ?? null;
  const opponentGuessable = room?.opponentWords.filter((w) => !w.guessed) ?? [];
  const unreadChat = Math.max(0, (room?.chat.length ?? 0) - seenChatCount);

  function persistAuth(next: Auth | null) {
    setAuth(next);
    if (next) localStorage.setItem('word-war-auth', JSON.stringify(next));
    else localStorage.removeItem('word-war-auth');
  }
  function showToast(next: Toast) { setToast(next); }

  async function createRoom() {
    if (!name.trim()) { showToast({ kind: 'error', text: 'Upiši ime.' }); return; }
    setBusy(true);
    try { const d = await api<Auth>('/api/rooms', { method: 'POST', body: JSON.stringify({ name: name.trim() }) }); persistAuth(d); setWords(initialWords()); showToast({ kind: 'success', text: 'Soba kreirana!' }); }
    catch (e) { showToast({ kind: 'error', text: e instanceof Error ? e.message : 'Greška.' }); }
    finally { setBusy(false); }
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) { showToast({ kind: 'error', text: 'Upiši ime i kod.' }); return; }
    setBusy(true);
    try { const d = await api<Auth>(`/api/rooms/${joinCode.trim().toUpperCase()}/join`, { method: 'POST', body: JSON.stringify({ name: name.trim() }) }); persistAuth(d); setWords(initialWords()); showToast({ kind: 'success', text: 'Spojeno!' }); }
    catch (e) { showToast({ kind: 'error', text: e instanceof Error ? e.message : 'Greška.' }); }
    finally { setBusy(false); }
  }

  function updateWord(id: string, value: string) {
    setWords((cur) => cur.map((w) => w.id === id ? { ...w, value: normalizeWord(value).slice(0, w.length) } : w));
  }

  function clearActiveWord() {
    if (!activeWord) return;
    setWords((cur) => cur.map((w) => w.id === activeWord.id ? { ...w, value: '', placement: undefined } : w));
    setHoverCells([]);
    setTimeout(() => setupInputRef.current?.focus(), 30);
  }

  // Click on grid = place active word there (word can be empty, user types after)
  function placeWord(row: number, col: number) {
    if (!activeWord || room?.status !== 'setup') return;
    const result = canPlaceWord(activeWord, row, col, orientation, words);
    if (!result.valid) { showToast({ kind: 'error', text: 'Nije validno — preklapanje ili dodir.' }); return; }
    setWords((cur) => cur.map((w) => w.id === activeWord.id
      ? { ...w, placement: { row, col, orientation, cells: result.cells } } : w));
    setHoverCells(result.cells);
    setHoverValid(true);
    setTimeout(() => setupInputRef.current?.focus(), 30);
  }

  function handleSetupInput(value: string) {
    if (!activeWord) return;
    updateWord(activeWord.id, value);
    const normalized = normalizeWord(value).slice(0, activeWord.length);
    if (normalized.length === activeWord.length && activeWord.placement) {
      const idx = words.findIndex((w) => w.id === activeWord.id);
      const next = words.slice(idx + 1).find((w) => !w.placement) ?? words.find((w) => !w.placement && w.id !== activeWord.id);
      if (next) {
        setActiveWordId(next.id);
        showToast({ kind: 'success', text: `✓ ${activeWord.length} slova — klikni polje za sljedeću` });
      } else {
        showToast({ kind: 'success', text: 'Sve riječi postavljene!' });
      }
    }
  }

  function onHover(index: number) {
    if (!activeWord) return;
    const { row, col } = fromIndex(index);
    const r = canPlaceWord(activeWord, row, col, orientation, words);
    setHoverCells(r.cells); setHoverValid(r.valid);
  }

  async function submitSetup() {
    if (!canSubmitSetup || !auth) return;
    setBusy(true);
    try { await api(`/api/rooms/${auth.roomCode}/setup`, { method: 'POST', body: JSON.stringify({ playerId: auth.playerId, token: auth.token, words: words.map((w) => ({ id: w.id, value: w.value, placement: w.placement })) }) }); showToast({ kind: 'success', text: 'Zaključano!' }); }
    catch (e) { showToast({ kind: 'error', text: e instanceof Error ? e.message : 'Greška.' }); }
    finally { setBusy(false); }
  }

  async function attackCell(index: number) {
    if (!auth || !room || !isYourTurn || room.status !== 'battle' || room.enemyGrid[index] !== 'unknown') return;
    setBusy(true);
    try { const r = await api<{ message: string }>(`/api/rooms/${auth.roomCode}/attack`, { method: 'POST', body: JSON.stringify({ playerId: auth.playerId, token: auth.token, index }) }); showToast({ kind: 'info', text: r.message }); }
    catch (e) { showToast({ kind: 'error', text: e instanceof Error ? e.message : 'Greška.' }); }
    finally { setBusy(false); }
  }

  async function submitGuess() {
    if (!auth || !room || !isYourTurn || !guessText.trim()) return;
    setBusy(true);
    try { const r = await api<{ message: string }>(`/api/rooms/${auth.roomCode}/guess`, { method: 'POST', body: JSON.stringify({ playerId: auth.playerId, token: auth.token, wordId: guessTarget, guess: normalizeWord(guessText) }) }); setGuessText(''); showToast({ kind: 'success', text: r.message }); }
    catch (e) { showToast({ kind: 'error', text: e instanceof Error ? e.message : 'Greška.' }); }
    finally { setBusy(false); }
  }

  async function sendChat() {
    if (!auth || !chatInput.trim()) return;
    const text = chatInput.trim();
    setChatInput('');
    try { await api(`/api/rooms/${auth.roomCode}/chat`, { method: 'POST', body: JSON.stringify({ playerId: auth.playerId, token: auth.token, text }) }); }
    catch (e) { showToast({ kind: 'error', text: e instanceof Error ? e.message : 'Chat greška.' }); }
  }

  async function restartMatch() {
    if (!auth) return;
    setBusy(true);
    try { await api(`/api/rooms/${auth.roomCode}/restart`, { method: 'POST', body: JSON.stringify({ playerId: auth.playerId, token: auth.token }) }); setWords(initialWords()); setTab('defense'); showToast({ kind: 'success', text: 'Nova runda!' }); }
    catch (e) { showToast({ kind: 'error', text: e instanceof Error ? e.message : 'Greška.' }); }
    finally { setBusy(false); }
  }

  function leaveRoom() {
    persistAuth(null); setRoom(null); setWords(initialWords());
    setGuessText(''); setChatInput(''); setJoinCode('');
    setHoverCells([]); setHoverValid(true); setTab('defense'); setSeenChatCount(0);
  }

  // ── LOBBY ──────────────────────────────────────────────────────────────────
  if (!auth || !room) return (
    <div className="shell lobby-shell">
      <div className="orb orb-a" /><div className="orb orb-b" /><div className="orb orb-c" />
      <div className="lobby-center">
        <div className="lobby-logo">
          <div className="logo-icon"><Swords size={26} /></div>
          <div><div className="logo-eye">ONLINE MULTIPLAYER</div><div className="logo-title">Word War</div></div>
        </div>
        <div className="lobby-grid">
          <div className="lpanel">
            <div className="lpanel-head"><User size={15} /> Ime igrača</div>
            <input className="big-input" placeholder="Upiši ime…" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createRoom()} />
            <button className="btn-primary" onClick={createRoom} disabled={busy || !name.trim()}>
              {busy ? <LoaderCircle className="spin" size={15} /> : <PlusCircle size={15} />} Kreiraj sobu
            </button>
          </div>
          <div className="ldivider">ILI</div>
          <div className="lpanel">
            <div className="lpanel-head"><Swords size={15} /> Kod sobe</div>
            <input className="big-input code-input" placeholder="UPIŠI KOD…" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && joinRoom()} />
            <button className="btn-secondary" onClick={joinRoom} disabled={busy || !name.trim() || !joinCode.trim()}>
              {busy ? <LoaderCircle className="spin" size={15} /> : <LogIn size={15} />} Spoji se
            </button>
          </div>
        </div>
        <div className="lobby-hints">
          <span>🎯 Sakrij 4 riječi</span><span>💥 Gađaj polja</span><span>⚡ Riskiraj guess</span>
        </div>
      </div>
      {toast && <div className={`toast toast-${toast.kind}`}>{toast.text}</div>}
    </div>
  );

  const statusText =
    room.status === 'waiting' ? 'Čeka se protivnik…' :
    room.status === 'setup' ? 'Postavljanje' :
    room.status === 'battle' ? (isYourTurn ? '⚡ Tvoj potez!' : `${enemyName} na potezu…`) :
    room.winnerId === auth.playerId ? '🏆 Pobjeda!' : '💀 Poraz';

  // ── GAME LAYOUT ────────────────────────────────────────────────────────────
  return (
    <div className="shell game-shell">
      <div className="orb orb-a" /><div className="orb orb-b" />

      {/* HEADER */}
      <header className="ghdr">
        <div className="ghdr-brand"><Swords size={16} /> Word War</div>
        <div className="ghdr-players">
          <div className={`hplr ${isYourTurn ? 'hplr-you' : ''}`}>
            <span className="hplr-name">{yourPlayer?.name ?? 'Ti'}</span>
            <span className="hplr-score">{yourPlayer?.score ?? 0}</span>
          </div>
          <div className={`hstatus ${room.status === 'battle' && isYourTurn ? 'hstatus-pulse' : ''}`}>{statusText}</div>
          <div className={`hplr hplr-enemy ${!isYourTurn && room.status === 'battle' ? 'hplr-you' : ''}`}>
            <span className="hplr-score">{enemyPlayer?.score ?? 0}</span>
            <span className="hplr-name">{enemyPlayer?.name ?? 'Protivnik'}</span>
          </div>
        </div>
        <div className="ghdr-actions">
          <button className="icon-btn" onClick={() => navigator.clipboard.writeText(auth.roomCode)}><Copy size={14} /> {auth.roomCode}</button>
          <button className="icon-btn" onClick={leaveRoom}><LogIn size={14} /></button>
        </div>
      </header>

      {/* MAIN: tabs + content + chat */}
      <div className="game-body">

        {/* LEFT: tabs + tab content */}
        <div className="game-main">
          <nav className="gtabs">
            <button className={`gtab ${tab === 'defense' ? 'gtab-on' : ''}`} onClick={() => setTab('defense')}>
              <Shield size={14} /> Obrana
              {words.filter((w) => w.placement).length < 4 && room.status === 'setup' && <span className="tbadge tbadge-warn" />}
            </button>
            <button className={`gtab ${tab === 'attack' ? 'gtab-on' : ''}`} onClick={() => setTab('attack')}>
              <Zap size={14} /> Napad
              {isYourTurn && room.status === 'battle' && <span className="tbadge tbadge-pulse" />}
            </button>
            <button className={`gtab ${tab === 'feed' ? 'gtab-on' : ''}`} onClick={() => setTab('feed')}>
              <Crown size={14} /> Tijek
            </button>
          </nav>

          {/* ── DEFENSE ── */}
          {tab === 'defense' && (
            <div className="tcontent">
              <div className="def-layout">
                <aside className="def-aside">
                  <div className="aside-title">
                    {words.filter((w) => w.placement && w.value.length === w.length).length < 4
                      ? `Postavi ${4 - words.filter((w) => w.placement && w.value.length === w.length).length} ${4 - words.filter((w) => w.placement && w.value.length === w.length).length === 1 ? 'riječ' : 'riječi'}`
                      : '✓ Sve postavljeno'}
                  </div>

                  {/* Word selector pills */}
                  <div className="word-pills">
                    {words.map((word) => (
                      <button
                        key={word.id}
                        className={`word-pill ${activeWordId === word.id ? 'word-pill-active' : ''} ${word.placement && word.value.length === word.length ? 'word-pill-done' : ''}`}
                        onClick={() => { setActiveWordId(word.id); setHoverCells([]); }}
                        disabled={inBattle}
                      >
                        {word.placement && word.value.length === word.length
                          ? <CheckCircle2 size={12} />
                          : <XCircle size={12} />}
                        {word.length} slova
                      </button>
                    ))}
                  </div>

                  {/* Active word input — shown after cell click */}
                  <div className="active-word-box">
                    <div className="active-word-meta">
                      <span className="active-word-label">
                        {activeWord.placement
                          ? `📍 ${LETTERS[activeWord.placement.col]}${activeWord.placement.row + 1} ${activeWord.placement.orientation === 'horizontal' ? '→' : '↓'}`
                          : activeWord.value.length === activeWord.length ? '👉 Klikni grid za postavljanje' : `✏️ Upiši ${activeWord.length} slova`}
                      </span>
                      <span className="active-word-len">{activeWord.value.length}/{activeWord.length}</span>
                    </div>
                    <input
                      ref={setupInputRef}
                      className="word-input"
                      value={activeWord.value}
                      onChange={(e) => handleSetupInput(e.target.value)}
                      placeholder={`${activeWord.length} slova…`}
                      disabled={inBattle}
                      maxLength={activeWord.length}
                      autoCapitalize="characters"
                      autoCorrect="off"
                      autoComplete="off"
                      spellCheck={false}
                    />
                    <div className="letter-chips">
                      {Array.from({ length: activeWord.length }, (_, i) => (
                        <span key={i} className={`lchip ${activeWord.value[i] ? 'lchip-filled' : ''}`}>
                          {activeWord.value[i] ?? '·'}
                        </span>
                      ))}
                    </div>
                    <button className="clear-btn" onClick={clearActiveWord} disabled={inBattle || (!activeWord.value && !activeWord.placement)}>
                      ✕ Očisti
                    </button>
                  </div>

                  <div className="orient-row">
                    <button className={`obtn ${orientation === 'horizontal' ? 'obtn-on' : ''}`} onClick={() => setOrientation('horizontal')} disabled={inBattle}>↔ Vodoravno</button>
                    <button className={`obtn ${orientation === 'vertical' ? 'obtn-on' : ''}`} onClick={() => setOrientation('vertical')} disabled={inBattle}>↕ Okomito</button>
                  </div>

                  <button className="btn-primary" style={{ width: '100%' }} disabled={!canSubmitSetup || busy} onClick={submitSetup}>
                    {busy ? <LoaderCircle className="spin" size={15} /> : <Send size={15} />} Zaključaj
                  </button>
                  {room.status === 'finished' && (
                    <button className="btn-secondary" style={{ width: '100%', marginTop: 8 }} onClick={restartMatch} disabled={busy}>
                      <RotateCw size={15} /> Nova runda
                    </button>
                  )}
                </aside>

                <div className="grid-area">
                  <Grid
                    mode="defense" cells={room.yourDefenseGrid}
                    hoverCells={room.status === 'setup' ? hoverCells : []} hoverValid={hoverValid}
                    selectedCells={room.status === 'setup' ? selectedCells : []}
                    letters={defenseLetters}
                    onCellEnter={room.status === 'setup' ? onHover : undefined}
                    onCellLeave={() => setHoverCells([])}
                    onCellClick={room.status === 'setup' ? (i) => placeWord(fromIndex(i).row, fromIndex(i).col) : undefined}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── ATTACK ── */}
          {tab === 'attack' && (
            <div className="tcontent">
              <div className="atk-layout">
                <div className="grid-area">
                  <Grid mode="attack" cells={room.enemyGrid}
                    onCellClick={room.status === 'battle' && isYourTurn ? attackCell : undefined}
                  />
                </div>
                <aside className="atk-aside">
                  <div className="aside-title">Protivnikove riječi</div>
                  <div className="opp-list">
                    {room.opponentWords.map((word) => (
                      <div key={word.id} className={`opp-item ${word.guessed ? 'opp-done' : ''}`}>
                        <div className="opp-chips">
                          {word.revealed.map((ch, i) => (
                            <span key={i} className={`mchip ${ch !== '_' ? 'mchip-hit' : ''}`}>{ch === '_' ? '?' : ch}</span>
                          ))}
                        </div>
                        {word.guessed && <span className="opp-tag">✓ Palo</span>}
                      </div>
                    ))}
                  </div>

                  {inBattle && opponentGuessable.length > 0 && (
                    <>
                      <div className="aside-title" style={{ marginTop: 12 }}>⚡ Pogodi cijelu riječ</div>
                      <select className="big-input" value={guessTarget} onChange={(e) => setGuessTarget(e.target.value)} disabled={!isYourTurn}>
                        {opponentGuessable.map((w) => (
                          <option key={w.id} value={w.id}>{w.length} slova — {w.revealed.join('')}</option>
                        ))}
                      </select>
                      <div className="guess-row">
                        <input
                          className="big-input"
                          value={guessText}
                          onChange={(e) => setGuessText(normalizeWord(e.target.value).slice(0, opponentGuessable.find((w) => w.id === guessTarget)?.length ?? 4))}
                          disabled={!isYourTurn}
                          placeholder="Upiši riječ…"
                          autoCapitalize="characters" autoCorrect="off" spellCheck={false}
                          onKeyDown={(e) => e.key === 'Enter' && submitGuess()}
                        />
                        <button className="btn-primary" style={{ padding: '0 14px', flexShrink: 0 }} onClick={submitGuess} disabled={!guessText || !isYourTurn || busy}>
                          <Zap size={15} />
                        </button>
                      </div>
                    </>
                  )}

                  <div className="aside-title" style={{ marginTop: 12 }}>Tvoje riječi</div>
                  <div className="opp-list">
                    {room.yourWords.map((word) => (
                      <div key={word.id} className={`opp-item ${word.guessed ? 'opp-lost' : ''}`}>
                        <div className="opp-chips">
                          {word.revealed.map((ch, i) => (
                            <span key={i} className={`mchip ${ch !== '_' ? 'mchip-dmg' : ''}`}>{ch === '_' ? '·' : ch}</span>
                          ))}
                        </div>
                        {word.guessed && <span className="opp-tag opp-tag-red">✗ Pala</span>}
                      </div>
                    ))}
                  </div>

                  {room.status === 'finished' && (
                    <button className="btn-primary" style={{ width: '100%', marginTop: 12 }} onClick={restartMatch} disabled={busy}>
                      <RotateCw size={15} /> Nova runda
                    </button>
                  )}
                </aside>
              </div>
            </div>
          )}

          {/* ── FEED ── */}
          {tab === 'feed' && (
            <div className="tcontent feed-content">
              <div className="fstats">
                {[
                  { val: `${room.opponentWords.filter((w) => w.guessed).length}/4`, label: 'Protivnik pale' },
                  { val: `${room.yourWords.filter((w) => w.guessed).length}/4`, label: 'Tvoje pale' },
                  { val: yourPlayer?.moves ?? 0, label: 'Tvojih poteza' },
                  { val: enemyPlayer?.moves ?? 0, label: 'Poteza prot.' },
                ].map((s) => (
                  <div key={s.label} className="fstat"><div className="fstat-v">{s.val}</div><div className="fstat-l">{s.label}</div></div>
                ))}
              </div>
              <div className="fmessages">
                {[...room.messages].reverse().map((msg) => (
                  <div key={msg.id} className={`fmsg fmsg-${msg.kind}`}><span className="fdot" /><span>{msg.text}</span></div>
                ))}
                {room.messages.length === 0 && <div className="fempty">Tijek meča je prazan.</div>}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT: persistent chat panel */}
        <aside className="chat-panel">
          <div className="chat-panel-head">
            <MessageSquare size={14} />
            <span>Chat</span>
            <span className="chat-room-code">#{auth.roomCode}</span>
            {unreadChat > 0 && <span className="chat-unread">{unreadChat}</span>}
          </div>
          <div className="chat-messages">
            {room.chat.length === 0 && <div className="chat-empty">Nema poruka. Reci nešto!</div>}
            {room.chat.map((msg) => {
              const mine = msg.playerId === auth.playerId;
              return (
                <div key={msg.id} className={`chat-msg ${mine ? 'chat-msg-mine' : ''}`}>
                  <div className="chat-msg-head">
                    <span className="chat-msg-name">{mine ? 'Ti' : msg.playerName}</span>
                    <span className="chat-msg-time">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div className="chat-msg-text">{msg.text}</div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <div className="chat-compose">
            <input
              ref={chatInputRef}
              className="chat-input"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value.slice(0, 180))}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat(); }}
              placeholder="Poruka…"
              maxLength={180}
            />
            <button className="chat-send" onClick={sendChat} disabled={!chatInput.trim()}>
              <Send size={14} />
            </button>
          </div>
        </aside>
      </div>

      {/* Victory overlay */}
      {room.status === 'finished' && (
        <div className="victory-overlay">
          <div className="victory-card">
            <div className="victory-kicker">Runda završena</div>
            <div className="victory-title">{room.winnerId === auth.playerId ? '🏆 Pobijedio si!' : '💀 Protivnik pobijedio'}</div>
            <div className="victory-scores">
              <div className="vscore"><span>{yourPlayer?.name ?? 'Ti'}</span><strong>{yourPlayer?.score ?? 0}</strong></div>
              <div className="vscore-vs">VS</div>
              <div className="vscore"><span>{enemyPlayer?.name ?? 'Protivnik'}</span><strong>{enemyPlayer?.score ?? 0}</strong></div>
            </div>
            <button className="btn-primary" onClick={restartMatch} disabled={busy}>
              <RotateCw size={15} /> Nova runda
            </button>
          </div>
        </div>
      )}

      {toast && <div className={`toast toast-${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}

// ── GRID ──────────────────────────────────────────────────────────────────────
type GridProps = {
  mode: 'defense' | 'attack';
  cells: Array<'empty' | 'occupied' | 'miss' | 'hit' | 'secured' | 'unknown'>;
  hoverCells?: number[];
  hoverValid?: boolean;
  selectedCells?: number[];
  letters?: Record<number, string>;
  onCellClick?: (index: number) => void;
  onCellEnter?: (index: number) => void;
  onCellLeave?: () => void;
};

function Grid({ mode, cells, hoverCells = [], hoverValid = true, selectedCells = [], letters = {}, onCellClick, onCellEnter, onCellLeave }: GridProps) {
  return (
    <div className="grid-c">
      <div className="grid-top">
        <div className="gl-corner" />
        {LETTERS.map((l) => <div key={l} className="gl">{l}</div>)}
      </div>
      <div className="grid-body">
        {Array.from({ length: GRID_SIZE }, (_, row) => (
          <div key={row} className="grid-row-wrap">
            <div className="gl gl-row">{row + 1}</div>
            {Array.from({ length: GRID_SIZE }, (_, col) => {
              const i = toIndex(row, col);
              const cell = cells[i];
              const hov = hoverCells.includes(i);
              const sel = selectedCells.includes(i);
              let cls = `gc gc-${cell}`;
              if (hov) cls += hoverValid ? ' gc-hov-ok' : ' gc-hov-no';
              if (sel) cls += ' gc-selected';
              const letter = mode === 'defense' && letters[i];
              return (
                <button key={i} className={cls}
                  onClick={() => onCellClick?.(i)}
                  onMouseEnter={() => onCellEnter?.(i)}
                  onMouseLeave={() => onCellLeave?.()}
                  style={!onCellClick ? { cursor: 'default' } : undefined}
                  aria-label={`${mode}-${i}`}
                >
                  {letter ? letter : cell === 'hit' || cell === 'secured' ? '✦' : cell === 'miss' ? '·' : cell === 'occupied' && mode === 'defense' ? '▪' : ''}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
