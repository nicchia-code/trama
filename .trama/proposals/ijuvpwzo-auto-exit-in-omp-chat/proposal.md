---
status: approved
base:
  agent-launching/omp-chat-conversation.md: 52c8a6eb7afb7ba23393bc02b9999f095d6445dbf1e9c100cd856caea9fd4154
  requirements/tech/omp-chat-conversation.md: 049048376ed1bec8000e5a62eca404da75213c5a9dc1c40006ffd6855f6ee6ff
  requirements/tech/omp-chat-turn-end.md: new
  requirements/tech/omp-chat-resume.md: 1d4594bc2ccd71e3a79468e02bf9a53665dfc3abe172aeaf604895a08fdfa194
delete: []
request: 2026-10-24T19-54-40
created: 2026-10-24T18:10:09.687Z
label: omp Chat auto exit
---
# Auto exit in omp Chat

L'auto exit non scatta più in omp Chat per Design, Setup, Rework di una Proposal e Import: la conversazione segue la fine del turno solo quando ha un lavoro nel registro, e quei lanci non ne hanno, mentre con `TRAMA_ACP` l'hook non manda più il riposo. Il Modello già dice che ogni conversazione con l'hook è un lavoro; la Proposal lo rende esplicito nei Requisiti e chiude altri due casi che impediscono la fine del turno.

Decisioni:
- Ambito: solo omp Chat; il terminale non cambia.
- Ogni conversazione con l'hook di Trama è una conversazione di un lavoro (Design, Setup, Rework, Import compresi): ascolta la fine del turno, è seguita per le schede in attesa e si riprende come lavoro.
- Messaggi del developer trattenuti dietro una richiesta di permesso non risposta a fine turno: si consegnano in un turno nuovo; la fine del turno conta alla fine di quello.
- Ask more salvata a metà di un turno del developer: alla riapertura torna a riposo, senza prompt di ripresa.
- `trama.autoExit` si legge solo dalle impostazioni utente, anche nel codice.
