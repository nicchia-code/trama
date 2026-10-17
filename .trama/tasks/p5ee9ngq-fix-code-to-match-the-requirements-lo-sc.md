---
column: done
technical: true
refs:
  - requirements/tech#agent-launching
drift: xtklegfc
proposal: null
agent: false
created: 2026-10-17T17:08:39.137Z
finished: 2026-10-17T17:57:03.979Z
---
# Fix code to match the Requirements: Lo script di prova chiede un comando dell'agente che Trama non legge più

## What happens

Lo script di prova in scripts/demo-agent.ts stampa una riga da mettere nelle impostazioni utente con un comando personalizzato dell'agente, e i passi di prova della guida di accettazione lo usano per far partire omp in un terminale. Trama però non ha più comandi personalizzati: l'agente si sceglie solo con trama.agent, e l'impostazione stampata non viene letta né usata.

## What should happen

Trama non ha nessun comando personalizzato dell'agente: l'agente si sceglie una volta con trama.agent (chat, omp o Claude Code), e le vecchie impostazioni non vengono lette. Uno strumento di prova non deve proporre a chi lo usa un'impostazione che il programma ignora.

## Chosen option

**Far stampare allo script la scelta di omp in trama.agent**

Lo script mostra solo la riga della impostazione trama.agent con omp, senza comando personalizzato, e le modalità di prova che restano (per esempio omp con la cartella dist sul PATH). La modalità echo, che serviva a provare il comando personalizzato, viene tolta. I passi della guida di accettazione che la nominano vanno aggiornati. Costo basso, ma si perde la prova senza spesa di token.

## Where in the code

scripts/demo-agent.ts (righe che definiscono MODES e stampano trama.agentCommand); docs/uat.md (passi che eseguono scripts/demo-agent.ts)
