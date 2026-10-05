---
column: done
technical: true
refs:
  - requirements/rules#question-round
  - requirements/tech#question-round
  - requirements/tech#announcement
  - requirements/tech#drift
  - requirements/tech#proposal
  - requirements/tech#task
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.110Z
---
# Insegnare alle skill a usare solo la riga di comando

Le quattro skill spedite (`trama-design`, `trama-scan`, `trama-implement`, `trama-import`) parlano solo di comandi `trama`.

- Spariscono l'introduzione sugli strumenti, la tabella 'CLI / strumento', la frase sull'assenza di strumenti per approvare e ogni nome `trama_*` e riferimento a MCP o a VS Code come fonte di strumenti.
- `trama-design` e `trama-import` usano `trama ask --root <progetto>` per ogni round di domande. Solo se l'editor non è disponibile prima dell'ammissione ripiegano sullo strumento di domande dell'agente, o su un round numerato in conversazione; restano invariate le regole su errori di input, salti ed `editor-interrupted`.
- Le skill spiegano ancora che si annuncia, si valida, si consegna con `trama proposal submit` e che la riscrittura di un file riporta la Proposal in Bozza.
- Le copie installate nei progetti si aggiornano con 'Aggiorna le skill'.
