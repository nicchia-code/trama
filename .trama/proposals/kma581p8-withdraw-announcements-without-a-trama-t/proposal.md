---
status: approved
kind: resolution
drifts:
  - drift: c0axpoz8
    decision: proposal
base:
  work/announcement.md: 6e6052b0bed6a5cf3ef92d39d1d6ca73bfd3307ab413b89cc266ac68d04a287a
delete: []
created: 2026-10-11T06:08:10.921Z
---
# Withdraw announcements without a Trama terminal like the chat's

Risolve il Drift c0axpoz8 (Chat rule withdraws announcements from agents Trama did not start): decisione proposal. Il Modello si allinea al comportamento attuale: un annuncio fatto da un agente che Trama non ha avviato non si distingue da quello dell'agente della chat di Copilot, quindi è ritirato come gli annunci della chat (fine turno, interruzione o chiusura di una conversazione di Trama del progetto) oltre che dall'avvio dell'editor. Assunzione da verificare: scelta la Fix option raccomandata (1); costo accettato: il ghost di un terminale esterno può sparire mentre il suo agente lavora ancora, e la scheda arriva comunque quando è archiviata. Requisiti già coerenti (rules#announcement, data#announcement, tech#announcement): nessuna modifica.
