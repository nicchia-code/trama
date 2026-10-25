---
created: 2026-10-24T13:10:23.182Z
updated: 2026-10-24T13:10:23.182Z
summary: La conversazione General di omp Chat mostra i limiti dell'abbonamento consumati, per finestra e fornitore, con un dialogo che li aggiorna.
tasks:
  - vd26sg07
cleared:
  vd26sg07:
    title: Uso abbonamento in General
    proposal: 4skdkgez
    tag: Uso abbonamento
    finished: 2026-10-24T13:08:39.677Z
    refs:
      - omp-chat-general
      - requirements/ui#omp-chat-general
      - requirements/rules#omp-chat-general
      - requirements/tech#omp-chat-general
      - requirements/data#omp-chat-general
      - requirements/quality#omp-chat-conversation
---
# Uso abbonamento in General

General ha una barra sottile sotto le schede con una voce per finestra di limite del fornitore del modello scelto (anello, nome corto e percentuale), colorata per soglie. Un clic apre il dialogo `Usage` con ogni fornitore e l'aggiornamento a richiesta. L'uso si chiede a omp con `omp usage --json` quando General compare e dopo ogni turno di un agente.
