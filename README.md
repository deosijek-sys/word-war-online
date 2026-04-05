# Word War Online

Online igra inspirirana Battleshipom, ali s riječima.

## Što radi
- 2 igrača ulaze u istu sobu preko koda
- svaki postavlja 4 riječi: 6, 5, 4 i 3 slova
- riječi se ne smiju preklapati ni dodirivati
- klik na protivnički grid otkriva slovo ili promašaj
- možeš pokušati pogoditi cijelu riječ prije nego što je skroz otkriješ
- pobjeda kad potopiš sve 4 protivničke riječi

## Pokretanje lokalno
Trebaš **dva terminala**.

### Terminal 1
```bash
npm install
npm run server
```

### Terminal 2
```bash
npm run dev
```

Aplikacija će biti na `http://localhost:3000`, a API server na `http://localhost:3001`.

## Produkcija
```bash
npm install
npm run build
PORT=3001 npm run server
```

Kad postoji `dist/`, Express server će servirati i frontend.
