---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#task
  - requirements/tech#task
proposal: null
task: ismm8aq3
origin: null
option: 1
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T12:55:47.107Z
---
# La fine corsa scansiona ancora tutto il Sistema

## What happens

Dopo una verifica finale riuscita, se la corsa ha concluso almeno un Task e non ne lascia bloccati nel suo ambito, la skill di implementazione ordina ancora una **scansione di tutto il Sistema**. Succede anche per un Task singolo e per corse i cui Task puntano soltanto a General o a un’Area: non si restringe il confronto al lavoro concluso e ai suoi ingressi.

## What should happen

Alle stesse condizioni, la fine corsa deve scansionare soltanto l’unione degli elementi del Modello referenziati dai Task portati in Done dalla corsa, con le Transition che vi entrano. Le sezioni dei Requisiti valgono come gli elementi che intitolano; General e le Aree non aggiungono nulla. Con ambito vuoto non deve partire uno scan. Lo **scan globale** è riservato al developer. I nuovi Task appartengono al design della corsa o del Task singolo, se presente; vengono riportati e non realizzati nella stessa corsa.

## Fix options

### Raccogliere i Task conclusi e chiedere l’ambito alla fine

Tenere le identità dei Task che la corsa porta in Done e, dopo la verifica finale e il controllo dei blocchi, chiedere il loro ambito mirato. Scansionare soltanto quell’ambito, oppure chiudere il controllo se è vuoto; conservare i legami al design e il resoconto senza realizzare le nuove schede. Richiede aggiornare le istruzioni della corsa e usare il comando di ambito previsto, eliminando lo scan globale automatico.

### Preparare l’elenco dei Task conclusi dopo ogni gruppo

Al termine di ogni gruppo consolidare soltanto le identità dei suoi Task effettivamente conclusi, escludendo quelli fermati da un Drift. Dopo l’ultimo gruppo e la verifica riuscita, calcolare una sola volta l’ambito mirato dell’elenco consolidato. Con ambito vuoto non scansionare. Il costo è mantenere l’elenco fra i gruppi, ma lascia esplicito quali Task hanno contribuito senza aggiungere scansioni intermedie.

## Where in the code

skills/trama-implement/SKILL.md: passo 7 Scan the whole System e istruzioni di annuncio; copia installata .agents/skills/trama-implement/SKILL.md; src/cli/skills.ts: distribuzione della skill trama-implement.
