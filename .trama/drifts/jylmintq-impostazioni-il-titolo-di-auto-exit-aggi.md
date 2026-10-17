---
status: resolved
resolution: fix-code
refs:
  - requirements/ui#panel/Settings
proposal: null
task: 0n897u4p
origin: null
critical: false
option: 1
note: null
resolvedBy: jwsis3si
created: 2026-10-16T12:37:20.829Z
---
# Impostazioni: il titolo di Auto Exit aggiunge «Terminal», contro la regola dei titoli

## What happens

La scheda Settings intitola il controllo che chiude il terminale dell'agente **Auto Exit Terminal**. Il titolo non viene ricavato dal nome dell'impostazione come per le altre: è scritto a mano, con la parola «Terminal» in più, e un test lo fissa. Il developer vede quindi un titolo diverso da quello che la regola produce per le altre impostazioni.

## What should happen

I Requisiti dicono che il titolo di ogni impostazione si ricava dalla sua chiave, senza il prefisso Trama, con le parole separate e l'iniziale maiuscola: per esempio «Max Parallel Agents» per il numero massimo di agenti. Per questa impostazione la regola dà **Auto Exit**. I Requisiti non prevedono eccezioni, quindi il titolo più lungo non è richiesto da nessuna regola.

## Fix options

### Titolo dalla regola, senza eccezione

La scheda mostra **Auto Exit**, come la regola vuole. Si toglie la voce scritta a mano dalla tabella dei titoli e il test che la fissa viene aggiornato. Costo: il titolo non nomina più il terminale. La spiegazione nel fumetto della «i» dice già che si chiude il terminale dell'agente, quindi nessuna informazione si perde, ma il nome del controllo è più breve.

### Titolo dalla regola, terminale nella spiegazione

La scheda mostra **Auto Exit**, come la regola vuole, e la spiegazione dell'impostazione, nel fumetto della «i», apre dicendo che il terminale dell'agente si chiude da solo. Si cambia solo il testo della spiegazione nel manifest e il test dei titoli. Costo: la parola «Terminal» si vede solo aprendo il fumetto, non a colpo d'occhio sulla pagina.

## Where in the code

extension/src/host/settings-schema.ts, la tabella dei titoli (TITLES) e la funzione settingTitle; test/settings-schema.test.ts, i test sui titoli, che fissano «Auto Exit Terminal»; extension/package.json, la spiegazione di trama.autoExit.
