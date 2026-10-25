---
refs:
  - panel/Settings
  - panel/Closed/developer.SHOW_SETTINGS
  - panel/Open/developer.SHOW_SETTINGS
  - panel/Closed/developer.OPEN_GUIDED_SETUP
  - panel/Open/developer.OPEN_GUIDED_SETUP
  - developer.SET_NTFY_TOKEN
  - developer.REMOVE_NTFY_TOKEN
  - developer.SEND_TEST_NOTIFICATION
  - editor.NTFY_TOKEN_CHANGED
  - requirements/ui#panel/Settings
  - requirements/ui#away-notifications
  - requirements/rules#developer.SET_NTFY_TOKEN
  - requirements/tech#developer.SET_NTFY_TOKEN
  - requirements/ui#developer.SET_NTFY_TOKEN
  - requirements/rules#developer.SEND_TEST_NOTIFICATION
  - requirements/tech#developer.SEND_TEST_NOTIFICATION
  - requirements/ui#developer.SEND_TEST_NOTIFICATION
---
# Notifications nelle Settings

La scheda Settings ha in fondo al gruppo `Advanced`, dopo `omp Chat`, il sottogruppo `Notifications`, che c'è solo nella scheda e mai nel wizard di setup. Le impostazioni `trama.ntfyServer` e `trama.ntfyTopic`, la loro validità e la funzione che manda una notifica sono descritte in `tech#away-notifications` e `tech#notice`; se non esistono ancora, questo Task le crea lì come descritto, senza duplicarle.

Quando il Task è fatto:

- Il sottogruppo mostra `ntfy Server` e `ntfy Topic` come campi di testo, con le descrizioni «Server that receives Trama's notifications. The default is the public ntfy.sh.» e «Topic for a notification when omp Chat jobs finish or wait for you. Empty (the default) sends nothing; on ntfy.sh anyone who knows it can read them.». Un valore non valido non si salva e il campo mostra `Enter an http or https address without user name or password.` o `Use 1 to 64 letters, digits, - or _.`.
- Token di accesso, costruito come la chiave API di Cursor (`extension/src/host/cursor-api-key.ts`): un modulo `extension/src/host/ntfy-token.ts` con la chiave `trama.ntfyToken` di `ExtensionContext.secrets`. Con un token salvato la riga `Access token saved` in testo secondario; il pulsante `Set access token` / `Change access token` (`outline`, icona `KeyRound`) apre `showInputBox` mascherata con titolo `ntfy Access Token`, prompt `Paste the access token of your ntfy server.` e `Enter an access token.` per un testo vuoto; Esc non cambia nulla; il token si salva senza spazi ai bordi. Con un token salvato c'è `Remove access token` (`ghost`, icona `Trash2`), senza conferma. Tooltip «Save the access token of your ntfy server» e «Remove the ntfy access token saved in Trama», nomi accessibili `Set ntfy access token` / `Change ntfy access token` / `Remove ntfy access token`; il fuoco torna sul pulsante del token. Errori del portachiavi: `Trama: could not save the ntfy access token: <reason>.` e `Trama: could not remove the ntfy access token: <reason>.`, senza cambiare nulla. Messaggi `setNtfyToken`, `removeNtfyToken` e `ntfyToken { saved }`; il token non è mai in un messaggio. Un cambio fatto in un'altra finestra (`editor.NTFY_TOKEN_CHANGED`) aggiorna il sottogruppo.
- `Send test notification` (`outline`, icona `BellRing`) su una riga sua: disabilitato con il tooltip `Set an ntfy topic first.` con il topic vuoto o `Fix the ntfy server or topic first.` con un valore non valido; mentre la prova parte l'icona è `Loader` che gira e il pulsante è disabilitato. Manda una sola richiesta, senza nuovo tentativo, con server, topic e token di adesso: titolo `<progetto> - Test notification` (o `Trama - Test notification` senza progetto), messaggio `Trama's notifications reach this device.`, tag `bell`, priorità 3. Sotto il pulsante, in una regione `aria-live="polite"`, `Test notification sent.` in testo secondario oppure `Test notification not sent: <reason>.` nel colore d'errore, con il motivo fra `HTTP <status>`, `no response within 10 seconds`, `the server redirected the request` o il messaggio dell'errore di rete. La riga resta fino alla prova seguente o alla chiusura della scheda. Messaggi `sendTestNotification` e `testNotification { state, reason? }`, rifiutato mentre una prova è in corso nella finestra. La prova non dipende da omp Chat né da un lavoro.
- Tutti i testi sono in inglese e non seguono `trama.language`.
