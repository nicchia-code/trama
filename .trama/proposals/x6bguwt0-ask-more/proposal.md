---
status: approved
base:
  actors/developer.md: a484aad9ce5dea505cb5d4f0dd83786d1be93a29a5d37ac81586673c91ad0804
  editor-panel/panel.md: 47af312a0d75e2a528b11f98505bdade91b8de5e12e4ee1d47db6df85e93e3b8
  agent-questions/question-round.md: 87ea13bb8b38fb36223883903c160a1967615bbefa0c852f764ecd9c40f97b73
  agent-launching/agent-terminal.md: b949b5e587f6cb2e97ccf079134063a50d4e04c998d1e7b1aedcb449c90cad28
  agent-launching/feature.md: 7438276ad01382ac6adfcdd690eb6f4bac17f6d99e58e46aa118a00d4aaa3203
  requirements/ui/ask-more.md: new
  requirements/rules/ask-more.md: new
  requirements/tech/ask-more.md: new
  requirements/ui/board.md: b8f53213352b253ae9428c9159910a6015d1251c3a4589d5c9fc2d953dbcbfb5
  requirements/ui/tasks.md: 6e6009b28465d71b921353e299353af5c8b191fb8abd06d5c9d68328054a3bb2
  requirements/ui/work.md: 51db6dc9561409490d441a28fcaa2afe211764f8e6766f67422d07b475dbb3ca
  requirements/ui/panel.md: f33b61ff24d3b8e723173ac1f4d98a4fdd9252b0e14333853f638908f39616ff
  requirements/tech/proposal.md: dc7e60183a2cdf2a9e17f65c4f4ea442d0cb80f0ed149d0259e137f3837b59bc
  requirements/data/agents.md: e3cd685de8718b4a081e3f5f1622818f5b86f52b75027231543b5a387405a755
  requirements/rules/agent-terminal.md: 653a49d885206b14129c3d3d8c20e354f0c0024b799eceb654ba438aa5d446da
delete: []
request: 2026-10-23T11-28-32
created: 2026-10-23T09:44:31.518Z
label: Ask more
---
# Ask more

Il developer vuole poter chiedere spiegazioni su una scheda o su una domanda senza scrivere da sé il contesto. Un'azione `Ask more` apre una chat con l'agente scelto (omp o la chat di Cursor) che riceve la scheda, i suoi riferimenti e i comandi per leggerli, e risponde alle domande del developer.

## Decisioni
- `Ask more` sta nei modali di dettaglio: quello della Proposal (già esistente) e due modali nuovi per Task e Drift.
- Task e Drift non avevano un modale: il clic sulla scheda (fuori dai pulsanti) apre ora un modale di dettaglio, che sostituisce il toggle `Show details` nelle schede Task e Drift.
- Il modale del Task e quello del Drift sono da leggere: hanno solo `Ask more` e `Close`; le azioni restano sulla scheda.
- Nei modali `Ask more` sta nel piede, a sinistra di `Close`, con icona `MessageCircleQuestion` e tooltip `Ask an agent about this Task` / `Proposal` / `Drift`.
- Nel round di domande `Ask more` riguarda la sola domanda in vista e sta in alto a destra della domanda, con tooltip `Ask an agent about this question`; il round resta in vista.
- Per una domanda il prompt porta per intero la domanda in vista (testo, contesto, opzioni con descrizioni e dettagli, raccomandazione), più testo e opzioni delle altre domande del round senza risposte, e il riferimento al Drift per una domanda pronta. Nulla va su disco.
- Per Task, Proposal e Drift il prompt porta identità permanente, numero breve, titolo, il testo completo della scheda, le schede collegate e i comandi per leggere tutto.
- La chat si comporta come un Quick Task: si apre nuova, prende il focus, non è un lavoro che disabilita pulsanti; con omp un terminale e un ghost di lavoro propri, con la chat di Cursor una conversazione che Trama non segue, senza ghost.
- L'istruzione parte da sola: l'agente legge i riferimenti e aspetta la domanda del developer.
- L'istruzione è un testo fisso incluso nell'estensione (come Unify Drifts), con una prima riga fissa, mandato insieme alla parte che descrive la scheda; non rende la conversazione di Trama.
- La chat spiega e, quando il developer lo chiede, può sistemare schede solo con i comandi di Trama esistenti (per esempio riaprire una Proposal e riscriverne i Task, unificare Drift); le decisioni solo su richiesta esplicita. Se nessun comando lo permette lo dice e indica la via di Trama (richiesta di design, Resolve, Rework with feedback), senza mai scrivere a mano in `.trama/`.
- `Ask more` è sempre disponibile.
- Modello: ruolo di analisi (`trama.analysis`).
- Frasi aggiunte: solo la frase della lingua e, nella chat di Cursor, la riga del `PATH`.
- Con omp terminale e ghost si chiamano `Ask T3`, `Ask P2`, `Ask D1` (numero breve) e `Ask question`.

## Assunzioni da verificare
- Con la chat di Cursor la consegna segue i passi di ogni istruzione (chat che invia da sola, poi collegamento al prompt, poi appunti); fuori da Cursor il prompt va negli appunti con l'avviso di ogni istruzione. Nessun passo avvia un lavoro.
- Con omp il terminale di `Ask more` non ha l'hook di Trama, come il terminale Quick.
- Il modale del Task segue il Task mentre i file cambiano e si chiude da solo quando il Task lascia Active; quello del Drift quando il Drift lascia Backlog, come il modale della Proposal.
