---
created: 2026-10-23T19:40:42.057Z
updated: 2026-10-23T19:40:42.057Z
summary: Il pannello perde la barra delle schede e si sceglie dal menu laterale; la colonna Done della Board si svuota con Clear, che cancella i Task conservandone la storia.
tasks:
  - r0ngz5x7
  - z516lb0l
  - zqmr2gy3
---
# Menu laterale e pannello senza schede

La vista `trama.home` diventa il menu laterale di Trama, con le voci Board, Diagram, Requirements, Specs, History e Settings, il pulsante `Scan System`, il badge delle decisioni in attesa e i comandi `Show ...` della palette.

Il pannello non ha più la barra delle schede: sono sei viste scelte dal menu, la vista iniziale è la Board, History è una vista a tutta larghezza e Settings si apre anche senza cartelle.

La Board mostra la colonna Done, collassabile e raggruppata per giorno, con il pulsante `Clear`. L'host cancella i Task Done (tranne quelli tenuti da un Drift aperto), ne copia i dati nelle voci di History (`cleared`), conta i Task cancellati nello `Scan System` e i lettori tollerano un Task che non esiste più.
