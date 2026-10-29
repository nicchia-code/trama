---
created: 2026-10-28T18:47:27.138Z
updated: 2026-10-28T18:47:27.138Z
summary: La PR Check non è più offerta e Trama non legge pull request con gh; la vista Team, la voce di menu e Show Team esistono solo con Manager mode acceso e origin su GitHub.
tasks:
  - 1bp6oja8
  - 6tfhr5le
  - mq7ymd1r
---
# PR Check nascosta, Team solo con Manager mode

Il codice della PR Check resta nel repository ma nessuna superficie la offre: i messaggi di avvio e stop sono ignorati, Refresh e la vista Team non eseguono gh pr list, i report in .trama/pr-checks/ restano dove sono. La vista Team ha solo le schede Decisions, Issues, Timeline e People; con Manager mode spento o origin non su GitHub la voce di menu e il comando Show Team non ci sono e un pannello su Team passa alla Board. README, sito, uat e CHANGELOG sono aggiornati di conseguenza.
