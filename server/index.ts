import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '1mb' }));

const GRID_SIZE = 10;
const WORD_SPECS = [
  { id: 'W6', length: 6 },
  { id: 'W5', length: 5 },
  { id: 'W4', length: 4 },
  { id: 'W3', length: 3 },
] as const;

type Orientation = 'horizontal' | 'vertical';
type WordId = (typeof WORD_SPECS)[number]['id'];
type GridAttackCell = 'unknown' | 'miss' | 'hit' | 'secured';
type DefenseCell = 'empty' | 'occupied' | 'miss' | 'hit' | 'secured';

type Placement = {
  row: number;
  col: number;
  orientation: Orientation;
  cells: number[];
};

type WordRecord = {
  id: WordId;
  length: number;
  value: string;
  placement: Placement;
  guessed: boolean;
  revealed: string[];
};

type Player = {
  id: string;
  token: string;
  name: string;
  connected: boolean;
  ready: boolean;
  score: number;
  moves: number;
  words: WordRecord[];
  defenseGrid: DefenseCell[];
  enemyGrid: GridAttackCell[];
};

type FeedMessage = {
  id: string;
  text: string;
  kind: 'info' | 'success' | 'error';
};

type Room = {
  code: string;
  players: Player[];
  status: 'waiting' | 'setup' | 'battle' | 'finished';
  turn: string | null;
  winnerId: string | null;
  messages: FeedMessage[];
};

const rooms = new Map<string, Room>();

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function roomCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  while (code.length < 6) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return rooms.has(code) ? roomCode() : code;
}

function makeGrid<T>(value: T) {
  return Array.from({ length: GRID_SIZE * GRID_SIZE }, () => value);
}

function fromIndex(index: number) {
  return { row: Math.floor(index / GRID_SIZE), col: index % GRID_SIZE };
}

function toIndex(row: number, col: number) {
  return row * GRID_SIZE + col;
}

function getAdjacent(index: number) {
  const { row, col } = fromIndex(index);
  const result: number[] = [];
  for (let r = row - 1; r <= row + 1; r += 1) {
    for (let c = col - 1; c <= col + 1; c += 1) {
      if (r < 0 || c < 0 || r >= GRID_SIZE || c >= GRID_SIZE) continue;
      result.push(toIndex(r, c));
    }
  }
  return result;
}

function validateWords(rawWords: any[]): WordRecord[] {
  if (!Array.isArray(rawWords) || rawWords.length !== WORD_SPECS.length) {
    throw new Error('Treba poslati točno 4 riječi.');
  }

  const occupied = new Set<number>();
  const blocked = new Set<number>();

  return WORD_SPECS.map((spec) => {
    const source = rawWords.find((item) => item.id === spec.id);
    if (!source) throw new Error(`Nedostaje riječ ${spec.id}.`);
    const value = String(source.value || '')
      .toUpperCase()
      .replace(/[^A-ZČĆŽŠĐ]/g, '')
      .trim();
    if (value.length !== spec.length) throw new Error(`Riječ ${spec.id} mora imati ${spec.length} slova.`);

    const placement = source.placement;
    if (!placement || !Array.isArray(placement.cells) || placement.cells.length !== spec.length) {
      throw new Error(`Riječ ${spec.id} nema valjani placement.`);
    }

    const cells: number[] = placement.cells;
    cells.forEach((cell) => {
      if (typeof cell !== 'number' || cell < 0 || cell >= GRID_SIZE * GRID_SIZE) {
        throw new Error('Neispravno polje na gridu.');
      }
      if (occupied.has(cell) || blocked.has(cell)) {
        throw new Error('Riječi se ne smiju preklapati niti dodirivati.');
      }
    });

    cells.forEach((cell) => {
      occupied.add(cell);
      getAdjacent(cell).forEach((adj) => blocked.add(adj));
    });

    return {
      id: spec.id,
      length: spec.length,
      value,
      placement,
      guessed: false,
      revealed: Array.from({ length: spec.length }, () => '_'),
    };
  });
}

function pushMessage(room: Room, text: string, kind: FeedMessage['kind'] = 'info') {
  room.messages.unshift({ id: uid(), text, kind });
  room.messages = room.messages.slice(0, 18);
}

function getRoom(code: string) {
  const room = rooms.get(code.toUpperCase());
  if (!room) throw new Error('Soba ne postoji.');
  return room;
}

function getPlayer(room: Room, playerId: string, token: string) {
  const player = room.players.find((item) => item.id === playerId && item.token === token);
  if (!player) throw new Error('Nevažeći pristup sobi.');
  return player;
}

function getOpponent(room: Room, playerId: string) {
  return room.players.find((item) => item.id !== playerId) ?? null;
}

function canStartBattle(room: Room) {
  return room.players.length === 2 && room.players.every((player) => player.ready);
}

