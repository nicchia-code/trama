---
column: done
technical: true
refs:
  - requirements/tech#agent
  - requirements/rules#project
drift: null
proposal: 6wf3grcz
agent: false
created: 2026-10-24T08:14:14.041Z
finished: 2026-10-24T08:19:08.422Z
---
# Definizione trama-implementer

Trama installa nei progetti un secondo sotto-agente di omp, `trama-implementer`, che realizza un solo Task con le istruzioni nel suo prompt, senza leggere la skill `trama-implement`.

Quando è fatto:
- `SUB_AGENTS` in `src/core/sub-agents.ts` ha la voce `trama-implementer` con una `description` breve ("Implements one Trama Task and reports how it ended.") e il `prompt` in inglese, sotto i 6 KB, con tutto ciò che `tech#agent-launching` elenca: muovere il Task in `doing` (un rifiuto per blocco chiude il lavoro e lo riporta); leggerlo una volta con `trama task show <id>` o usare il testo ricevuto; guardare le immagini ricevute; per un Task di correzione controllare prima la premessa e chiuderlo con `unchanged` e la nota quando il codice è già giusto; leggere il codice e seguirne le convenzioni; scrivere codice e test del comportamento lanciando solo i test propri; dichiarare l'avanzamento a multipli di 10; portarlo in `done`; i divieti (mai `trama task list`, mai un altro Task, mai la suite intera, il lint o la build, mai una scansione, mai il Modello o i Requisiti, mai History, mai annunci di controlli); la prenotazione dei file (fermato, si ferma subito e torna con file e sotto-agente che lo tiene); per un Drift la lettura delle sole sezioni "When you must file a Drift", "Writing a Drift" e, se l'istruzione la nomina, "Drift blocker" della skill, con "Announcing cards", lasciando il Task in `doing`; le note dell'advisor da correggere prima di `done`; il resoconto con Task, esito e, con Sub-agents Context Sharing, le posizioni nel codice; la lingua dell'istruzione e niente prima persona nei testi per Trama.
- `ompAgentFiles` / `OMP_ROLES` in `src/cli/skills.ts` generano `.omp/agents/trama-implementer.md` senza `model`, così il sotto-agente usa il modello del processo principale. Si verifica con omp 18.12 che una definizione senza `model` erediti il `--model` del processo principale; se non lo eredita, la definizione usa il valore che omp documenta per ereditarlo, e il test lo fissa.
- Inizializzazione, Update skills e il controllo all'apertura scrivono, confrontano e riscrivono `trama-implementer.md` con le stesse regole di `trama-analysis.md`: conflitto all'inizializzazione con il dialogo modale, riscrittura senza chiedere, resoconto che lo dice, scrittura solo quando il contenuto è diverso.
- I test esistenti della definizione `trama-analysis` (installazione, conflitti, controllo all'apertura) coprono anche `trama-implementer`.
- `docs/` e `CHANGELOG.md` descrivono il nuovo sotto-agente.
