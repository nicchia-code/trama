---
technical: true
refs:
  - requirements/cli#General
  - requirements/tech#task
  - requirements/tech#work
---
# Scelte parallele nella CLI

- `trama task list` con `runnable` accetta `heldBack: true`. L'uscita aggiunge `## Held back` (`--json`: `heldBack`, una lista di `{ id, number, title, overlaps }`), con i Task eseguibili che la regola dei posti liberi ha lasciato fuori perché riguardano la stessa cosa di un Task scelto o di un Task In progress preso dall'agente, ciascuno con i Task con cui si sovrappone.
  - La sezione non contiene i Task bloccati né quelli rimasti fuori solo per mancanza di posti.
  - Vale con gli stessi filtri e non sposta nulla.
  - Senza `runnable`, `heldBack` è un errore d'uso.
  - Si calcola in `src/core` con la stessa funzione che sceglie i Task.
- `trama timing new` con `{ kind, tasks, reason }` registra una scelta nelle timing del lavoro:
  - `kind` vale `release`, `order` o `conflict`;
  - `tasks` contiene almeno due Task esistenti, scritti con l'identità;
  - `reason` è una riga non vuota.

  Un input non valido è un errore d'uso e non scrive nulla. Fuori da un terminale o da una chat di Trama il comando non scrive nulla, lo dice ed esce con 0.
- `trama timing list` mostra la sezione `Parallel choices` per ogni lavoro con almeno una scelta: il conteggio per tipo e una riga per scelta, con tipo, Task e motivo. Con `--json` le scelte stanno nel campo `parallelChoices`.
- Il registro dei comandi, l'help e `docs/cli.md` descrivono `heldBack` e `timing new`.
- Test:
  - `heldBack` elenca un Task trattenuto con il Task con cui si sovrappone, e non elenca un Task bloccato né uno escluso per mancanza di posti;
  - `timing new` rifiuta meno di due Task o un motivo vuoto;
  - `timing list` riassume le scelte.