function refreshBattleStatus(room: Room) {
  if (canStartBattle(room)) {
    room.status = 'battle';
    if (!room.turn) room.turn = room.players[0].id;
  } else if (room.players.length === 2) {
    room.status = 'setup';
    room.turn = null;
  } else {
    room.status = 'waiting';
    room.turn = null;
  }
}

function revealCellForBoth(attacker: Player, defender: Player, cell: number, hitKind: 'hit' | 'secured') {
  attacker.enemyGrid[cell] = hitKind;
  defender.defenseGrid[cell] = hitKind;
}

function checkWin(room: Room, defender: Player, attacker: Player) {
  const allGuessed = defender.words.every((word) => word.guessed);
  if (allGuessed) {
    room.status = 'finished';
    room.turn = null;
    room.winnerId = attacker.id;
    pushMessage(room, `${attacker.name} je potopio sve riječi i pobijedio.`, 'success');
  }
}

function publicWords(words: Array<Pick<WordRecord, 'id' | 'length' | 'guessed' | 'revealed'>>) {
  return words.map((word) => ({
    id: word.id,
    length: word.length,
    guessed: word.guessed,
    revealed: [...word.revealed],
  }));
}

app.post('/api/rooms', (req, res) => {
  try {
    const name = String(req.body?.name || '').trim();
    if (!name) throw new Error('Ime je obavezno.');

    const player: Player = {
      id: uid(),
      token: uid() + uid(),
      name,
      connected: true,
      ready: false,
      score: 0,
      moves: 0,
      words: [],
      defenseGrid: makeGrid<DefenseCell>('empty'),
      enemyGrid: makeGrid<GridAttackCell>('unknown'),
    };

    const room: Room = {
      code: roomCode(),
      players: [player],
      status: 'waiting',
      turn: null,
      winnerId: null,
      messages: [],
    };
    pushMessage(room, `${name} je kreirao sobu.`, 'info');
    rooms.set(room.code, room);
    res.json({ roomCode: room.code, playerId: player.id, token: player.token });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Ne mogu kreirati sobu.' });
  }
});

app.post('/api/rooms/:code/join', (req, res) => {
  try {
    const room = getRoom(req.params.code);
    const name = String(req.body?.name || '').trim();
    if (!name) throw new Error('Ime je obavezno.');
    if (room.players.length >= 2) throw new Error('Soba je puna.');

    const player: Player = {
      id: uid(),
      token: uid() + uid(),
      name,
      connected: true,
      ready: false,
      score: 0,
      moves: 0,
      words: [],
      defenseGrid: makeGrid<DefenseCell>('empty'),
      enemyGrid: makeGrid<GridAttackCell>('unknown'),
    };

    room.players.push(player);
    refreshBattleStatus(room);
    pushMessage(room, `${name} se spojio u sobu.`, 'success');
    res.json({ roomCode: room.code, playerId: player.id, token: player.token });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Spajanje nije uspjelo.' });
  }
});

