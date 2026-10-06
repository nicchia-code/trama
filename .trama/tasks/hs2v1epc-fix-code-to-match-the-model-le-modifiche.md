---
column: done
technical: false
refs:
  - project/Trama project/workspace.REQUIREMENTS_CHANGED
  - requirements/tech#project
drift: udk1fcys
proposal: null
agent: false
created: 2026-10-06T18:59:51.342Z
finished: 2026-10-06T19:36:14.629Z
---
# Fix code to match the Model: Le modifiche ai Requisiti del secondo progetto non aggiornano le sue skill

## What happens

In un workspace con due progetti Trama, modificare i Requisiti del secondo lascia le sue skill **ferme al testo precedente**. La rigenerazione riguarda invece il primo progetto; non compare alcun errore, quindi l’agente del progetto modificato continua a leggere Requisiti superati. Il caso è riprodotto anche con il pannello chiuso.

## What should happen

Ogni modifica ai Requisiti deve rigenerare, dopo una breve pausa, le skill **del progetto cui appartiene la modifica**, anche con il pannello chiuso. Se la rigenerazione fallisce, il developer deve esserne informato.

## Chosen option

**Rigenerare il progetto della modifica**

Associare ciascuna modifica al progetto che la contiene e raggruppare l’attesa breve per progetto. Le skill di ogni cartella aperta restano coerenti con i propri Requisiti, senza aggiornare inutilmente le altre. Il costo è distinguere le attese delle cartelle quando arrivano modifiche ravvicinate.

## Where in the code

extension/src/host/main.ts: watchRequirements; extension/src/host/project.ts: findProject
