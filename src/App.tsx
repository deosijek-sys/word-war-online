import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Crown,
  LoaderCircle,
  LogIn,
  PlusCircle,
  Radar,
  RotateCw,
  Send,
  Shield,
  Swords,
  Target,
  Trophy,
  User,
  Wifi,
  XCircle,
} from 'lucide-react';

type Orientation = 'horizontal' | 'vertical';
type SetupWord = {
  id: string;
  length: number;
  value: string;
  placement?: Placement;
};

type Placement = {
  row: number;
  col: number;
  orientation: Orientation;
  cells: number[];
};

type PublicWordState = {
  id: string;
  length: number;
  guessed: boolean;
  revealed: string[];
};

type RoomSummary = {
  code: string;
  status: 'waiting' | 'setup' | 'battle' | 'finished';
  turn: string | null;
  winnerId: string | null;
  players: Array<{
    id: string;
    name: string;
    ready: boolean;
    connected: boolean;
    score: number;
    moves: number;
  }>;
  viewerId: string;
  enemyGrid: Array<'unknown' | 'miss' | 'hit' | 'secured'>;
  yourDefenseGrid: Array<'empty' | 'occupied' | 'miss' | 'hit' | 'secured'>;
  yourWords: PublicWordState[];
  opponentWords: PublicWordState[];
  messages: Array<{ id: string; text: string; kind: 'info' | 'success' | 'error' }>;
};

type Auth = {
  roomCode: string;
  playerId: string;
  token: string;
};

type Toast = {
  kind: 'success' | 'error' | 'info';
  text: string;
};

const GRID_SIZE = 10;
const CELL_COUNT = GRID_SIZE * GRID_SIZE;
const DEFAULT_WORDS: SetupWord[] = [
  { id: 'W6', length: 6, value: '' },
  { id: 'W5', length: 5, value: '' },
  { id: 'W4', length: 4, value: '' },
  { id: 'W3', length: 3, value: '' },
];
const LETTERS = Array.from({ length: GRID_SIZE }, (_, i) => String.fromCharCode(65 + i));

function toIndex(row: number, col: number) {
  return row * GRID_SIZE + col;
}

function fromIndex(index: number) {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

function normalizeWord(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-ZČĆŽŠĐ]/g, '')
    .trim();
}

function getPlacementCells(row: number, col: number, length: number, orientation: Orientation) {
  const cells: number[] = [];
  for (let i = 0; i < length; i += 1) {
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
  for (let r = row - 1; r <= row + 1; r += 1) {
    for (let c = col - 1; c <= col + 1; c += 1) {
      if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) continue;
      around.push(toIndex(r, c));
    }
  }
  return around;
}

function canPlaceWord(word: SetupWord, row: number, col: number, orientation: Orientation, placedWords: SetupWord[]) {
  const cells = getPlacementCells(row, col, word.length, orientation);
  if (!cells) return { valid: false, cells: [] as number[] };

  const occupied = new Set<number>();
  const blocked = new Set<number>();

  placedWords
    .filter((item) => item.id !== word.id && item.placement)
    .forEach((item) => {
      item.placement?.cells.forEach((cell) => {
        occupied.add(cell);
        getAdjacentCells(cell).forEach((adj) => blocked.add(adj));
      });
    });

  const valid = cells.every((cell) => !occupied.has(cell) && !blocked.has(cell));
  return { valid, cells };
}

function initialWords() {
  return DEFAULT_WORDS.map((word) => ({ ...word }));
}

async function api<T>(path: string, options?: RequestInit) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers ?? {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Došlo je do greške na serveru.');
  }
  return data as T;
}

