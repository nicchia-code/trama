---
status: approved
base:
  agent-launching/omp-chat-general.md: 272576f95e2d7a2d7c6e25c76a25386b43e20335461311fe09080e298f64b414
  requirements/ui/omp-chat.md: b9c20e337581749208cecc9d9cb23d4325aae4bf7439eda0b2acb05d6b464861
  requirements/rules/omp-chat-general.md: e1482c6b525a5d88f64334472e6aad6ab7bc6ca8efab73fa1e157d85935ddcc8
  requirements/tech/omp-chat-general.md: 54c9ee928935a3ced7626678420160debf50082b95d1252f647eba60a95097ef
  requirements/quality/omp-chat.md: 54fa9b8471083b19ccd9dd38f0df1ce60e767989f7a70e5a2f3a272f2030b48b
  requirements/data/omp-chat.md: 1266c88498af47de737e04175abd3bf83de1d9d8a9126879c68801213871a545
delete: []
created: 2026-10-24T12:54:47.285Z
label: Uso abbonamento
---
# Uso dell'abbonamento in General

Il developer vuole vedere in omp Chat quanto ha consumato dei limiti del suo abbonamento (per esempio Claude 5 Hour, 7 Day), come li riporta `omp usage`. Oggi omp Chat non lo mostra da nessuna parte.

## Decisioni

- Si mostra l'uso dell'abbonamento (finestre di limite del fornitore), non il contesto né il costo della sessione.
- Una barra sottile sopra i messaggi, solo nella conversazione General.
- La barra mostra le finestre del fornitore del modello scelto in General, una per finestra, con il totale fra gli account; nessuna email.
- Ogni finestra: anello di avanzamento e percentuale; nome corto (`5h`, `7d`, `7d Fable`); l'ora del reset nel tooltip.
- Colore degli avvisi dall'80 %, colore di errore al 100 %.
- Trama chiede l'uso a omp quando General compare e dopo ogni turno di un agente in qualunque conversazione di omp Chat della finestra.
- Un clic sulla barra apre un dialogo con l'uso di ogni fornitore, un totale per finestra, con il reset scritto sulla riga; aprirlo chiede di nuovo l'uso a omp, mostrando intanto l'ultimo, con `Fetched <N> ago`.
- Senza nessun dato (solo chiavi API, nessun abbonamento, `omp usage` che fallisce) la barra non c'è e non compare nessun messaggio.
- Quando il fornitore del modello scelto non ha dati ma altri sì, la barra mostra solo un pulsante compatto `Usage` che apre il dialogo.
- Prima del primo dato la barra non c'è.

## Assunzioni da verificare

- Il reset di una finestra con più account è il più vicino fra quelli degli account.
- Il fornitore del modello è la parte dell'identità del modello prima della prima `/`; un modello senza fornitore vale come fornitore senza dati.
- Un aggiornamento fallito a dialogo aperto lascia l'ultimo uso e aggiunge una riga in testo secondario `Could not refresh: <motivo>.`.
- Il nome del fornitore compare nel tooltip e nel nome accessibile della barra, e come intestazione dei gruppi del dialogo, come lo scrive `omp usage`.
- Una richiesta in corso non se ne somma un'altra: al più una aspetta la fine della precedente.
- L'uso letto vive nella memoria dell'host e non si salva.
