---
column: done
technical: true
refs:
  - requirements/ui#General
drift: null
proposal: null
agent: false
created: 2026-10-10T11:31:15.988Z
finished: 2026-10-10T14:18:08.666Z
---
# Show card numbers in Board badges and the Drift origin line as tagged monospaced IDs

Sulla Board alcune schede nominano un'altra scheda con il suo numero breve o la sua identità permanente scritti come testo semplice, senza il carattere a spaziatura fissa e senza il tooltip e il nome accessibile «Short number (temporary)» o «Permanent ID» che il Requisito chiede:

- i badge `blocked D2` e `waiting T4` dei Task (il tooltip e il nome accessibile dicono «Blocked by Drift D2: …», non quale dei due è);
- i badge `requires P3` delle Proposal, che per una Proposal richiesta già decisa mostrano l'identità;
- la riga «from Drift …» del Task di correzione, che mostra il numero se il Drift è aperto e l'identità se è risolto, nello stesso punto e con lo stesso aspetto.

Fatto quando in ciascuno di questi punti il numero o l'identità compare nello stesso carattere a spaziatura fissa delle intestazioni delle schede e il tooltip e il nome accessibile dicono se è «Short number (temporary)» o «Permanent ID», come già avviene nell'intestazione delle schede, nelle righe dei Drift risolti e nei dettagli del Diagramma. Il testo dei badge e il loro comportamento al clic restano quelli di oggi.
