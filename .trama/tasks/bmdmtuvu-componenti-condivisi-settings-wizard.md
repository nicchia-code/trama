---
column: done
technical: false
refs:
  - setup-wizard
  - requirements/ui#setup-wizard
  - requirements/tech#setup-wizard
  - requirements/tech#omp-chat
  - requirements/tech#raffinamento
  - requirements/tech#drift
  - requirements/tech#drift-resolution
  - requirements/ui#agent-launching
  - requirements/ui#raffinamento
  - requirements/ui#drift-resolution
drift: null
proposal: icrqymyv
agent: false
created: 2026-10-24T13:43:53.660Z
finished: 2026-10-24T13:51:01.326Z
---
# Gruppi e componenti condivisi

Quando il lavoro è finito, il tab Settings e il wizard di configurazione leggono i gruppi delle impostazioni da un'unica lista condivisa, e i pezzi di interfaccia che il wizard già mostra stanno in un modulo che entrambe le viste importano.

**Lista unica dei gruppi.** `SETTING_GROUPS` in `extension/src/host/settings-schema.ts` diventa l'unica fonte dei gruppi, nell'ordine: omp, Models, Project, Advanced. Advanced ha i sottogruppi, nell'ordine: Appearance (`theme`); Drifts (`driftBlocker`, `advisorScanner`, `asyncDriftResolver`); Agents (`parallelExecution`, `subagentsContextSharing`, `autoUpdateStaleProposals`); omp Chat (`ompChat`, `ompChatApproval`, `ompChatIntentTracing`). Auto Exit e la lingua restano nel gruppo omp. Il gruppo Features non esiste più. Lo schema del messaggio `settings` porta, per ogni chiave, il gruppo e (se c'è) il sottogruppo. `ADVANCED_GROUPS` in `extension/src/webview/wizard/logic.ts` sparisce: il passo Advanced del wizard, le sue chiavi (`STEP_KEYS`, `advancedGroupOf`) e il Summary leggono i sottogruppi dallo schema. Aspetto e comportamento del wizard restano altrimenti identici. Le sezioni tecniche e di interfaccia di omp Chat, raffinamento, drift, risoluzione dei drift e lancio degli agenti cambiano solo il sottogruppo di Advanced in cui sta la loro impostazione: sono soddisfatte da questa lista. Il test dei gruppi (`test/settings-schema.test.ts`) verifica che ogni chiave del manifest stia in esattamente un gruppo o sottogruppo, e i test che fissano il vecchio gruppo Features vanno aggiornati.

**Componenti condivisi.** In un modulo fuori da `webview/wizard/` (per esempio `extension/src/webview/setup-shared.tsx`), importato sia dal wizard sia dalla pagina Settings, vanno estratti:
- la colonna centrata da 720 px (`mx-auto w-full max-w-[720px] min-w-0 px-4`);
- il riquadro di stato di omp come componente solo di presentazione, con tono, testo e indicazione «omp mancante» come props; nel wizard è alimentato da `agentCheck` come oggi (con `agentCheckLine` e `ompMissing`);
- il riquadro dei file di istruzioni (`InstructionFiles`), con la stessa logica `ignoresInstructionFiles`;
- `STEP_SENTENCES`, a cui si aggiunge la frase del gruppo Advanced per Settings «Theme and optional features.»;
- `ROLE_ADVICE`.

Questo Task non deve cambiare l'aspetto del tab Settings: la pagina continua a usare griglia e modalità a fumetto di `SettingField` finché il Task del tab Settings non le rimuove (è quel Task a eliminare `explain`, `InfoBubble`, `openKey`/`setOpenKey`, `CLOSE_DELAY_MS` e ad adottare i componenti condivisi). Qui cambiano solo i nomi e l'ordine dei gruppi mostrati, perché vengono dalla lista unica.

Vanno aggiornati i test toccati (`test/wizard-view.test.tsx`, `test/settings-schema.test.ts`, eventuali import spostati) e, se descrivono le parti del wizard o i gruppi cambiati qui, `README.md`, `extension/README.md`, `CHANGELOG.md` e `docs/uat.md`.

## Dove nel codice

- `setup-wizard` — `extension/src/host/settings-schema.ts:51-113` (`SETTING_GROUPS`, `settingsSchema`)
- `setup-wizard` — `extension/src/webview/wizard/logic.ts` (`ADVANCED_GROUPS`, `STEP_KEYS`, `advancedGroupOf`, `ROLE_ADVICE`, `STEP_SENTENCES`, `ignoresInstructionFiles`, `agentCheckLine`, `ompMissing`)
- `requirements/ui#setup-wizard` — `extension/src/webview/wizard/index.tsx:213-232` (riquadro `OmpStatus`)
- `requirements/ui#setup-wizard` — `extension/src/webview/wizard/index.tsx:234-261` (riquadro `InstructionFiles`)
- `requirements/ui#setup-wizard` — `extension/src/webview/wizard/index.tsx:263-304` (`SettingsBody`, h3 dei sottogruppi Advanced)
- `requirements/ui#setup-wizard` — `extension/src/webview/wizard/index.tsx:481-520` (colonna da 720 px, titolo e frase del passo)
- `requirements/tech#setup-wizard` — `extension/src/webview/settings/logic.ts` (`groupSettings`)
- `requirements/tech#setup-wizard` — `test/settings-schema.test.ts:43-133`, `test/wizard-view.test.tsx:497-501,587-638`
