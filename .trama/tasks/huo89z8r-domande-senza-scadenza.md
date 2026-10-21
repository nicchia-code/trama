---
column: done
technical: false
refs:
  - question-round
  - agent.STOP_WAITING
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: suaaekyh
agent: false
created: 2026-10-21T14:32:41.460Z
finished: 2026-10-21T14:33:57.591Z
---
# Domande senza scadenza

Un round di domande non viene mai cancellato perché il developer ci mette tanto. Trama non impone nessuna scadenza, e nemmeno l'agente: aspetta le risposte senza limite di tempo, per quanto il developer ci metta. Se l'agente smette comunque di aspettare (agente fermato, terminale chiuso, chiamata annullata, chiamante disconnesso), il round finisce Abandoned come oggi: il round in coda è tolto, l'overlay o la barra si chiudono e nessuna risposta è consegnata. La perdita dell'editor resta `editor.DISCONNECTED` → Interrupted.

Quando è finito:
- Le skill `trama-design`, `trama-import` e `trama-resolve-drifts` (sorgenti in `skills/` e copie installate), nella sezione «Asking», dicono all'agente di lanciare `trama question new` senza limite di tempo: con omp `timeout: 0` nello strumento bash, mai un valore fisso; con Cursor la regola di oggi su `AwaitShell`. Le regole sull'attesa (niente timer, `sleep`, letture periodiche, turni chiusi per farsi risvegliare, nessuna ripetizione del comando) valgono anche con omp.
- `trama-scan`, `trama-implement` e `trama-setup` continuano a rimandare alla sezione «Asking» di `trama-design`, e le regole sull'attesa valgono per loro in Cursor e in omp.
- Con omp, un round lasciato aperto per più di 300 secondi arriva all'agente quando il developer lo invia, con tutte le risposte.
