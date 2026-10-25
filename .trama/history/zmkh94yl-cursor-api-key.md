---
created: 2026-10-25T02:48:20.356Z
updated: 2026-10-25T02:48:20.356Z
summary: The developer can save a Cursor API key in the editor's secret storage from the Cursor row of Providers, in Settings and in the setup wizard; every omp that Trama starts receives it.
tasks:
  - g3i6bga0
  - v3rfz129
  - 4o4s4vjw
---
# Cursor API key

The host keeps the key in the editor's secret storage (one per user) and adds it to the environment of every omp process Trama starts: job terminals, login, model lists, version and update checks, usage, and omp Chat conversations. The Cursor row of Providers shows Set or Change API key, Remove API key and an API key saved line, in Settings and in the wizard's omp step, which checks omp again after each change, also when the key changes in another window. The key never reaches the webview, files or logs. Known risk: a dashboard key may not work as an access token, and Cursor can show as connected with an invalid key.
