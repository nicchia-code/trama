---
column: done
technical: true
refs:
  - requirements/rules#question-round
  - requirements/tech#question-round
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.161Z
---
# Insegnare a trama-design e trama-import i campi context e details e l'apertura diretta della Proposal

Le skill distribuite con Trama usano bene il nuovo overlay e trama-design non chiede più conferma di un riepilogo.

Fatto quando:
- `trama-design` e `trama-import` descrivono i campi facoltativi `context` (sulla domanda) e `details` (sull'opzione) della richiesta di `trama ask`;
- le skill tengono `question` breve, una frase che si legge da sola, e mettono lo sfondo della decisione in `context`, il compromesso in poche parole in `description` e la spiegazione lunga, quando serve, in `details`;
- in `trama-design` il passo di conferma della comprensione condivisa sparisce: finito l'ultimo round l'agente apre la Proposal e la scrive, mettendo nel corpo il riassunto delle decisioni;
- le copie installate nel progetto si aggiornano con l'aggiornamento delle skill, come sempre.
