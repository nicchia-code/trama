---
description: "Usa quando implementi l'esclusione dei file di istruzioni degli agenti nei lanci di omp."
---
# Regole dei file di istruzioni

## agent-terminal/Agent running
- L'esclusione vale quando `trama.ignoreInstructionFiles` è acceso nelle impostazioni utente, letti a ogni lancio, per ogni lavoro che Trama avvia in un terminale o in omp Chat: design (richiesta scritta e richiesta di setup), import, scan del System, implement, implement all, ogni Run di una sequenza per modello e Resolve Drifts. Vale per l'agente principale, per i suoi sotto-agenti (`trama-analysis` compreso) e per gli advisor dell'Advisor Scanner. Spenta, assente o non booleana, il lancio resta esattamente com'era.
- I file esclusi sono quelli che la ricerca del wizard troverebbe in quel momento (`rules#setup-wizard`), cercati di nuovo a ogni lancio sulla cartella del progetto: file del progetto, `AGENTS.md` e `CLAUDE.md` delle cartelle sopra fino alla home esclusa, file dell'utente. Si escludono per nome e livello, come omp li riconosce:
  - `AGENTS.md` del progetto, delle cartelle sopra, di `.agents/` e di `.omp/` → il file di contesto `AGENTS.md` del progetto; `CLAUDE.md` del progetto e delle cartelle sopra → il file di contesto `CLAUDE.md` del progetto;
  - `~/.omp/agent/AGENTS.md` e `~/.agents/AGENTS.md` → il file di contesto `AGENTS.md` dell'utente; `~/.claude/CLAUDE.md` → il file di contesto `CLAUDE.md` dell'utente;
  - `.omp/RULES.md` → la regola fissa del progetto; `~/.omp/agent/RULES.md` → la regola fissa dell'utente;
  - ogni file di `.cursor/rules/`, del progetto o dell'utente → la regola con il nome del file senza `.mdc` o `.md`;
  - `.cursorrules` non ha un'esclusione: omp 18.12.1 non lo legge (da riverificare a ogni versione di omp); l'avviso del wizard lo elenca comunque, perché lo legge Cursor.

  Gli altri apporti di Cursor e degli altri strumenti a omp (server MCP, skill, comandi) restano.
- Le esclusioni che il developer ha già nella configurazione di omp restano: valgono quelle della configurazione del progetto (`.omp/config.yml`) se le dichiara, altrimenti quelle della configurazione dell'utente (`~/.omp/agent/config.yml`), e Trama aggiunge le sue senza doppioni. Una configurazione che manca o non si legge non ferma il lancio: Trama aggiunge solo le sue.
- Senza file trovati il lancio non porta esclusioni di Trama ed è come con l'opzione spenta.
- Le skill di Trama, i suoi sotto-agenti (`.omp/agents/`) e `.omp/WATCHDOG.yml` non si escludono mai.
