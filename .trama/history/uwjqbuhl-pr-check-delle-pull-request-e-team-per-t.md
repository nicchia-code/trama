---
created: 2026-10-28T11:05:47.822Z
updated: 2026-10-28T11:05:47.822Z
summary: Trama controlla una pull request in un worktree dedicato, ne scrive un report locale e lo mostra dalla scheda Pull Requests della vista Team, ora disponibile anche senza Manager mode.
tasks:
  - h4adn0ck
  - j6oqh9np
  - jsqct6pm
  - y9u2hywr
  - qyz5isxs
---
# PR Check delle pull request e Team per tutti

La vista Team non dipende più dal Manager mode: compare in ogni progetto con origin su GitHub, e senza Manager mode contiene solo la scheda Pull Requests.

La PR Check prepara un worktree sulla head della pull request, fa lavorare l'agente con lo scan di tutto il Sistema (modalità Solo o Collaborative, scelta da Trama) e al termine scrive il report in `.trama/pr-checks/` e rimuove il worktree. Il report è locale, si considera superato con nuovi commit e si cancella quando la pull request non è più aperta e pronta per la review.

La scheda Pull Requests elenca le pull request aperte e non in bozza, con stato, Check, Stop, Report e il link a GitHub; la finestra Report mostra la tabella dei risultati. README, guida del sito, CHANGELOG e passi manuali descrivono la funzione.
