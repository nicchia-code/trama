---
technical: true
refs:
  - requirements/tech#announcement
  - requirements/data#announcement
---
# Annunci senza job

Un annuncio (announcement) non ha più il campo `job`: `trama announcement new` non lo accetta né lo scrive, e il legame transitorio fra un controllo e il lavoro che lo possiede non si conserva né si inoltra con cambio fase, consegna o esito.

`trama announcement move <id> failed` resta: consegna e cancella il controllo esattamente come `delivered`. La differenza fra i due esiti finisce soltanto nei tempi delle fasi (`TRAMA_JOB` resta solo per questo); né `failed` né `delivered` mandano più l'esito a un coordinatore sul canale locale. Le skill di scan e implementazione continuano a usare `failed` per i controlli non riusciti.

Le notifiche delle schede arrivate (`proposal move open`, `drift new`, `task new`, `comparison move delivered`) restano sul canale locale delle domande, senza nulla della delega.

Indizi: `src/cli/commands/announcement.ts`, `src/core/question-channel.ts`, `extension/src/host/terminal-agent.ts`, `docs/cli.md`.
