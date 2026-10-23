---
column: done
technical: false
refs:
  - omp-chat
  - requirements/rules#omp-chat
  - requirements/tech#omp-chat
  - requirements/ui#omp-chat
drift: null
proposal: nr388hz3
agent: false
created: 2026-10-23T14:00:42.300Z
finished: 2026-10-23T14:04:13.401Z
---
# omp Chat accesa, solo sidebar

omp Chat non dipende più dall'agente né dall'editor. È in uso salvo quando il valore utente di `trama.ompChat` è `false` (`inspect("trama.ompChat").globalValue === false`), letto a ogni istruzione: un valore assente vale acceso, un valore del workspace non conta. Nel manifest (`extension/package.json:279-284`) `trama.ompChat` ha default `true` e la descrizione non dice più «On, with omp…»; resta nel gruppo Features dopo `trama.subagentsContextSharing`, unica funzione del gruppo accesa per default.

Le condizioni della Machine omp Chat diventano solo «omp Chat accesa/spenta»: Hidden → Empty con omp Chat accesa; Empty → Hidden con omp Chat spenta; da With conversations, `CLOSED` dell'ultima conversazione va in Empty se accesa e in Hidden se spenta; `editor.SETTINGS_CHANGED` in With conversations, con omp Chat spenta, lascia aperte le conversazioni e le istruzioni nuove vanno al terminale di omp. Cambiare agente non esiste più come causa. In `src/core/omp-chat-conversation.ts:21` `useOmpChat` perde `agent`; `extension/src/host/omp-chat/view.ts:28-29` (`ompChatOn`) e `extension/src/host/omp-chat/view-model.ts:58,70-74` (`inUse`, `chatViewState`) seguono la nuova regola.

Vista: un solo contenitore `viewsContainers.secondarySidebar` (`trama-omp-chat-sidebar`, vista `trama.ompChatSidebar`, `when: trama.ompChatVisible`). Sparisce il contenitore `viewsContainers.panel` (`trama-omp-chat`, vista `trama.ompChat`) da `extension/package.json:66-108`. La chiave di contesto `trama.ompChatVisible` è booleana: `true` quando omp Chat è in uso o la finestra ha almeno una conversazione aperta o in attesa di ripresa, altrimenti `false`; nessun valore `panel`/`sidebar`. Per mostrare la vista l'host esegue solo `trama.ompChatSidebar.focus` (con `preserveFocus: true` per i lavori, senza per Quick Task e Ask more). Da togliere: `ChatVisibleKey`, il parametro `cursor` di `ompChatKey` e `ompChatFocusCommand` (`src/core/omp-chat-view.ts:21-29`), `isCursor()`, `OMP_CHAT_PANEL_VIEW` e la seconda registrazione del provider (`extension/src/host/omp-chat/view.ts:11-18,32-33,48,83,85`).

Settings: la scheda non riceve più `trama.agent`; lo switch di omp Chat non è mai disabilitato e non ha la nota «Only with omp» (`extension/src/webview/settings/index.tsx:94`); `SettingField` perde le proprietà `disabled` e `note` (`extension/src/webview/settings/field.tsx:157-161`); `planSettingChange` non rifiuta più scritture di `trama.ompChat` (`extension/src/host/settings-schema.ts:66-70,156`).

Documentazione: README (`README.md:55-56`), CHANGELOG e `docs/uat.md` (`:893,897,910`, Z1 e Z14) dicono che la vista sta nella barra laterale secondaria di VS Code e che omp Chat è accesa per default con l'approvazione permissiva; spariscono pannello in basso, Move View, l'errore di avvio di Cursor e la verifica con Cursor 3.27.6; `docs/adr/0012-acp-returns-for-omp-chat-only.md` non parla più di Cursor.

Test: `test/omp-chat-view.test.ts:23-33` prova solo la chiave booleana e il focus della sidebar; in `test/omp-chat-conversation.test.ts:25-30` il caso con agente `cursor` sparisce e si prova default acceso / `false` spento; `test/webview-settings.test.tsx:193-224` perde i casi dello switch disabilitato e della nota.
