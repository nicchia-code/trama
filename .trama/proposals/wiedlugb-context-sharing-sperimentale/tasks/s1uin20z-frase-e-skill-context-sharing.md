---
technical: false
refs:
  - agent-launching
  - requirements/rules#agent-launching
  - requirements/quality#agent-launching
---
# Frase e skill Context Sharing

Con Context Sharing, funzione sperimentale spenta per impostazione predefinita che vale con ogni agente (`omp` e la chat di Cursor), l'agente principale, quando affida una parte del lavoro a un sotto-agente, gli passa ciò che ha già letto e che riguarda quella parte, così il sotto-agente non lo cerca e non lo rilegge, in ogni lavoro con sotto-agenti: design, scan, Run, Resolve Drifts e la preparazione delle domande dei Drift. Spenta, ogni sotto-agente legge da sé ciò che gli serve e istruzioni e skill restano esattamente come oggi. Questo Task copre la frase dell'istruzione e le sezioni delle skill; la dichiarazione, il gruppo, la scheda Settings e la lettura dell'impostazione (`configuredContextSharing`) sono di un altro Task di questa Proposal.

## Frase dell'istruzione

- Context Sharing è attivo quando `trama.experimentalContextSharing` è acceso, letto quando un lavoro sta per partire. Spento, assente o non booleano vale spento: l'istruzione resta esattamente com'era. Un agente senza sotto-agenti la ignora.
- Con l'impostazione accesa, ogni istruzione che porta la frase del limite "Run at most N sub-agents at once." (design, scan di ogni tipo, implement, implement all, ogni Run di una sequenza per modello, Resolve Drifts, import) porta sulla stessa riga, subito dopo la frase dell'Async Drift Resolver o, senza quella, dove starebbe (dopo le frasi del limite, dei sotto-agenti, dell'esecuzione parallela e del Drift blocker, prima di quella delle domande e della lingua), la frase:
  "The experimental context sharing is on: pass each sub-agent what you have already read that concerns its part, as the \"Experimental context sharing\" section of your skill says."
- La frase è una costante in `extension/src/host/prompts.ts` accanto a `ASYNC_DRIFT_RESOLVER_SENTENCE`, aggiunta in `agentPrompt` (`extension/src/host/agent.ts`) alle istruzioni che portano la frase del limite; la riga di comando non la legge. Nella chat di Cursor la frase sta sulla prima riga come le altre frasi sperimentali.

## Sezioni delle skill

Le skill distribuite `trama-design`, `trama-scan`, `trama-compare`, `trama-implement`, `trama-import` e `trama-resolve-drifts` (in `skills/`) hanno una sezione "Experimental context sharing" che vale solo quando l'istruzione porta la frase, scritta in modo neutro rispetto all'agente ("in whatever way your agent starts sub-agents"), che dice:

- Cosa passa: affidando una parte a un sotto-agente, l'agente principale gli passa, di ciò che ha già letto, solo ciò che riguarda quella parte, più una parte comune breve (richiesta e decisioni, quando ci sono): i testi di Trama citati tali e quali (richiesta scritta con le immagini messe in parole, uscite di `trama model show`, `task show`, `drift show`, `proposal show`, decisioni dell'intervista) e le posizioni nel codice già note, una riga per riferimento ``- `<ref>` — <dove nel codice>``. Mai il codice, mai tutto ciò che ha raccolto, e nulla che legga apposta per passarlo.
- Il sotto-agente non rilegge i testi di Trama ricevuti e legge da sé solo quelli che mancano. Legge sempre il codice, anche alle posizioni ricevute, lancia sempre i comandi che registrano (`trama task move <id> doing`, `trama comparison new`, `trama drift new`) e carica la sua skill come senza la funzione. Una posizione ricevuta che non corrisponde più al codice si ignora e il sotto-agente cerca da sé; Context Sharing non ferma mai un lavoro.
- Per lavoro:
  - `trama-design`: l'esplorazione riceve la richiesta e le parti di `trama model show` già lette sulla sua parte; chi scrive i Task di una Machine riceve le decisioni, il testo nuovo del Modello e dei Requisiti dei suoi riferimenti e le posizioni trovate dall'esplorazione; lo scan leggero riceve le posizioni vicine alle sue voci.
  - `trama-scan` e il pre-flight e lo scan di fine corsa di `trama-implement`: `trama-analysis` riceve solo le posizioni note e il motivo di ogni voce dello scope; liste di schede e General restano fuori, come oggi. `trama-compare` dice come usare le posizioni e i motivi ricevuti, senza togliere nulla al suo briefing.
  - `trama-implement`: un sotto-agente riceve il testo di `trama task show` quando il principale l'ha già letto (esecuzione parallela sperimentale) e le posizioni del pre-flight; prende comunque il Task con `trama task move <id> doing` e salta `trama task show` solo se ha ricevuto il testo.
  - `trama-resolve-drifts` e la preparazione delle domande (sezioni "Async Drift Resolver" di `trama-scan`, `trama-implement`, `trama-import`): per ogni Drift passano `drift show`, la Proposal allegata, la catena `previous` e dove sta il codice; il codice di Where in the code si rilegge comunque prima di decidere.
- Resoconti: con la frase, ogni sotto-agente riporta dove ha trovato il codice di ciò che ha visto, una riga per riferimento come sopra; il principale le riusa in `## Already present`, nel proprio lavoro e per i sotto-agenti successivi.
- Con l'impostazione accesa nessun sotto-agente rilancia un comando di sola lettura di Trama per un testo che ha ricevuto, e il contesto passato a ciascuno riguarda solo la sua parte, così non si copia tutto ciò che il principale ha raccolto in ogni sotto-agente.

Il prompt del sotto-agente `trama-analysis` (`src/core/sub-agents.ts`) e i resti delle skill fuori dalla sezione non cambiano. `CHANGELOG.md` descrive la frase e le sezioni.
