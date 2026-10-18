---
created: 2026-10-18T20:43:06.856Z
updated: 2026-10-18T20:43:06.856Z
summary: Il controllo dello strumento di domande di Copilot chiede a ogni finestra del progetto se la conversazione è di Trama, entro un secondo, e rifiuta lo strumento se una risponde sì.
tasks:
  - q4o7avtd
---
# Domanda Copilot a tutte le finestre

Prima il controllo chiedeva solo alla finestra più recente: una conversazione nota a un'altra finestra non veniva rifiutata. Ora sendCopilotHook interroga tutte le finestre vive del progetto con lo stesso aiuto usato da Cursor; una finestra che non risponde o tarda conta come no; il limite resta un secondo.

Task: q4o7avtd Copilot question check asks all windows.
