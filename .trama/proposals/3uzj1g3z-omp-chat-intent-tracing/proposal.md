---
status: approved
requires:
  - caa5tuxr
base:
  agent-launching/omp-chat-conversation.md: 56a0e1d4f9f07b6763a29cabc1c3445f90d47919a1c6dec1b3e9525cae2b8503
  editor-panel/panel.md: d368622a6be34dd00c80b7aed5a6c4ed8e82f99d218cbdb09fe89576ed15a264
  requirements/tech/omp-chat.md: 9a8bd5d76a4eefb023a386a8e7801dfd5b39d8bf84f63304d53fc17f49fd2ac0
  requirements/rules/omp-chat.md: 0b13344567f8b6a8ded386a2291abfe9d164ff2e964946dd88b8e759b37add26
  requirements/ui/settings-specs.md: 39f96154bb5ad6cf7b5d0f78845b037bfd44ac6d5b3976df2d2f7cbb6c577596
  requirements/quality/omp-chat.md: 0dc23c089e65c8e93b49f88e3193a52d21093b723842507c3ddc1321400ed3ab
  requirements/rules/setup-wizard.md: 6bf9a8efd6b3104decf5976b1d58d19556bbcd369f6ef4dfa77f2ccbb42be8f4
  requirements/data/omp-chat.md: 5d96f327cc092dc9251578c9c2fe1455aaacce2f437ed661e4d98edd1683eee2
delete: []
created: 2026-10-23T20:13:52.155Z
label: Intent Tracing
---
# omp Chat Intent Tracing

Aggiunge al gruppo Features un interruttore che accende o spegne l'Intent Tracing di omp nelle conversazioni di omp Chat: spento, l'agente non scrive più a ogni chiamata a uno strumento la frase che dice perché la fa, e risparmia token.

## Decisioni
- L'impostazione vale solo per le conversazioni di omp Chat; i terminali di omp restano con l'impostazione di omp.
- Si chiama `omp Chat Intent Tracing`, è una casella del gruppo Features subito dopo omp Chat Approval, accesa per impostazione predefinita: nulla cambia per chi non la tocca, e omp Chat non è più l'unica funzione accesa per default.
- Descrizione: «On: in omp Chat the agent writes why it calls each tool. Off saves tokens. Applies to conversations started afterwards.»
- Vale all'avvio di ogni conversazione: le conversazioni già aperte, e quelle riprese dopo una ricarica, tengono il valore con cui sono partite, come l'approvazione.

## Scelte dell'agente da verificare
- Trama passa la scelta a omp con la variabile d'ambiente `PI_INTENT_TRACING` (`1` o `0`) del processo della conversazione, che in omp prevale sulla configurazione dell'utente e del progetto e non tocca il file overlay condiviso; la variabile si conserva con la conversazione per la ripresa.
- Come le altre impostazioni del gruppo Features, l'impostazione si legge solo dalle impostazioni utente e compare anche nel passo Advanced del wizard di setup.
