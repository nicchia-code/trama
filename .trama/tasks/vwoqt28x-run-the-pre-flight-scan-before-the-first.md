---
column: done
technical: false
refs:
  - task
  - requirements/rules#task
  - requirements/tech#task
  - requirements/quality#task
drift: null
proposal: 2pa6eli4
agent: false
created: 2026-10-14T08:41:04.140Z
finished: 2026-10-14T09:48:20.273Z
---
# Run the pre-flight scan before the first group of every Run

Ogni Run (un Task, un design, Run all To do, il Run automatico delle correzioni) fa come primo passo il pre-flight, prima di chiedere il primo gruppo: prende i riferimenti dei Task che stanno per partire dal comando che li calcola con i filtri della corsa, e li confronta con il codice una sola volta. Con più Machine dà una Machine a ciascun sotto-agente, al massimo N insieme, aspetta la più lenta; con una sola Machine lo fa l'agente del Run. Il pre-flight archivia solo Drift senza origine, mai Task. Un Drift che trova blocca i Task che riguardano lo stesso elemento e il Run continua sugli altri. Se il pre-flight fallisce o si interrompe, il Run parte lo stesso: l'agente scrive la riga Pre-flight scan failed: the Run continues without it., la ripete nel resoconto, e il controllo si chiude con esito fallito. Il pre-flight non cambia il ricordo dello scan globale. L'annuncio del controllo è gestito da un Task a parte.
