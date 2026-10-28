---
status: discarded
base: {}
delete: []
created: 2026-10-27T07:17:37.014Z
---
# Avvisi del raffinamento

# Avvisi del raffinamento

Il comportamento del codice è che gli avvisi di un raffinamento, «non è partito» (`Trama: refining <numero breve> did not start: <motivo>.`) e «raffinata ma non approvata» (`Trama: <numero breve> was refined but not approved: <motivo>.`), e l'avviso di chiusura del lavoro per controllo di esecuzione, compaiono come notifica dell'editor e non sulla Board. La Board non dice perché la Proposal resta da raffinare.

La modifica tiene il comportamento del codice e cambia il Modello e i Requisiti che dicono il contrario:

- `raffinamento/Al lavoro`, stato `time.CHECK_DUE`: togliere «con l'avviso in cima alla Board» e scrivere che il controllo di esecuzione chiude il lavoro con l'avviso dell'editor.
- `raffinamento/Fermo`, stato `time.CHECK_DUE`: togliere «con l'avviso in cima alla Board» e scrivere che il controllo di esecuzione chiude il lavoro con l'avviso dell'editor.
- `requirements/ui#raffinamento`: sostituire la riga «Gli avvisi di `rules#raffinamento` stanno in cima alla Board, con il pulsante di chiusura degli altri avvisi.» con una riga che dice che gli avvisi di `rules#raffinamento` sono notifiche dell'editor e non compaiono sulla Board.

Le regole di `requirements/rules#raffinamento` restano come sono: il testo degli avvisi e le condizioni in cui compaiono non cambiano.
