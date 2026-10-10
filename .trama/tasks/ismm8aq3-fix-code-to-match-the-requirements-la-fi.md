---
column: done
technical: true
refs:
  - requirements/rules#task
  - requirements/tech#task
drift: e9w8a4ie
proposal: null
agent: false
created: 2026-10-10T14:15:26.953Z
finished: 2026-10-10T17:37:35.707Z
---
# Fix code to match the Requirements: La fine corsa scansiona ancora tutto il Sistema

## What happens

Dopo una verifica finale riuscita, se la corsa ha concluso almeno un Task e non ne lascia bloccati nel suo ambito, la skill di implementazione ordina ancora una **scansione di tutto il Sistema**. Succede anche per un Task singolo e per corse i cui Task puntano soltanto a General o a un’Area: non si restringe il confronto al lavoro concluso e ai suoi ingressi.

## What should happen

Alle stesse condizioni, la fine corsa deve scansionare soltanto l’unione degli elementi del Modello referenziati dai Task portati in Done dalla corsa, con le Transition che vi entrano. Le sezioni dei Requisiti valgono come gli elementi che intitolano; General e le Aree non aggiungono nulla. Con ambito vuoto non deve partire uno scan. Lo **scan globale** è riservato al developer. I nuovi Task appartengono al design della corsa o del Task singolo, se presente; vengono riportati e non realizzati nella stessa corsa.

## Chosen option

**Raccogliere i Task conclusi e chiedere l’ambito alla fine**

Tenere le identità dei Task che la corsa porta in Done e, dopo la verifica finale e il controllo dei blocchi, chiedere il loro ambito mirato. Scansionare soltanto quell’ambito, oppure chiudere il controllo se è vuoto; conservare i legami al design e il resoconto senza realizzare le nuove schede. Richiede aggiornare le istruzioni della corsa e usare il comando di ambito previsto, eliminando lo scan globale automatico.

## Where in the code

skills/trama-implement/SKILL.md: passo 7 Scan the whole System e istruzioni di annuncio; copia installata .agents/skills/trama-implement/SKILL.md; src/cli/skills.ts: distribuzione della skill trama-implement.
