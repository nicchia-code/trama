---
technical: true
refs:
  - requirements/ui#panel
  - requirements/tech#panel
  - requirements/ui#General
---
# Icone, colori, quadro e messaggi della Board

- Icone (SVG inline ricavati dai codicon, nessun font né dipendenza): `Run all` e `Run` di un Task `play`; `+ Add Work Item` `add`; `Resolve all` e `Resolve` di un Drift `wand`; `link` per i Task bloccati da più Drift; `Show details`/`Hide details` chevron. Tag, badge `blocked`, `waiting` e `Resolving`, righe dei Drift e righe dei Task restano senza icona salvo `link`. Togliere i glifi rimasti senza uso (`comment` di `Quick request…`) e aggiornare `extension/THIRD-PARTY-NOTICES.md` con i glifi usati (`wand`, `link` compresi).
- Colore del tag: hash stabile del testo dell'etichetta che sceglie fra `--vscode-terminal-ansiBlue`, `ansiGreen`, `ansiYellow`, `ansiMagenta`, `ansiCyan`, `ansiRed`; colore nel bordo del chip e, molto trasparente, nello sfondo, testo nel colore del tema.
- Bordo animato solo CSS: gradiente conico fra `--vscode-terminal-ansiBlue` e `--vscode-terminal-ansiCyan` che ruota attorno alla scheda; con `prefers-reduced-motion: reduce` bordo fermo in `--vscode-terminal-ansiCyan`. Rimuovere l'animazione `board-working-pulse`.
- Protocollo (`extension/src/protocol.ts`, host, webview): il messaggio di Resolve Drifts porta un'identità di Drift facoltativa; senza, l'host raccoglie tutti i Drift aperti (`Resolve all`); con, solo quel Drift dopo aver ricontrollato che sia aperto e fuori da ogni risoluzione (`Resolve`). Rimuovere i messaggi del lancio di un design e della richiesta rapida: l'host non li accetta e la Board non li manda. I pulsanti in fondo alle colonne usano `writeDesignRequest`, il lancio di tutti i Task in To do e Resolve Drifts senza Drift. Il quadro mandato alla Board porta le identità dei Drift raccolti dall'agente di risoluzione in corso, tenute in memoria dall'host, per il badge `Resolving` e i motivi di `Resolve`; colonne, schede di attesa, righe e tag si calcolano nel webview.
- ID: nelle righe dei Task dentro le altre schede il numero breve o, se manca, l'identità permanente, come nelle schede (nessun riferimento residuo a righe di una scheda di design).

Aggiornare i test di protocollo/host e dei messaggi tolti.
