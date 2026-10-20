---
technical: true
refs:
  - requirements/cli#General
  - requirements/tech#General
  - requirements/data#General
  - requirements/rules#project
  - requirements/tech#project
  - requirements/tech#panel
  - requirements/ui#General
---
# Registro dei comandi

È la base degli altri Task di questa Proposal e va fatto per primo.

- `zod` 4 è una dipendenza di runtime. Un solo registro in `src/cli` dichiara ogni comando come oggetto, verbo, argomenti posizionali, schema zod dell'input e dell'output, effetti e modo di esecuzione. Ci sono anche `question new` e gli `hook`, così in `bin.ts` non resta nessun ramo speciale e `STANDALONE` sparisce.
- Opzioni comuni: `--root`, `--json`, `--input` (`-` per lo standard input, con un BOM accettato, oppure il testo JSON) e `--help`/`-h`. Nessun comando ha altre opzioni. Se l'input non rispetta lo schema, il comando dà un errore d'uso (codice 2) che elenca ogni problema con il percorso del campo, e nulla cambia.
- `--help` di un comando, `--help --json` (lo schema JSON di input e output), `trama --help` e `trama <oggetto> --help` si generano dal registro, come descrive `cli#General`. Anche l'elenco dei comandi che contano come attività deriva dal registro e resta quello di prima.
- Comandi del Modello: `model show [<ref>]` (System, Feature, Machine, Actor, State, Transition, Event, `requirements` e `requirements/<area>`, con `{ to, max }` per i percorsi), `model list` con `{ text }` e `model check [<machine>]` (errori più avvisi). Sostituiscono `system`, `feature`, `machine`, `state`, `event`, `requirements`, `paths`, `search`, `validate` e `analyze`.
- Comandi del progetto: `project new`, `project edit` e `project show` sostituiscono `init`, `skills update` e `board`. L'estensione inizializza e aggiorna le skill con `project new` e `project edit`, passando la cartella delle skill configurata in `skillsDir` e `force: true` dopo la conferma.
- Tolti senza alias: i nomi vecchi di questi comandi, e `ids rewrite` con il suo codice in `src/core` e i suoi test. Un nome vecchio dà l'errore d'uso con il rimando a `trama --help`.
- I messaggi di errore e i suggerimenti in `src/core` e `src/cli` nominano solo i comandi nuovi. `docs/cli.md` prende dal registro il riferimento dei comandi, e descrive `--input` e `--help`. Le README e la nota per PowerShell di skill e documentazione (JSON con una pipe e `--input -`, mai come testo di `--input`) usano solo i comandi nuovi.
- Lo smoke test del binario Windows nella release usa `trama.exe --help`, `project new`, `model check` e `hook copilot`.
- I test che chiamano i comandi vecchi passano ai nuovi. Nuovi test coprono il rifiuto di un input fuori schema, con tutti i percorsi dei campi e senza scrivere nulla, e l'errore d'uso di un nome vecchio.
