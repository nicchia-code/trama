---
column: done
technical: false
refs:
  - question-round/Answered
  - question-round/Unanswered
  - question-round/Interrupted
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: hlnh5d44
agent: false
created: 2026-10-09T07:12:05.799Z
finished: 2026-10-09T08:16:24.012Z
---
# Apply the question-round rules to trama-resolve-drifts and its CLI docs

Complemento del Task oj36leyz (Add the trama-resolve-drifts skill), che crea la skill e il suo round: qui solo le regole del round di domande che quel Task non nomina.

La skill `trama-resolve-drifts` usa `trama ask` come `trama-design` e `trama-import`:
- descrive la richiesta con i campi facoltativi `context` e `details` (non vuoti quando ci sono); `question` è una frase breve che si legge da sola, lo sfondo del Drift sta in `context`, il compromesso in poche parole in `description`, pro e contro in `details`; niente opzione «Other»;
- solo un `status: "unavailable"` iniziale è editor non disponibile: un errore d'uso (uscita 2, argomenti sbagliati) o `invalid-input` si corregge e si ripete, mai con le proprie domande; nel sandbox di Cursor (`CURSOR_SANDBOX`) un `unavailable` si riprova una volta fuori dal sandbox; si aspetta la fine di `trama ask` anche oltre 30 secondi, senza ripeterlo; una domanda saltata non si richiede col ripiego;
- `editor-interrupted` ferma il lavoro: nessuna risoluzione aperta o consegnata con risposte parziali o raccomandazioni, nessun ripiego né nuovo tentativo; lo dice al developer;
- la risposta libera data con il comportamento del codice guida le modifiche al Modello; finito il round la risoluzione si apre senza chiedere conferma di un riepilogo.

`docs/cli.md`, dove dice che per un salto l'agente applica la raccomandazione, nomina l'eccezione di `trama-resolve-drifts`: la domanda saltata lascia il Drift fuori dalla risoluzione e aperto.

Fatto quando la skill e `docs/cli.md` dicono tutto questo.
