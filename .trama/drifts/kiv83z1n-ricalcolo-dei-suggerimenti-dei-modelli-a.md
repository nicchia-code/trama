---
status: resolved
resolution: proposal
refs:
  - panel/Settings
proposal: null
task: null
origin: null
critical: false
option: null
note: null
resolvedBy: fydexkuq
created: 2026-10-17T08:04:27.536Z
---
# Ricalcolo dei suggerimenti dei modelli a ogni cambio della chat, anche con altri agenti

## What happens

Quando l'editor cambia i modelli della sua chat, la scheda Settings ricalcola i suggerimenti dei modelli anche se l'agente scelto non è Copilot: con omp il programma omp viene eseguito di nuovo e con Cursor o Claude Code l'elenco viene ricalcolato senza che serva.

## What should happen

Il Model e il Requirement dicono che il ricalcolo a ogni cambio dei modelli dell'editor vale solo per Copilot; per omp, Cursor e Claude Code l'elenco non dipende da quei modelli.

## Fix options

### Ricalcolare solo con Copilot

Il ricalcolo a ogni cambio dei modelli dell'editor vale solo quando l'agente è la chat di Copilot, come dice il Requirement. Con omp, Cursor e Claude Code la scheda non ricalcola l'elenco per quel cambio.

### Tenere il ricalcolo per ogni agente

Il comportamento attuale resta e si aggiornano il Model e il Requirement, così dicono che il ricalcolo avviene con ogni agente. Il costo è rieseguire omp o rileggere il database di Cursor a ogni cambio della chat.

## Where in the code

L'ascolto dei cambi dei modelli della chat nella registrazione degli eventi dell'estensione (extension/src/host/main.ts, riga 69) e il ricalcolo dei suggerimenti nel controller (postModelSuggestions in extension/src/host/controller.ts).
