---
column: done
technical: false
refs:
  - task/To do
  - requirements/rules#announcement
  - requirements/rules#task
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:39:49.853Z
finished: 2026-10-14T09:20:15.568Z
---
# Announce the pre-flight check of every Run in Scanning

Quando parte un Run (un Task, un design, Run all To do o il Run automatico) l'agente annuncia il pre-flight come controllo in Scanning, con `trama announce check`, prima di leggere il codice. Il titolo dice il lavoro: `Pre-flight of <titolo della Proposal>` per un design, `Pre-flight before Task <numero breve>` per un Task chiesto per nome, `Pre-flight before all Tasks` per Run all To do e `Pre-flight before automatic fixes` per il Run automatico. Il controllo si chiude prima del primo gruppo di Task, anche quando la scansione fallisce o si interrompe: in quel caso si consegna con esito fallito e il Run continua. Il pre-flight non annuncia un secondo controllo né altre schede oltre ai Drift che archivia.
