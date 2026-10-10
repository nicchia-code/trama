---
column: done
technical: false
refs:
  - drift-resolution/Free/developer.ASK_AGENT
  - drift-resolution/Running tasks
  - drift-resolution/Resolving
  - requirements/rules#drift-resolution
drift: null
proposal: null
agent: false
created: 2026-10-09T08:41:40.126Z
finished: 2026-10-09T09:25:54.947Z
---
# Check the Run and Resolve Drifts exclusion when the instruction is sent

Oggi l'host controlla se Resolve Drifts o un Run possono partire solo quando arriva la richiesta, ma l'istruzione parte più tardi: dopo la scelta dell'agente o del comando, l'apertura della chat di Cursor o della finestra del terminale esterno. In quell'intervallo Drift resolution è ancora in Free e il pulsante è ancora abilitato, così un doppio clic su Resolve Drifts manda due agenti di risoluzione, e un Run e Resolve Drifts lanciati quasi insieme partono entrambi.

Quando è fatto:
- Resolve Drifts parte solo se, nel momento in cui l'istruzione è davvero scritta nel terminale o inviata dalla chat, Drift resolution è in Free, c'è almeno un Drift aperto e nessuna Proposal di risoluzione è in scrittura o aperta; altrimenti non invia nulla e il developer è avvisato del motivo.
- Run all To do, Run this design e il Run di un Task non partono se, al momento dell'invio, l'agente di Resolve Drifts lavora (anche se è stato lanciato mentre questa richiesta aspettava); il developer è avvisato che una risoluzione dei Drift è in corso.
- Resolve Drifts lancia sempre un solo agente, anche con un doppio clic.
- L'istruzione di Resolve Drifts copre i Drift aperti al momento dell'invio, non quelli aperti al momento del clic.