app.get('/api/rooms/:code/state', (req, res) => {
  try {
    const room = getRoom(req.params.code);
    const player = getPlayer(room, String(req.query.playerId || ''), String(req.query.token || ''));
    player.connected = true;
    const opponent = getOpponent(room, player.id);

    res.json({
      code: room.code,
      status: room.status,
      turn: room.turn,
      winnerId: room.winnerId,
      players: room.players.map((item) => ({
        id: item.id,
        name: item.name,
        ready: item.ready,
        connected: item.connected,
        score: item.score,
        moves: item.moves,
      })),
      viewerId: player.id,
      enemyGrid: [...player.enemyGrid],
      yourDefenseGrid: [...player.defenseGrid],
      yourWords: publicWords(player.words),
      opponentWords: publicWords(opponent?.words ?? WORD_SPECS.map((spec) => ({
        id: spec.id,
        length: spec.length,
        guessed: false,
        revealed: Array.from({ length: spec.length }, () => '_'),
      }))),
      messages: room.messages,
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Ne mogu dohvatiti stanje sobe.' });
  }
});

app.post('/api/rooms/:code/setup', (req, res) => {
  try {
    const room = getRoom(req.params.code);
    const player = getPlayer(room, String(req.body?.playerId || ''), String(req.body?.token || ''));
    const words = validateWords(req.body?.words || []);

    player.words = words;
    player.ready = true;
    player.score = 0;
    player.moves = 0;
    player.enemyGrid = makeGrid<GridAttackCell>('unknown');
    player.defenseGrid = makeGrid<DefenseCell>('empty');
    words.forEach((word) => word.placement.cells.forEach((cell) => {
      player.defenseGrid[cell] = 'occupied';
    }));

    pushMessage(room, `${player.name} je zaključao svoje riječi.`, 'info');
    const readyCount = room.players.filter((item) => item.ready).length;
    if (canStartBattle(room)) {
      room.status = 'battle';
      room.turn = room.players[0].id;
      room.winnerId = null;
      pushMessage(room, 'Oba igrača su spremna. Bitka počinje.', 'success');
    } else if (readyCount >= 1) {
      room.status = 'setup';
    }

    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Setup nije uspio.' });
  }
});

app.post('/api/rooms/:code/attack', (req, res) => {
  try {
    const room = getRoom(req.params.code);
    if (room.status !== 'battle') throw new Error('Bitka još nije aktivna.');
    const attacker = getPlayer(room, String(req.body?.playerId || ''), String(req.body?.token || ''));
    if (room.turn !== attacker.id) throw new Error('Nisi na potezu.');
    const defender = getOpponent(room, attacker.id);
    if (!defender) throw new Error('Protivnik nije spojen.');

    const index = Number(req.body?.index);
    if (!Number.isInteger(index) || index < 0 || index >= GRID_SIZE * GRID_SIZE) {
      throw new Error('Neispravno polje.');
    }
    if (attacker.enemyGrid[index] !== 'unknown') throw new Error('To polje je već gađano.');

    attacker.moves += 1;
    const word = defender.words.find((item) => item.placement.cells.includes(index));
    if (!word) {
      attacker.enemyGrid[index] = 'miss';
      defender.defenseGrid[index] = 'miss';
      room.turn = defender.id;
      pushMessage(room, `${attacker.name} je promašio ${index + 1}.`, 'info');
      return res.json({ message: 'Promašaj. Potez ide protivniku.' });
    }

    const letterIndex = word.placement.cells.indexOf(index);
    word.revealed[letterIndex] = word.value[letterIndex];
    const allLettersVisible = word.revealed.every((char) => char !== '_');

    if (allLettersVisible) {
      word.guessed = true;
      attacker.score += 5;
      word.placement.cells.forEach((cell) => revealCellForBoth(attacker, defender, cell, 'secured'));
      pushMessage(room, `${attacker.name} je otkrio cijelu riječ od ${word.length} slova.`, 'success');
      checkWin(room, defender, attacker);
      return res.json({ message: `Pogodak i riječ završena: ${word.value}.` });
    }

    revealCellForBoth(attacker, defender, index, 'hit');
    attacker.score += 1;
    pushMessage(room, `${attacker.name} je pogodio slovo u riječi od ${word.length} slova.`, 'success');
    res.json({ message: 'Pogodak. I dalje si na potezu.' });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Napad nije uspio.' });
  }
});

app.post('/api/rooms/:code/guess', (req, res) => {
  try {
    const room = getRoom(req.params.code);
    if (room.status !== 'battle') throw new Error('Bitka još nije aktivna.');
    const attacker = getPlayer(room, String(req.body?.playerId || ''), String(req.body?.token || ''));
    if (room.turn !== attacker.id) throw new Error('Nisi na potezu.');
    const defender = getOpponent(room, attacker.id);
    if (!defender) throw new Error('Protivnik nije spojen.');

    const wordId = String(req.body?.wordId || '') as WordId;
    const guess = String(req.body?.guess || '').toUpperCase().replace(/[^A-ZČĆŽŠĐ]/g, '').trim();
    const word = defender.words.find((item) => item.id === wordId);
    if (!word) throw new Error('Riječ nije pronađena.');
    if (word.guessed) throw new Error('Ta riječ je već riješena.');

    attacker.moves += 1;
    if (guess !== word.value) {
      room.turn = defender.id;
      pushMessage(room, `${attacker.name} je promašio guess za riječ od ${word.length} slova.`, 'error');
      return res.json({ message: 'Krivi guess. Potez ide protivniku.' });
    }

    const hiddenLettersBefore = word.revealed.filter((char) => char === '_').length;
    word.guessed = true;
    word.revealed = [...word.value];
    word.placement.cells.forEach((cell) => revealCellForBoth(attacker, defender, cell, 'secured'));
    attacker.score += 6 + hiddenLettersBefore;
    pushMessage(room, `${attacker.name} je pogodio cijelu riječ: ${word.value}.`, 'success');
    checkWin(room, defender, attacker);
    res.json({ message: `Točno. Riječ je ${word.value}.` });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Guess nije uspio.' });
  }
});

app.post('/api/rooms/:code/restart', (req, res) => {
  try {
    const room = getRoom(req.params.code);
    getPlayer(room, String(req.body?.playerId || ''), String(req.body?.token || ''));
    room.status = room.players.length === 2 ? 'setup' : 'waiting';
    room.turn = null;
    room.winnerId = null;
    room.players.forEach((player) => {
      player.ready = false;
      player.score = 0;
      player.moves = 0;
      player.words = [];
      player.enemyGrid = makeGrid<GridAttackCell>('unknown');
      player.defenseGrid = makeGrid<DefenseCell>('empty');
    });
    pushMessage(room, 'Nova runda je otvorena. Oba igrača trebaju postaviti nove riječi.', 'info');
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Restart nije uspio.' });
  }
});

const distPath = path.resolve(__dirname, '../dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const port = Number(process.env.PORT || 3001);
app.listen(port, () => {
  console.log(`Word War server running on http://localhost:${port}`);
});
