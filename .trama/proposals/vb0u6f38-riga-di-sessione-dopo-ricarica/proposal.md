---
status: discarded
base: {}
delete: []
created: 2026-10-27T07:18:51.921Z
label: General sessione nuova
---
# Riga di sessione dopo ricarica

Il codice mostra la riga `New session: the agent does not remember the messages above.` sotto General anche dopo una ricarica della finestra in cui la sessione non si riapre. Il Model e i Requisiti dicono invece che in quel caso General riparte vuota, senza avvisi. Questa Proposal cambia il Model e i Requisiti perché dicano che la riga compare anche dopo la ricarica; il codice non cambia.

## Modifiche

- Model `omp-chat-general/Waiting for the window`, transizione `omp-acp.SESSION_NOT_RESUMED` → Starting: General riparte vuota, con una sessione nuova, e sotto la conversazione vuota compare la riga di testo secondario `New session: the agent does not remember the messages above.`; nessun avviso sulla Board.
- Requirement `rules#omp-chat-general`, punto sulla ripresa dopo la chiusura o la ricarica della finestra: nel caso non riaperta, General riparte vuota con una sessione nuova e la riga di sessione nuova sotto la conversazione, senza avvisi sulla Board.
- Requirement `ui#omp-chat`, punto sulla riga di sessione nuova: il caso vale anche quando la finestra si è ricaricata e la sessione di General non si è riaperta, non solo dopo un omp chiuso da solo.
- Requirement `tech#omp-chat-general`, punto sulla ripresa dopo una ricarica: con la ripresa fallita, l'avvio nuovo segna `generalStatus` con `newSession: true`.

## Decisioni

- La riga compare solo quando la sessione non si riapre. Una ripresa riuscita non la mostra, come già descritto in `ui#omp-chat` (General ripresa dopo una ricarica).
