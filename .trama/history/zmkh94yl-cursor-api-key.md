---
created: 2026-10-25T02:48:20.356Z
updated: 2026-10-25T02:48:20.356Z
summary: The developer can save a Cursor API key in the editor's secret storage from the Cursor row of Providers, in Settings and in the setup wizard; every omp that Trama starts receives it.
tasks:
  - g3i6bga0
  - v3rfz129
  - 4o4s4vjw
cleared:
  4o4s4vjw:
    title: Chiave Cursor nel wizard
    proposal: nrtibou1
    tag: Cursor API key
    finished: 2026-10-25T02:46:00.743Z
    refs:
      - setup-wizard/omp
  v3rfz129:
    title: Chiave API nella riga Cursor
    proposal: nrtibou1
    tag: Cursor API key
    finished: 2026-10-25T02:43:53.259Z
    refs:
      - panel/Settings
      - requirements/ui#developer.SET_CURSOR_API_KEY
      - requirements/ui#developer.LOG_IN_PROVIDER
  g3i6bga0:
    title: Chiave Cursor passata a omp
    proposal: nrtibou1
    tag: Cursor API key
    finished: 2026-10-25T02:40:55.806Z
    refs:
      - agent-launching
      - developer.SET_CURSOR_API_KEY
      - developer.REMOVE_CURSOR_API_KEY
      - editor.CURSOR_API_KEY_CHANGED
      - requirements/rules#developer.SET_CURSOR_API_KEY
      - requirements/rules#developer.REMOVE_CURSOR_API_KEY
      - requirements/rules#editor.CURSOR_API_KEY_CHANGED
      - requirements/rules#developer.LOG_IN_PROVIDER
      - requirements/tech#developer.SET_CURSOR_API_KEY
      - requirements/tech#developer.LOG_IN_PROVIDER
      - requirements/quality#developer.SET_CURSOR_API_KEY
      - requirements/quality#developer.LOG_IN_PROVIDER
---
# Cursor API key

The host keeps the key in the editor's secret storage (one per user) and adds it to the environment of every omp process Trama starts: job terminals, login, model lists, version and update checks, usage, and omp Chat conversations. The Cursor row of Providers shows Set or Change API key, Remove API key and an API key saved line, in Settings and in the wizard's omp step, which checks omp again after each change, also when the key changes in another window. The key never reaches the webview, files or logs. Known risk: a dashboard key may not work as an access token, and Cursor can show as connected with an invalid key.
