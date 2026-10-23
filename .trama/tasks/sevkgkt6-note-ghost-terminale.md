---
column: done
technical: false
refs:
  - agent.DECLARE_ANNOUNCEMENT_NOTE
  - requirements/cli#agent.DECLARE_ANNOUNCEMENT_NOTE
  - requirements/rules#agent.DECLARE_ANNOUNCEMENT_NOTE
  - requirements/tech#agent.DECLARE_ANNOUNCEMENT_NOTE
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:06:18.003Z
---
# Note dei ghost dal terminale

Una nota dichiarata senza identità di annuncio va a ogni annuncio ancora in attesa dello stesso terminale di chi la dichiara (`TRAMA_TERMINAL`; una conversazione di omp Chat ha quella del terminale che sostituisce), tranne i confronti. Alla fine:

- La scelta degli annunci in `declareNote` (`src/core/announcements.ts`) non guarda più `TRAMA_CHAT`, `chat` né `conversation`, e non esiste più il caso degli annunci della chat del progetto: chi non ha un terminale non ha annunci, e il comando dice in una riga che non c'è nessun annuncio a cui andare ed esce con 0, senza scrivere nulla.
- Le regole di scelta riusano quelle con cui un annuncio appartiene a un terminale, non una copia.
- Il comando non conta come attività dell'agente e non contatta l'editor; la frase che diceva che non rende di Trama una conversazione della chat di Cursor sparisce dall'aiuto e da `docs/cli.md`.

Test: i casi con `TRAMA_CHAT` o `CURSOR_AGENT` dei test delle note dei ghost (`test/announcements.test.ts`) spariscono; resta un caso senza terminale che non scrive nulla ed esce con 0.
