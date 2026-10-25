---
column: done
technical: false
refs:
  - panel/Settings
  - requirements/ui#developer.SET_CURSOR_API_KEY
  - requirements/ui#developer.LOG_IN_PROVIDER
drift: null
proposal: nrtibou1
agent: false
created: 2026-10-25T02:30:05.354Z
finished: 2026-10-25T02:43:53.259Z
---
# Chiave API nella riga Cursor

Nella sezione Providers (lo stesso componente nella scheda Settings, gruppo omp, e nel passo omp del wizard) la riga di Cursor, e solo lei, offre anche una chiave API. Il pannello non riceve né mostra mai la chiave: sa soltanto se una chiave è salvata, tramite il messaggio dell'host `cursorApiKey { saved }`, e chiede all'host di salvarla o toglierla con i messaggi `setCursorApiKey` e `removeCursorApiKey` (conservazione nel portachiavi dell'editor, casella mascherata, errori e passaggio della chiave a omp sono coperti da un altro Task dell'host; qui si usano soltanto).

## Cosa mostra la riga di Cursor

- Il testo del piano di Cursor diventa «Cursor subscription or API key».
- Con una chiave salvata, sotto il piano compare una riga di testo secondario «API key saved», senza icona e senza alcuna parte della chiave. Senza chiave la riga non c'è e non lascia spazio vuoto. Lo stato Connected/Not connected non cambia per la chiave: Trama non la verifica, e omp elenca i modelli di Cursor anche con una chiave sbagliata, quindi la riga può dirsi collegata anche se i lavori poi falliranno.
- A destra, nello stesso gruppo e dopo «Log in», il pulsante della chiave: shadcn `Button` variante `outline`, piccolo, con l'icona lucide `KeyRound` a sinistra del testo; dice «Set API key» senza chiave e «Change API key» con chiave salvata. Tooltip «Save a Cursor API key that Trama passes to omp»; nome accessibile «Set Cursor API key» o «Change Cursor API key».
- Solo con una chiave salvata, dopo di esso, «Remove API key»: `Button` variante `ghost`, piccolo, con icona lucide `Trash2`. Tooltip «Remove the Cursor API key saved in Trama»; nome accessibile «Remove Cursor API key».
- Nessun tooltip compare da solo. I testi sono in inglese e non seguono `trama.language`.
- Layout come le altre righe (nome in grassetto, piano secondario, stato, pulsanti): sotto ~480 px il gruppo dei pulsanti va sotto nome e stato; i pulsanti vanno a capo senza uscire dalla colonna a ogni larghezza da ~300 px, in tema chiaro e scuro. La comparsa o scomparsa di «API key saved» e di Remove non cambia l'altezza delle altre righe.

## Cosa fa

- Set/Change API key (disponibile solo quando omp risponde): il pannello invia `setCursorApiKey`; l'host apre la casella mascherata dell'editor. Se la chiave viene salvata (al posto di quella di prima se c'era), Trama rifà in silenzio la verifica di omp, lo stato dei fornitori e i suggerimenti dei modelli con la chiave nuova; la riga dice «API key saved», il pulsante diventa «Change API key» e compare Remove. Il wizard, se aperto, si aggiorna allo stesso modo. Esc nella casella non cambia nulla. Se il portachiavi non riesce a salvare, c'è un errore dell'editor e nella riga nulla cambia.
- Remove API key (solo con chiave salvata): il pannello invia `removeCursorApiKey`, senza chiedere conferma. Trama toglie la chiave e rifà in silenzio le stesse verifiche senza la chiave; «API key saved» e Remove spariscono e il pulsante torna «Set API key». Se il portachiavi fallisce, errore dell'editor e nulla cambia.
- Dopo un salvataggio o una rimozione il fuoco torna nel pannello sul pulsante della chiave della riga di Cursor; nessun avviso dell'editor conferma l'operazione.
- Cambio della chiave in un'altra finestra dell'editor dello stesso utente: la riga di Cursor si aggiorna allo stato di adesso (salvata o no) e le verifiche di omp, fornitori e modelli si rifanno in silenzio come se il cambio fosse avvenuto qui.
- Terminali e conversazioni di omp già aperti continuano con l'accesso che avevano; solo gli omp avviati dopo ricevono la chiave nuova.
