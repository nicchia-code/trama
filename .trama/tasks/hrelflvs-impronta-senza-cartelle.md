---
column: done
technical: true
refs:
  - requirements/tech#work
  - requirements/rules#work
drift: null
proposal: 2oj2rgp7
agent: false
created: 2026-10-21T04:57:27.914Z
finished: 2026-10-21T05:00:18.481Z
---
# Impronta senza cartelle vecchie

Quando il Task è fatto, l'impronta del codice esclude solo `.trama/`, `.agents/skills`, la cartella delle skill configurata, `.omp/agents/` e `.omp/WATCHDOG.yml`: `.claude/skills` e `.github/skills` non sono più cartelle di Trama e un cambio lì conta come codice. In `src/core/compared.ts` `LEFT_OUT` perde le due cartelle, e i test dell'impronta che le davano per escluse si aggiornano.

L'Advisor Scanner resta attivo solo con `trama.experimentalAdvisorScanner` acceso e `trama.agent` uguale a `omp`; con la chat di Cursor (`cursor`, o un valore che vale `cursor`) nulla cambia. I commenti e i testi che citano gli altri agenti come `chat` o `claude` dicono `cursor`.
