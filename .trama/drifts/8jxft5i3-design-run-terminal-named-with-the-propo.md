---
status: resolved
resolution: proposal
refs:
  - requirements/rules#agent-terminal
  - agent-terminal
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: zst9veaf
created: 2026-10-09T11:56:30.937Z
---
# Design run terminal named with the Proposal identity instead of its short number

## What happens

Con **Run this design** il terminale dell'agente (e il titolo della sua scheda o della finestra esterna) prende l'**identità permanente** della Proposal, di otto caratteri.

Il motivo è che una Proposal di cui si realizzano i Task è già approvata, quindi è chiusa e non ha più un numero breve: il codice usa il nome che la Proposal ha in quel momento.

## What should happen

Il Modello (introduzione di Agent terminal) e il Requisito dei nomi dei terminali dicono che per *implement a design* il terminale porta il **numero breve della Proposal**, per esempio `P2`.

Con le regole generali dei numeri brevi, che tolgono il numero a ogni Proposal decisa, questo nome non può mai esistere: Modello e Requisito chiedono qualcosa che il resto del Sistema rende impossibile.

## Fix options

### Name it after the Proposal identity in the Model

Il Modello e il Requisito dicono che il terminale di un design porta l'identità permanente della Proposal, come fa già il codice. Nessun cambiamento al codice; il nome resta lungo otto caratteri ed è meno leggibile di `P2`, ma è stabile e uguale fra le copie di lavoro.

### Keep a number for a Proposal whose design is still running

Le regole dei numeri brevi cambiano: una Proposal approvata tiene (o riprende) il numero finché almeno un suo Task è in To do o In progress, come già i Task di un design. Il terminale si chiama `P2` come dice il Requisito. Costa una modifica alle regole generali, al calcolo dei numeri e ai loro casi limite.

### Use a fixed label for design runs

Il terminale di Run this design prende un'etichetta fissa, per esempio `Design run`, come `All tasks`. Modello, Requisito e codice cambiano insieme. Il nome è corto e leggibile, ma due design lanciati uno dopo l'altro hanno lo stesso nome e un terminale libero di un design può essere riusato per un altro.

## Where in the code

extension/src/host/prompts.ts (`terminalName`, caso implement-design) e extension/src/host/controller.ts (`launchAction`, che passa `cardName`)
