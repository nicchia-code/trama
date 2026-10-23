---
technical: false
refs:
  - developer.ASK_MORE
  - developer.OPEN_QUICK_TASK
  - developer.UNIFY_DRIFTS
  - developer.SHOW_SETTINGS
  - requirements/rules#developer.ASK_MORE
  - requirements/tech#developer.ASK_MORE
  - requirements/ui#developer.ASK_MORE
  - requirements/rules#developer.OPEN_QUICK_TASK
  - requirements/tech#developer.OPEN_QUICK_TASK
  - requirements/ui#developer.OPEN_QUICK_TASK
  - requirements/rules#developer.UNIFY_DRIFTS
  - requirements/tech#developer.UNIFY_DRIFTS
  - requirements/ui#developer.UNIFY_DRIFTS
---
# Ask more, Quick e Unify

Ask more, Add Quick Task e Unify Drifts aprono sempre omp, l'unico agente: un terminale nuovo, o una conversazione nuova di omp Chat quando è in uso, a ogni clic, come ogni istruzione. Alla fine:

- `openAskMore` e `openQuickTask` (`extension/src/host/agent.ts`) non leggono più `trama.agent` e non hanno più il ramo della chat di Cursor: niente `composer.createNew`, niente deeplink, niente appunti, niente avviso «Cursor's chat is only available in Cursor» né «could not open a new Cursor chat», niente `withTramaPath` né `withAskLine`. Il terminale o la conversazione di Ask more si chiama `Ask <numero breve>` o `Ask question`, prende il focus e ha il ghost di lavoro nella barra di stato; quello del Quick Task si chiama `Quick`, con il ghost `Quick`.
- Ask more porta solo la frase della lingua; il testo fisso arriva come allegato `@<file>` e la parte che descrive la scheda o la domanda come prompt. I lettori dei file inclusi nel pacchetto (`bundledTrama`, `bundledOmpHook`, `bundledUnifyInstructions`, `bundledAskMoreInstructions`) passano in un modulo dell'host che non riguarda Cursor, perché `extension/src/host/cursor.ts` sparisce.
- Unify Drifts manda il testo fisso come allegato e la riga dei Drift come prompt; non esiste più la forma tutta nel messaggio per la chat di Cursor, e la riga `Trama: Unify Drifts` non serve più a riconoscere una conversazione (`SKILL_PROMPT` di `src/core/cursor-chat.ts` sparisce). Se l'istruzione non parte davvero non nasce nessun lavoro, nessun annuncio resta e nessuna scheda è segnata.
- L'Event `developer.SHOW_SETTINGS` nasce solo dalla barra delle schede del pannello: il pulsante `Open Settings` dell'avviso della chat di Cursor sparisce con l'avviso.

Test: in `test/host-agent-terminals.test.ts` e nei test di Ask more, Quick Task e Unify Drifts spariscono i casi con la chat di Cursor (`composer.createNew`, deeplink, appunti, `SKILL_PROMPT`); restano e passano quelli con il terminale finto, e un test prova che Ask more e Quick Task aprono un terminale anche con un valore `cursor` rimasto in `trama.agent`.
