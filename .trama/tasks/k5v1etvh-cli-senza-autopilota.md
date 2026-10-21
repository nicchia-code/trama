---
column: done
technical: true
refs:
  - requirements/cli#General
  - requirements/rules#General
  - requirements/tech#General
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: c9fp4trm
agent: false
created: 2026-10-21T05:42:19.328Z
finished: 2026-10-21T05:44:55.895Z
---
# CLI senza autopilota

Quando il Task è fatto, la riga di comando e le regole generali non conoscono più la delega dei Drift.

- L'oggetto `autopilot` non esiste più (`src/cli/commands/autopilot.ts`, il registro in `src/cli/registry.ts` e `src/cli/index.ts`): `trama autopilot show` e `trama autopilot move` rispondono come ogni oggetto sconosciuto, con il rimando a `trama --help`. Il registro non dichiara più l'effetto «manda messaggi al coordinatore»: i comandi mandano messaggi all'editor.
- `proposal new` accetta `{ title, body?, kind?, label?, requires?, nonBlocking?, announcement?, request? }`: senza `automatic` né `job`. `announcement new` accetta `{ kind, title, phase? }`: senza `job`. `announcement move <id> failed` resta e chiude il controllo con esito fallito. `drift new` non accetta più `critical`. `task list` tiene il filtro `tasks`, anche con `runnable`. `docs/cli.md` deriva dal registro e lo dice.
- Le regole generali (`rules#General`, `tech#General`) non hanno più l'eccezione della delega: la skill di risoluzione non registra più una raccomandazione delegata e l'host non approva nessuna risoluzione da sé; le skill descrivono soltanto la regola della richiesta esplicita del developer.
- Dentro un Run (pre-flight e scansione di fine corsa) lo scan non fa domande; non esiste più un Run automatico (`rules#question-round`). Nella sandbox di Cursor la cartella dei record serve a `trama question new`, alle segnalazioni di attività e agli annunci, non più a `trama autopilot show` (`tech#question-round`).
