---
status: discarded
base:
  requirements/tech/history.md: 79ab7a4e37a108e85d6c7a119bdfbc096d5c623f99afb10402fb63861f639f7e
delete: []
created: 2026-10-27T07:17:28.727Z
label: Modale History
---
# Modale History con Dialog del pannello

# Modale History con Dialog del pannello

La modale dei dettagli di una voce di History resta costruita con il `Dialog` del pannello (Radix, già nel webview, non una libreria nuova), e non diventa un elemento `<dialog>` aperto con `showModal()`.

Decisioni:

- Requirement `requirements/tech#voce-history`: il vincolo sul `<dialog>` nativo con `showModal()` si sostituisce con il `Dialog` del pannello, che dà il ruolo modale, il focus dentro la finestra, Esc e la chiusura cliccando fuori.

Nessun Task: il codice attuale già soddisfa il comportamento descritto.
