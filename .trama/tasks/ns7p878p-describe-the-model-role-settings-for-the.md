---
column: done
technical: true
refs:
  - requirements/ui#agent-launching
drift: null
proposal: null
agent: false
created: 2026-10-11T08:38:07.219Z
finished: 2026-10-11T08:45:17.248Z
---
# Describe the model role settings for the chat (technical)

Le descrizioni, in inglese, di `trama.analysis`, `trama.scan` e `trama.execution` non dicono più che i ruoli non valgono in chat. Dicono quali lavori usano quel modello (`trama.scan` anche i sotto-agenti che confrontano le Machine), che il nome va scritto come lo accetta l'agente scelto in `trama.agent` (omp, Claude Code o la chat di Cursor; per Copilot il nome mostrato nel selettore dei modelli della chat), che vuoto lascia il modello predefinito dell'agente, che in Copilot il modello resta anche nel selettore della chat e che ai sotto-agenti delle chat `trama.scan` arriva con Update skills.