function App() {
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

  useEffect(() => {
    const saved = localStorage.getItem('word-war-auth');
    if (saved) {
      try {
        setAuth(JSON.parse(saved));
      } catch {
        localStorage.removeItem('word-war-auth');
      }
    }
  }, []);

  useEffect(() => {
    if (!auth) return;

    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const state = await api<RoomSummary>(
          `/api/rooms/${auth.roomCode}/state?playerId=${auth.playerId}&token=${auth.token}`,
        );
        if (!cancelled) {
          setRoom(state);
          setGuessTarget((current) => {
            const stillExists = state.opponentWords.some((word) => word.id === current && !word.guessed);
            return stillExists ? current : state.opponentWords.find((word) => !word.guessed)?.id ?? current;
          });
        }
      } catch (error) {
        if (!cancelled) {
          setToast({ kind: 'error', text: error instanceof Error ? error.message : 'Veza sa sobom je prekinuta.' });
        }
      } finally {
        if (!cancelled) timer = window.setTimeout(poll, 1200);
      }
    };

    poll();

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [auth]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const activeWord = words.find((word) => word.id === activeWordId) ?? words[0];
  const placementDone = words.every((word) => word.placement && word.value.length === word.length);
  const canSubmitSetup = placementDone && auth && room && room.status !== 'battle';

  const enemyName = useMemo(() => {
    if (!room || !auth) return 'Protivnik';
    return room.players.find((player) => player.id !== auth.playerId)?.name ?? 'Protivnik';
  }, [room, auth]);

  const yourPlayer = room?.players.find((player) => player.id === auth?.playerId) ?? null;
  const enemyPlayer = room?.players.find((player) => player.id !== auth?.playerId) ?? null;
  const isYourTurn = room?.turn === auth?.playerId;
  const inBattle = room?.status === 'battle' || room?.status === 'finished';

  function persistAuth(next: Auth | null) {
    setAuth(next);
    if (next) localStorage.setItem('word-war-auth', JSON.stringify(next));
    else localStorage.removeItem('word-war-auth');
  }

  function showToast(next: Toast) {
    setToast(next);
  }

  async function createRoom() {
    if (!name.trim()) {
      showToast({ kind: 'error', text: 'Upiši svoje ime prije kreiranja sobe.' });
      return;
    }
    setBusy(true);
    try {
      const data = await api<Auth>('/api/rooms', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      persistAuth(data);
      setWords(initialWords());
      showToast({ kind: 'success', text: 'Soba je kreirana. Postavi riječi i pošalji kod protivniku.' });
    } catch (error) {
      showToast({ kind: 'error', text: error instanceof Error ? error.message : 'Ne mogu kreirati sobu.' });
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom() {
    if (!name.trim() || !joinCode.trim()) {
      showToast({ kind: 'error', text: 'Upiši ime i kod sobe.' });
      return;
    }
    setBusy(true);
    try {
      const data = await api<Auth>(`/api/rooms/${joinCode.trim().toUpperCase()}/join`, {
        method: 'POST',
        body: JSON.stringify({ name: name.trim() }),
      });
      persistAuth(data);
      setWords(initialWords());
      showToast({ kind: 'success', text: 'Spojen si u sobu. Postavi svoje riječi.' });
    } catch (error) {
      showToast({ kind: 'error', text: error instanceof Error ? error.message : 'Ne mogu se spojiti.' });
    } finally {
      setBusy(false);
    }
  }

  function updateWord(id: string, value: string) {
    setWords((current) =>
      current.map((word) =>
        word.id === id ? { ...word, value: normalizeWord(value).slice(0, word.length) } : word,
      ),
    );
  }

  function placeWord(row: number, col: number) {
    if (!activeWord) return;
    if (activeWord.value.length !== activeWord.length) {
      showToast({ kind: 'error', text: `Riječ za ${activeWord.length} slova mora imati točno ${activeWord.length} slova.` });
      return;
    }
    const result = canPlaceWord(activeWord, row, col, orientation, words);
    if (!result.valid) {
      showToast({ kind: 'error', text: 'Riječi se ne smiju preklapati niti dodirivati.' });
      return;
    }
    setWords((current) =>
      current.map((word) =>
        word.id === activeWord.id
          ? {
              ...word,
              placement: { row, col, orientation, cells: result.cells },
            }
          : word,
      ),
    );
    const currentIndex = words.findIndex((word) => word.id === activeWord.id);
    const nextWord = words.slice(currentIndex + 1).find((word) => !word.placement) ?? words.find((word) => !word.placement && word.id !== activeWord.id);
    if (nextWord) setActiveWordId(nextWord.id);
  }

  function onPlacementHover(index: number) {
    if (!activeWord) return;
    const { row, col } = fromIndex(index);
    const result = canPlaceWord(activeWord, row, col, orientation, words);
    setHoverCells(result.cells);
    setHoverValid(result.valid);
  }

  async function submitSetup() {
    if (!canSubmitSetup || !auth) return;
    setBusy(true);
    try {
      await api(`/api/rooms/${auth.roomCode}/setup`, {
        method: 'POST',
        body: JSON.stringify({
          playerId: auth.playerId,
          token: auth.token,
          words: words.map((word) => ({
            id: word.id,
            value: word.value,
            placement: word.placement,
          })),
        }),
      });
      showToast({ kind: 'success', text: 'Riječi su zaključane. Čekaš početak runde.' });
    } catch (error) {
      showToast({ kind: 'error', text: error instanceof Error ? error.message : 'Ne mogu zaključati riječi.' });
    } finally {
      setBusy(false);
    }
  }

  async function attackCell(index: number) {
    if (!auth || !room || !isYourTurn || room.status !== 'battle') return;
    const cell = room.enemyGrid[index];
    if (cell !== 'unknown') return;
    setBusy(true);
    try {
      const result = await api<{ message: string }>(`/api/rooms/${auth.roomCode}/attack`, {
        method: 'POST',
        body: JSON.stringify({ playerId: auth.playerId, token: auth.token, index }),
      });
      showToast({ kind: 'info', text: result.message });
    } catch (error) {
      showToast({ kind: 'error', text: error instanceof Error ? error.message : 'Napad nije uspio.' });
    } finally {
      setBusy(false);
    }
  }

  async function submitGuess() {
    if (!auth || !room || !isYourTurn || !guessText.trim()) return;
    setBusy(true);
    try {
      const result = await api<{ message: string }>(`/api/rooms/${auth.roomCode}/guess`, {
        method: 'POST',
        body: JSON.stringify({
          playerId: auth.playerId,
          token: auth.token,
          wordId: guessTarget,
          guess: normalizeWord(guessText),
        }),
      });
      setGuessText('');
      showToast({ kind: 'success', text: result.message });
    } catch (error) {
      showToast({ kind: 'error', text: error instanceof Error ? error.message : 'Pogađanje nije uspjelo.' });
    } finally {
      setBusy(false);
    }
  }

  async function restartMatch() {
    if (!auth) return;
    setBusy(true);
    try {
      await api(`/api/rooms/${auth.roomCode}/restart`, {
        method: 'POST',
        body: JSON.stringify({ playerId: auth.playerId, token: auth.token }),
      });
      setWords(initialWords());
      showToast({ kind: 'success', text: 'Nova runda je spremna. Postavi nove riječi.' });
    } catch (error) {
      showToast({ kind: 'error', text: error instanceof Error ? error.message : 'Ne mogu restartati meč.' });
    } finally {
      setBusy(false);
    }
  }

  function leaveRoom() {
    persistAuth(null);
    setRoom(null);
    setWords(initialWords());
    setGuessText('');
    setJoinCode('');
    setHoverCells([]);
    setHoverValid(true);
  }

  const opponentGuessable = room?.opponentWords.filter((word) => !word.guessed) ?? [];

  return (
    <div className="app-shell">
      <div className="aurora aurora-a" />
      <div className="aurora aurora-b" />

      <header className="topbar card">
        <div>
          <div className="eyebrow">WORD WAR ONLINE</div>
          <h1>Potapanje riječi, ali online i ozbiljno.</h1>
          <p>
            Jedan igrač skriva 4 riječi, drugi gađa polja, otkriva slova i riskira guess prije nego što je siguran.
          </p>
        </div>
        <div className="topbar-actions">
          {auth ? (
            <>
              <button className="ghost-button" onClick={() => navigator.clipboard.writeText(auth.roomCode)}>
                <Copy size={16} /> Kod: {auth.roomCode}
              </button>
              <button className="ghost-button" onClick={leaveRoom}>
                <LogIn size={16} /> Izađi
              </button>
            </>
          ) : (
            <div className="status-pill">
              <Wifi size={16} /> Online mode
            </div>
          )}
        </div>
      </header>

      {!auth || !room ? (
        <section className="lobby-grid">
          <div className="card lobby-card">
            <div className="section-title">
              <User size={18} /> Tvoj ulaz
            </div>
            <label className="field-label">Ime igrača</label>
            <input
              className="text-input"
              placeholder="Upiši ime"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <div className="lobby-actions">
              <button className="primary-button" onClick={createRoom} disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={16} /> : <PlusCircle size={16} />} Kreiraj sobu
              </button>
            </div>
          </div>

          <div className="card lobby-card">
            <div className="section-title">
              <Swords size={18} /> Ulaz u postojeću sobu
            </div>
            <label className="field-label">Kod sobe</label>
            <input
              className="text-input code-input"
              placeholder="Npr. K7Q9P1"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            />
            <div className="lobby-actions">
              <button className="secondary-button" onClick={joinRoom} disabled={busy}>
                {busy ? <LoaderCircle className="spin" size={16} /> : <LogIn size={16} />} Spoji se
              </button>
            </div>
          </div>
        </section>
      ) : (
        <main className="game-grid">
          <section className="card sidebar">
            <div className="section-title">
              <Shield size={18} /> Igrači i stanje meča
            </div>
            <div className="player-stack">
              <div className={`player-card ${isYourTurn ? 'player-card-active' : ''}`}>
                <div>
                  <strong>{yourPlayer?.name ?? 'Ti'}</strong>
                  <span>Tvoji bodovi: {yourPlayer?.score ?? 0}</span>
                </div>
                <div className="mini-stats">
                  <span>Potezi {yourPlayer?.moves ?? 0}</span>
                  {room.turn === auth.playerId && <span className="turn-badge">Tvoj red</span>}
                </div>
              </div>
              <div className={`player-card ${!isYourTurn && room.status === 'battle' ? 'player-card-active enemy' : ''}`}>
                <div>
                  <strong>{enemyPlayer?.name ?? 'Protivnik'}</strong>
                  <span>Bodovi: {enemyPlayer?.score ?? 0}</span>
                </div>
                <div className="mini-stats">
                  <span>Potezi {enemyPlayer?.moves ?? 0}</span>
                  {room.turn === enemyPlayer?.id && room.status === 'battle' && <span className="turn-badge enemy">Na potezu</span>}
                </div>
              </div>
            </div>

            <div className="divider" />

            <div className="section-title">
              <Radar size={18} /> Tvoje riječi
            </div>
            <div className="word-list">
              {words.map((word) => (
                <div key={word.id} className={`word-item ${activeWordId === word.id ? 'word-item-active' : ''}`}>
                  <button className="word-item-main" onClick={() => setActiveWordId(word.id)}>
                    <span>{word.length} slova</span>
                    <strong>{word.value || '_'.repeat(word.length)}</strong>
                  </button>
                  {word.placement ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                </div>
              ))}
            </div>

            <div className="field-block">
              <label className="field-label">Aktivna riječ ({activeWord.length} slova)</label>
              <input
                className="text-input"
                value={activeWord.value}
                onChange={(event) => updateWord(activeWord.id, event.target.value)}
                placeholder={`${activeWord.length} slova`}
                disabled={room.status === 'battle' || room.status === 'finished'}
              />
            </div>

            <div className="button-row compact">
              <button
                className="ghost-button"
                onClick={() => setOrientation((current) => (current === 'horizontal' ? 'vertical' : 'horizontal'))}
                disabled={room.status === 'battle' || room.status === 'finished'}
              >
                <RotateCw size={16} /> {orientation === 'horizontal' ? 'Horizontalno' : 'Vertikalno'}
              </button>
              <button className="primary-button" disabled={!canSubmitSetup || busy} onClick={submitSetup}>
                <Send size={16} /> Zaključaj riječi
              </button>
            </div>

            <p className="helper-text">
              Pravilo: riječi se ne smiju preklapati niti dodirivati, čak ni dijagonalno.
            </p>

            <div className="divider" />

            <div className="section-title">
              <Target size={18} /> Guess cijele riječi
            </div>
            <select
              className="text-input"
              value={guessTarget}
              onChange={(event) => setGuessTarget(event.target.value)}
              disabled={!inBattle || !isYourTurn || opponentGuessable.length === 0}
            >
              {opponentGuessable.length === 0 ? (
                <option>Nema dostupnih riječi</option>
              ) : (
                opponentGuessable.map((word) => (
                  <option key={word.id} value={word.id}>
                    {word.length} slova — {word.revealed.join(' ')}
                  </option>
                ))
              )}
            </select>
            <div className="button-row compact">
              <input
                className="text-input"
                value={guessText}
                onChange={(event) => setGuessText(normalizeWord(event.target.value))}
                placeholder="Pokušaj pogoditi"
                disabled={!inBattle || !isYourTurn || opponentGuessable.length === 0}
              />
              <button className="secondary-button" onClick={submitGuess} disabled={!guessText || !isYourTurn || busy}>
                Pogodi
              </button>
            </div>

            {room.status === 'finished' && (
              <button className="primary-button full-width" onClick={restartMatch} disabled={busy}>
                <RotateCw size={16} /> Nova runda
              </button>
            )}
          </section>

          <section className="board-column">
            <div className="card board-card">
              <div className="board-header">
                <div>
                  <div className="eyebrow">POSTAVLJANJE</div>
                  <h2>Tvoja obrana</h2>
                </div>
                <span className="status-pill muted">
                  {room.status === 'waiting'
                    ? 'Čeka se drugi igrač'
                    : room.status === 'setup'
                      ? 'Oba igrača postavljaju riječi'
                      : room.status === 'battle'
                        ? 'Aktivna partija'
                        : 'Meč završen'}
                </span>
              </div>
              <Grid
                mode="defense"
                cells={room.yourDefenseGrid}
                hoverCells={room.status === 'setup' ? hoverCells : []}
                hoverValid={hoverValid}
                onCellEnter={room.status === 'setup' ? onPlacementHover : undefined}
                onCellLeave={() => setHoverCells([])}
                onCellClick={room.status === 'setup' ? (index) => placeWord(fromIndex(index).row, fromIndex(index).col) : undefined}
              />
            </div>

            <div className="card board-card">
              <div className="board-header">
                <div>
                  <div className="eyebrow">NAPAD</div>
                  <h2>Protivnički grid</h2>
                </div>
                <span className={`status-pill ${isYourTurn ? 'accent' : 'muted'}`}>
                  {room.status === 'battle'
                    ? isYourTurn
                      ? 'Klikni polje ili pokušaj guess'
                      : `${enemyName} je na potezu`
                    : room.status === 'finished'
                      ? room.winnerId === auth.playerId
                        ? 'Pobijedio si'
                        : 'Izgubio si'
                      : 'Battle počinje kad su oba igrača ready'}
                </span>
              </div>
              <Grid
                mode="attack"
                cells={room.enemyGrid}
                onCellClick={room.status === 'battle' && isYourTurn ? attackCell : undefined}
              />
            </div>
          </section>

          <section className="card feed-card">
            <div className="section-title">
              {room.status === 'finished' ? <Trophy size={18} /> : <Crown size={18} />} Tijek meča
            </div>
            <div className="message-feed">
              {room.messages.map((message) => (
                <div key={message.id} className={`feed-item ${message.kind}`}>
                  <span className="dot" />
                  <span>{message.text}</span>
                </div>
              ))}
            </div>

            <div className="divider" />

            <div className="summary-grid">
              <div className="summary-card">
                <span>Protivničke riječi</span>
                <strong>{room.opponentWords.filter((word) => word.guessed).length} / 4</strong>
              </div>
              <div className="summary-card">
                <span>Tvoje riječi otkrivene</span>
                <strong>{room.yourWords.filter((word) => word.guessed).length} / 4</strong>
              </div>
            </div>

            <div className="word-reveal-stack">
              <RevealList title="Tvoje riječi" words={room.yourWords} />
              <RevealList title="Protivničke riječi" words={room.opponentWords} />
            </div>
          </section>
        </main>
      )}

      {toast && <div className={`toast ${toast.kind}`}>{toast.text}</div>}
    </div>
  );
}

type GridProps = {
  mode: 'defense' | 'attack';
  cells: Array<'empty' | 'occupied' | 'miss' | 'hit' | 'secured' | 'unknown'>;
  hoverCells?: number[];
  hoverValid?: boolean;
  onCellClick?: (index: number) => void;
  onCellEnter?: (index: number) => void;
  onCellLeave?: () => void;
};

function Grid({ mode, cells, hoverCells = [], hoverValid = true, onCellClick, onCellEnter, onCellLeave }: GridProps) {
  return (
    <div className="grid-wrapper">
      <div className="axis-row axis-top">
        <div className="axis-corner" />
        {LETTERS.map((letter) => (
          <div key={letter} className="axis-label">
            {letter}
          </div>
        ))}
      </div>
      <div className="grid-main">
        <div className="axis-col">
          {Array.from({ length: GRID_SIZE }, (_, index) => (
            <div key={index} className="axis-label">
              {index + 1}
            </div>
          ))}
        </div>
        <div className="grid-board">
          {cells.map((cell, index) => {
            const hovered = hoverCells.includes(index);
            const classes = ['grid-cell', `cell-${cell}`, hovered ? (hoverValid ? 'cell-hover-valid' : 'cell-hover-invalid') : ''];
            return (
              <button
                key={index}
                className={classes.filter(Boolean).join(' ')}
                onClick={() => onCellClick?.(index)}
                onMouseEnter={() => onCellEnter?.(index)}
                onMouseLeave={() => onCellLeave?.()}
                disabled={!onCellClick}
                aria-label={`${mode}-${index}`}
              >
                {cell === 'hit' || cell === 'secured' ? '✦' : cell === 'miss' ? '•' : cell === 'occupied' && mode === 'defense' ? '◼' : ''}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function RevealList({ title, words }: { title: string; words: PublicWordState[] }) {
  return (
    <div>
      <div className="field-label subtle">{title}</div>
      <div className="reveal-list">
        {words.map((word) => (
          <div key={word.id} className="reveal-item">
            <div>
              <strong>{word.length} slova</strong>
              <span>{word.guessed ? 'Riječ je pala' : 'Još živi'}</span>
            </div>
            <div className="chips">
              {word.revealed.map((char, index) => (
                <span key={`${word.id}-${index}`} className={`chip ${char !== '_' ? 'filled' : ''}`}>
                  {char}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
