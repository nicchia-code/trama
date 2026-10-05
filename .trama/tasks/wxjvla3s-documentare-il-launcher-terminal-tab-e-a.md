---
column: done
technical: true
refs:
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
drift: null
proposal: null
agent: false
created: 2026-10-05T17:51:09.671Z
---
# Documentare il launcher terminal-tab e aggiornare lo script di accettazione

La documentazione del progetto (README e guida della riga di comando dove si parla dei launcher) descrive il launcher `terminal-tab`: il terminale integrato aperto come scheda dell'editor accanto a quella attiva, mai scelto da `auto`, con le schede successive nel gruppo della precedente e i terminali dei worktree sempre nell'area dei terminali.

Lo script di accettazione ha righe per verificarlo a mano: la scheda si apre accanto al pannello e prende il focus, una seconda istruzione con l'agente al lavoro apre la nuova scheda nello stesso gruppo, il riuso di una scheda libera, la fine del comando e la chiusura della scheda si comportano come con il terminale integrato, `auto` non apre mai la scheda e un worktree apre il suo terminale nell'area dei terminali.
