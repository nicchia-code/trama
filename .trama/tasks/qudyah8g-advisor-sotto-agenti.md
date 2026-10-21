---
column: done
technical: true
refs:
  - requirements/rules#work
  - requirements/tech#agent-launching
  - requirements/cli#General
  - requirements/quality#agent-launching
drift: null
proposal: n658x9k9
agent: false
created: 2026-10-21T04:39:52.127Z
finished: 2026-10-21T04:41:55.577Z
---
# Advisor nei sotto-agenti

Fatto quando gli advisor di Trama riconoscono un Run dal segno nel terminale, non dal testo dell'istruzione, e quindi lavorano anche nei sotto-agenti:

- L'estensione lancia ogni Run con l'Advisor Scanner attivo (quello che riceve l'overlay e `--advisor`) in un terminale che ha anche `TRAMA_ADVISOR_SCANNER=1`, accanto a `TRAMA_AGENT`, `TRAMA_TERMINAL` e `TRAMA_JOB`. Ogni altro terminale non ha la variabile: Run senza Advisor Scanner, design, import, scan, Resolve Drifts, risoluzione automatica, setup.
- Esiste `trama advisor show`, dichiarato nel registro dei comandi come gli altri, senza campi di input. Legge solo `TRAMA_ADVISOR_SCANNER`: con `1` dice in una riga che l'Advisor Scanner è attivo per questa sessione; senza la variabile, o con un altro valore, dice che non lo è e che gli advisor di Trama tacciono. Con `--json` stampa `{ "advisorScanner": true|false }`. Esce con 0 in entrambi i casi, non legge `.trama/`, non contatta l'editor e non conta come attività dell'agente. `trama --help` elenca l'oggetto `advisor` con il verbo `show`, e `docs/cli.md` lo descrive.
- `ADVISOR_INSTRUCTIONS` (`.omp/WATCHDOG.yml`) dice all'advisor di lanciare `trama advisor show` alla prima revisione di ogni sessione, e di nuovo dopo un azzeramento del contesto, prima di ogni altro comando o nota. Se il comando non dice che l'Advisor Scanner è attivo, o fallisce, l'advisor tace per tutta la sessione. Non giudica mai il Run dal testo dell'istruzione, dall'assegnazione di un sotto-agente o dalle skill. Le istruzioni non nominano più la frase "The Advisor Scanner is on" come condizione.
- Prima di archiviare un Drift l'advisor guarda con `trama task list` i Task In progress. Il codice che sta scrivendo un altro sotto-agente della corsa è lavoro di un Task, non codice già esistente: per quello non nasce nessun Drift.
- La frase dell'Advisor Scanner resta nell'istruzione del Run, per l'agente che lo guida.
- Il controllo all'apertura e Update skills riscrivono `.omp/WATCHDOG.yml` con il testo nuovo, come oggi per ogni cambio delle istruzioni.
- La spiegazione dell'impostazione, `README.md` e `docs/` dicono che, in una sessione di omp avviata a mano con l'advisor acceso, gli advisor di Trama lanciano solo `trama advisor show` e poi tacciono.
- Un test copre `trama advisor show`: risponde sì con la variabile a `1` e no senza variabile o con un altro valore, in Markdown e in JSON. Un altro test copre il lancio: la variabile c'è nell'ambiente del terminale di un Run con l'overlay degli advisor e manca in un Run senza.
