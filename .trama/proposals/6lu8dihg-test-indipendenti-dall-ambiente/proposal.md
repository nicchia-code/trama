---
status: approved
base:
  requirements/quality/main.md: c9878827ce8a9ba2db463007e514fee37bebadb2673a2ac32376a78163a684c6
delete: []
request: 2026-10-26T18-55-24
created: 2026-10-26T18:02:58.894Z
label: Test ambiente
---
# Test indipendenti dall'ambiente

`bun test --isolate` dà 3 fallimenti che non vengono dal codice ma dall'ambiente della shell che lancia la suite: `test/omp-hook.test.ts` (2 test) eredita `TRAMA_ACP`, che ogni agente lanciato da Trama in omp Chat ha impostata, e l'hook allora non registra i suoi eventi; `test/host-agent-terminals.test.ts` (PATH del terminale) eredita `BUN_INSTALL`, che il codice giustamente preferisce a `~/.bun/bin`. Senza quelle variabili i test passano.

Decisioni:
- Il preload di `bun test` toglie all'avvio le variabili `TRAMA_*` e `BUN_INSTALL`; ogni test che ne ha bisogno le imposta da sé.
- Il test del PATH del terminale verifica il caso senza `BUN_INSTALL`: si aspetta `~/.bun/bin` della home finta, come oggi.
- La regola che la suite non dipende dalle variabili d'ambiente di chi la lancia va in `quality#General` (affidabilità), oggi vuota, e non in `tech#General`: lì porterebbe il frammento oltre i 12 KB, e la sua sola sezione General non si può dividere.
