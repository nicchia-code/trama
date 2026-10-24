---
description: "Usa per l'attesa di fine turno delle schede appena consegnate sulla Board."
---
# Attesa di fine turno

## panel/Board
- `trama proposal move <id> open`, `trama drift new`, `trama task new` e `trama comparison move <id> delivered`, quando riescono, mandano all'editor sul canale locale già usato per le domande l'identità di ogni scheda e la provenienza, `TRAMA_TERMINAL`, quando c'è. Senza editor raggiungibile non mandano nulla e non falliscono. L'estensione tiene in memoria, per finestra, l'insieme delle schede in attesa con il loro terminale, e le toglie al primo segnale di fine che già usa per gli annunci (hook a riposo, fine del comando scritto da Trama, chiusura del terminale) o quando il controllo di esecuzione chiude il lavoro del loro terminale (`tech#time`). Non registra una scheda senza `TRAMA_TERMINAL` né una scheda di un terminale segnato senza hook. Nessun timer di inattività; nulla è scritto su disco.
- Il quadro della Board porta l'elenco delle identità in attesa. Il webview aggiunge il motivo `The agent is still finishing` ai pulsanti di quelle schede, nella Board e nei dettagli del Diagramma, prima degli altri motivi calcolati da `src/core`. L'host rifiuta con lo stesso motivo i messaggi di approvazione, rifiuto, `dismissDrift`, Resolve di un Drift e Run di un Task che arrivano per una scheda in attesa. La riga di comando non consulta l'elenco.
