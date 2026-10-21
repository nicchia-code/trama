---
status: approved
base:
  agent-launching/feature.md: bdc5d7e9ef99eb31c5603ac1ee6e63a633861f8791cdbd9827d492a8a100df5f
  editor-panel/panel.md: 785d03fba6de18de64da709946b2e557eaf9569ef0ab1915190799870e1474c8
  requirements/rules/models.md: 4a4385534d14a70dc52c119309ed5f0b954a554a8c5bdf3ca3194e1b11351a66
  requirements/ui/agents.md: 2623e48f0674869a8fdf06fd2648884b38258a41ece5cff64c090f27873a6c4f
  requirements/ui/settings-specs.md: 649a4a2418387d1a3299ad5d17fd90a7a5a04a8c875ac427fb9ea83c1661e3ae
  requirements/tech/settings.md: 1344dbff7e84f95ca186400f06a3683032cf00aa24ff848c12caa7fb35cc7ccd
  requirements/tech/proposal.md: d9e7fd31585e23be496a877e7fcbfdb639520dec3aabe4a342c6717e77f48242
  requirements/quality/agents.md: 07c949f85d113c90999703245430a663fa7d7a3865e1691c9031e64522470256
delete: []
request: 2026-10-21T11-58-07
created: 2026-10-21T10:16:31.040Z
label: Context Sharing
---
# Context Sharing sperimentale

Oggi i sotto-agenti ricevono quasi solo identità e comandi e rileggono ciò che l'agente principale ha già letto (Modello, Requisiti, testi di Task e Drift, posizioni nel codice): token e tempo sprecati. Con la funzione sperimentale Context Sharing l'agente principale passa a ciascun sotto-agente il contesto già raccolto che riguarda la sua parte.

## Decisioni
- Vale per ogni lavoro con sotto-agenti: design (esplorazione, scrittura dei Task, scan leggero), scan e pre-flight, implement, Resolve Drifts, preparazione asincrona dei Drift.
- Si passa solo ciò che riguarda la parte del sotto-agente, più una parte comune breve (richiesta, decisioni); mai tutto ciò che il principale ha raccolto.
- Forma: testi di Trama citati tali e quali (richiesta, uscite di `model show`, `task show`, `drift show`, `proposal show`, decisioni dell'intervista) e posizioni nel codice (file e simboli), mai il codice stesso.
- Il sotto-agente non rilegge i testi di Trama ricevuti; legge sempre il codice, anche alle posizioni ricevute, e lancia sempre i comandi che registrano (`trama task move <id> doing`, `trama comparison new`).
- Il sotto-agente continua a caricare la skill intera; nessuna definizione di sotto-agente nuova.
- I resoconti dei sotto-agenti riportano le posizioni nel codice una riga per riferimento, ``- `<ref>` — <dove nel codice>``, così il principale le riusa.
- Solo testo delle skill: nessun briefing nuovo della riga di comando.
- Le skill lo dicono in modo neutro rispetto all'agente; vale con omp e con la chat di Cursor.
- Il sotto-agente `trama-analysis` riceve in più solo le posizioni nel codice già note e il motivo di ogni voce dello scope; i divieti su liste di schede e General restano.
- Funzione sperimentale `trama.experimentalContextSharing`, `Experimental Context Sharing`, spenta per impostazione predefinita, letta solo dalle impostazioni utente; arriva all'agente con una frase sulla riga di ogni istruzione che ha la frase del limite. Spenta: istruzioni e skill come oggi.
- Descrizione dell'impostazione: la versione lunga proposta.
- Fuori dall'interruttore: Resolve Drifts esplora con al massimo N sotto-agenti, l'N dell'istruzione (20 senza), non più quattro, come già dice `rules#agent-terminal`.

## Scelte dell'agente da controllare
- Testo della frase: "The experimental context sharing is on: pass each sub-agent what you have already read that concerns its part, as the \"Experimental context sharing\" section of your skill says.", subito prima della frase delle domande.
- Posto dell'impostazione: ultima del gruppo Experimental, dopo `trama.experimentalAsyncDriftResolver`.
