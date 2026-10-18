---
technical: true
refs:
  - requirements/rules#work
  - requirements/tech#work
  - requirements/data#announcement
---
# Tempi delle fasi

Trama registra quando cominciano e finiscono le fasi del lavoro dell'agente e le riassume con `trama timings`, per misurare scansioni e Run.

Fatto quando:
- `announce check`, `announce phase`, `announce done` (con o senza `--failed`), `task move <id> doing` dell'agente, `task move <id> done` (con o senza `--unchanged`), `drift new --task`, `compare brief`, `compare file` e `task next --batch` aggiungono la loro registrazione in `.trama/timings/`, con l'istante, il terminale o la chat e `job` quando c'è, senza fallire né cambiare la loro uscita se la scrittura non riesce;
- un lavoro comincia con l'annuncio di un pre-flight o del controllo di una scansione e finisce con il successivo dello stesso terminale o della chat; restano gli ultimi 20 lavori; la cartella ha il suo `.gitignore`;
- un'attesa della coda è registrata quando `task next --batch` dà meno Task dei posti chiesti mentre restano Task in To do nel suo ambito, e finisce quando una chiamata seguente ne dà o la corsa non ne chiede più;
- `trama timings [--last <n>] [--json]` stampa per gli ultimi lavori inizio, fine o `running`, durata, fasi dei controlli con esito, confronti di Machine con durata e schede, Task con durata ed esito, totale e attesa più lunga della coda; un `--last` non valido è un errore d'uso;
- nessun timer, nessun processo in più, nessun cambio al pannello; `docs/cli.md` descrive il comando e la cartella.
