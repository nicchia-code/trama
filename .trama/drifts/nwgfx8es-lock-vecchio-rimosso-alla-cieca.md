---
status: resolved
resolution: fix-code
refs:
  - requirements/tech#proposal
proposal: null
task: 1twd0duj
origin: null
critical: false
option: 1
note: null
resolvedBy: mm7vmlfk
created: 2026-10-17T21:36:08.130Z
---
# Lock vecchio rimosso alla cieca

## What happens

Quando trova il lock di una Proposal più vecchio del limite, il comando lo toglie senza controllare di nuovo che sia ancora quello vecchio. Se nel frattempo un altro comando lo ha già tolto e ne ha preso uno nuovo, lo cancella: così due comandi possono scrivere la stessa Proposal insieme.

## What should happen

Un lock si toglie solo quando è più vecchio del limite di abbandono. Se il file sparisce mentre si controlla la sua età, il comando riprova a crearlo senza cancellare nulla, perché un altro processo può averlo preso.

## Fix options

### Spostare il lock prima di controllarne l'età

Il lock vecchio viene prima spostato con un nome unico, e si controlla solo il file spostato: se è davvero vecchio si butta via, altrimenti il lock di chi l'ha preso non si tocca. Un lock recente così non viene mai cancellato. Costo: un passo in più ogni volta che si toglie un lock abbandonato, e la gestione del caso in cui si sposta per errore un lock recente, da rimettere al suo posto senza sovrascrivere quello di un altro comando.

### Ricontrollare l'età appena prima di togliere

Subito prima di cancellare il lock il comando legge di nuovo la sua età, e lo cancella solo se è ancora oltre il limite. La finestra in cui un lock nuovo può sparire si riduce a pochi millisecondi, ma non si chiude del tutto. Costo: quasi nessuno, e il caso resta molto raro.

## Where in the code

src/core/file-lock.ts: acquire, nel ramo in cui il lock trovato è più vecchio del limite (lockAgeMs e la rimozione che segue).
