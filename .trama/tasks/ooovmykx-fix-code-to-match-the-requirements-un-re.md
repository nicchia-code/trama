---
column: done
technical: true
refs:
  - requirements/rules#General
  - requirements/tech#General
drift: phxfp7vk
proposal: null
agent: false
created: 2026-10-06T20:46:35.342Z
finished: 2026-10-06T20:49:22.747Z
---
# Fix code to match the Requirements: Un registro locale illeggibile fa fallire i comandi delle schede

## What happens

Se il registro locale dei numeri brevi è presente ma non leggibile, alcuni comandi delle schede **falliscono** invece di ricostruire i numeri. La riproduzione usa un registro sostituito da una cartella: un comando di elenco termina con un errore di lettura, benché le schede siano valide. Il problema riguarda il registro transitorio di questa copia di lavoro, non i dati versionati del progetto.

## What should happen

Quando il registro manca, non si legge oppure contiene dati incomprensibili, la copia deve **ricostruire da zero** i numeri delle schede vive nell’ordine di creazione. Nessun comando deve fallire per il contenuto del registro. Una difficoltà nel leggere o ripristinare quel ricordo locale non deve impedire di leggere le schede del progetto.

## Chosen option

**Ricostruire in memoria e segnalare il salvataggio impossibile**

Ricostruire i numeri dalle schede valide anche quando il registro non si può leggere. Provare a salvare il risultato e, se il percorso locale non lo consente, avvisare senza interrompere il comando. Non elimina dati o cartelle; finché il registro non viene ripristinato, la numerazione può essere ricalcolata alle letture successive.

## Where in the code

src/core/short-numbers.ts: readAssigned e syncShortNumbers
