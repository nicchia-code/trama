---
technical: false
refs:
  - omp-chat-general
  - requirements/ui#omp-chat-general
  - requirements/rules#omp-chat-general
  - requirements/tech#omp-chat-general
  - requirements/data#omp-chat-general
  - requirements/quality#omp-chat-conversation
---
# Uso abbonamento in General

Quando il Task è finito, la conversazione General di omp Chat mostra quanto il developer ha consumato dei limiti del suo abbonamento, come omp li riporta con `omp usage --json`. Le conversazioni dei lavori non cambiano.

- **Barra.** Sotto le schede e sopra i messaggi di General c'è una barra sottile con una voce per finestra di limite del fornitore del modello scelto nel selettore di General (la parte dell'identità del modello prima della prima `/`): anello di avanzamento, nome corto (`5h`, `7d`, `7d Fable`) e percentuale intera. Il totale è quello fra tutti gli account del fornitore, senza email. Il tooltip di ogni voce dice `<etichetta di omp> · <N>% used · resets in <durata>`, con il reset più vicino fra gli account. Anello e percentuale sono nel colore secondario sotto l'80 %, nel colore degli avvisi dall'80 % e nel colore di errore al 100 % (sulla percentuale mostrata). Cambiare modello cambia la barra subito, con l'ultimo resoconto.
- **Nessun dato.** Prima del primo resoconto, e quando omp non ne dà nessuno (solo chiavi API, nessun abbonamento, `omp usage` fallito), la barra non c'è e non compare nessun messaggio. Quando il fornitore del modello scelto non ha dati ma altri fornitori sì, la barra contiene solo un pulsante compatto `Usage` (icona `Gauge`).
- **Dialogo.** Un clic sulla barra, o su `Usage`, apre un `Dialog` intitolato `Usage` con ogni fornitore che ha dati, una riga per finestra con anello, nome corto e `<N>% used · resets in <durata>`, e sotto il titolo `Fetched <durata> ago`. Aprire il dialogo chiede di nuovo l'uso a omp, mostrando intanto l'ultimo con `Loader`; un fallimento lascia l'ultimo e aggiunge `Could not refresh: <motivo>.`.
- **Quando si chiede.** Quando General compare nella vista, dopo la fine di ogni turno di un agente in qualunque conversazione di omp Chat della finestra (General compresa) e all'apertura del dialogo; nessun timer, al più una richiesta in corso e una in attesa per finestra, 30 secondi al massimo ciascuna. Un resoconto riuscito, anche vuoto, sostituisce il precedente; uno fallito lascia l'ultimo riuscito. Pulizia, omp chiuso da solo e ripresa non cancellano l'uso; la ricarica sì, perché non si salva.
- **Tecnica.** `omp usage --json` con `execFile`, senza shell, argomenti fissi, programma di `tech#agent-launching`. Lettura del JSON, nome corto, percentuale, durata e soglie sono funzioni pure in `src/core/omp-usage.ts` con test `bun:test`; email, identità degli account, `metadata` e `resetCredits` non escono dall'host. Host in `extension/src/host/omp-chat/usage.ts`, messaggi `usage` (host → webview) e `refreshUsage` (webview → host) come dice `tech#omp-chat-general`; barra e dialogo in `extension/src/webview/omp-chat/usage.tsx`, con un test del webview.
- **Verifiche e documenti.** Con omp 18.12.6 verificare il formato delle identità dei modelli in ACP e il nome di fornitore che `omp usage --json` dà, annotando l'esito in `docs/uat.md`; il README dice che General mostra l'uso dell'abbonamento.
