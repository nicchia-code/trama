---
technical: true
refs:
  - requirements/rules#agent-launching
  - requirements/tech#task
---
# Skill usa trama-implementer

La skill `trama-implement` (`skills/trama-implement/SKILL.md`) affida ogni Task al sotto-agente `trama-implementer` invece di dire al sotto-agente di eseguire i passi 2-5 della skill.

Quando è fatto:
- Step 1, "With sub-agents": l'agente principale avvia, per ogni Task, il sotto-agente `trama-implementer` con l'identità permanente del Task, le immagini del Task (i percorsi), e le frasi dell'istruzione che riguardano un sotto-agente (lingua, Drift blocker, Advisor Scanner, Sub-agents Context Sharing con i testi già letti). Non gli dice più di leggere la skill né di eseguire i passi 2-5: le istruzioni stanno nel prompt del sotto-agente. I divieti restano anche nel testo dello step, perché valgono per l'agente che li affida.
- Quando la definizione `.omp/agents/trama-implementer.md` non c'è nel progetto, la skill dice di usare i propri sotto-agenti con le istruzioni di oggi (passi 2-5 della skill), così un progetto non aggiornato funziona come prima.
- La sezione "Sub-agents context sharing", per l'implementazione, dice che `trama-implementer` non carica nessuna skill e salta `trama task show` solo quando ha ricevuto quel testo.
- Le sezioni "When you must file a Drift", "Writing a Drift", "Drift blocker" e "Announcing cards" restano nella skill con i loro titoli esatti, perché il prompt del sotto-agente le nomina.
- Il testo resta in inglese come il resto della skill; le skill installate nei progetti si rigenerano dalle sorgenti.
