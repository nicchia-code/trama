---
status: approved
requires:
  - 6wf3grcz
base:
  work/task.md: 2e3ae273b330a592a8b35ee62fa94bd9597c28c7d53c0d19dcf1f3cf33050e79
  requirements/rules/models.md: b0a6df4f488d5f3fb265c35f507b3af1d8aef2a4e65333cfb591940f95f6d1d7
  requirements/tech/gruppi.md: new
  requirements/tech/sotto-agenti.md: 756574fae05bde9d7237202899ad83b560582b7953614e2ffbdffef328b1477c
  requirements/cli/main.md: 78a13b85d31d7411e3ff0255dda82699a5593c4aa9dad532cfaded27f981ab29
delete: []
created: 2026-10-24T08:02:22.786Z
label: Gruppi
---
# Gruppi di Task

Nei Run misurati il tempo si perde attorno ai Task più che nei Task: un Task dura in mediana 1,4 minuti, e fra la fine di uno e l'inizio del successivo passano in mediana 0,9 minuti, mentre l'agente principale aspetta il sotto-agente, richiede i Task e ne avvia un altro. Con Parallel Execution, Trama propone gruppi di Task che toccano le stesse cose: un solo sotto-agente realizza un gruppo, un Task dopo l'altro, senza tornare dall'agente principale fra un Task e l'altro, e con il codice già letto. I gruppi partono in parallelo, prima i più lunghi.

## Decisioni

- Trama calcola i gruppi e l'agente principale decide: può unire due gruppi o dividerne uno, ogni volta con un motivo di una riga.
- Un sotto-agente realizza al più 3 Task di un gruppo; il resto del gruppo passa a un sotto-agente nuovo, con un riassunto di ciò che il primo ha letto e fatto.
- Gruppi, piano di Trama e ordine dei gruppi valgono solo con Parallel Execution accesa; spenta, ogni Task ha il suo sotto-agente come oggi.

## Assunzioni da verificare

- Due Task stanno nello stesso gruppo quando riguardano la stessa cosa del Modello o quando i loro testi nominano lo stesso file del progetto, anche attraverso altri Task del gruppo.
- L'ordine dei gruppi mette prima quello con più Task, poi quello con il Task più vecchio; dentro un gruppo i Task vanno dal più vecchio.
- Ogni gruppo occupa un posto del limite dei sotto-agenti.
- Le unioni si registrano nei tempi come ordini e le divisioni come vie libere, senza un tipo nuovo di scelta.
- Un Task del gruppo fermato da un Drift resta in doing e il sotto-agente va avanti con gli altri non bloccati; una prenotazione che ferma il sotto-agente ferma tutto il resto del gruppo, che torna all'agente principale.
