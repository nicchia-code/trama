---
status: approved
base:
  system.md: 65c784b0ece0ce80bae5f7d297d25f7a1c5205005de5eca507b6c77c1099dfa6
  actors/ntfy.md: new
  actors/time.md: 08d2ddbff9d6354732d1d820cb8ecd2bbbd40c6d406f71dbe570a4236c76b253
  actors/omp-acp.md: dab116ed1703a0f61734e953fbf43e4a865b4c5cf544430b9c8155bdfb75b039
  actors/editor.md: 22f00a165e8ddb0c2f4d1783cdde5c3a0f97f0952decc2b6b507cb0388e005ce
  actors/developer.md: 93988c67448668d167a395333b33a9574c58b5de1d92aaee7e28a7e4ec47bbdf
  away-notifications/feature.md: new
  away-notifications/notice.md: new
  editor-panel/panel.md: 33e23d7bcb8d81d94fd5c8b53c2d6002dc15302cbb8cd821db032f7adccb7667
  project-setup/setup-wizard.md: aa462a512641bf610aa24dfc6aff3c324da94808e1269e213a60a772d9a90881
  requirements/rules/away-notifications.md: new
  requirements/tech/away-notifications.md: new
  requirements/ui/away-notifications.md: new
  requirements/data/away-notifications.md: new
  requirements/quality/away-notifications.md: new
  requirements/tech/general.md: 299f5aad590e957a6e65331e80ac37850bafcb30764174c5a214a9773ad0d28a
  requirements/quality/agents.md: b3b6da8e011aba790422821edae0f20cd24a909d3b8f4db97a9b265179be9738
  requirements/ui/settings-specs.md: d061aaf06a42aa54d2b74f037df6c7acef12c1ce3dba9e254e9200b389649e1e
  requirements/tech/setup-wizard.md: c2e231b4117b8116497e5950e6ef57c0974c00e14e5f1700ad8b170c583ec474
  requirements/ui/setup-wizard.md: d5482722df7a8e19bd23b98a39ee10811cebe0503485b0aa4523394a6336670e
delete: []
created: 2026-10-25T08:11:05.400Z
label: ntfy
---
# Notifiche ntfy in omp Chat

Trama torna a mandare notifiche ntfy, solo dall'host dell'estensione e solo per i lavori nelle conversazioni di omp Chat, così il developer lontano dal computer torna quando Trama è ferma o aspetta un suo input. Con ACP tutti i segnali arrivano all'host sulla connessione con omp, senza passare da un processo lanciato dall'agente.

Il divieto di notifiche esterne e di chiamate di rete (`tech#General`, descrizione del System, `quality#agent-launching`) cade solo per queste notifiche.

## Decisioni

- Solo i lavori nelle conversazioni di omp Chat notificano; General, Ask more, i terminali e il ripiego sul terminale no.
- Fine del lavoro: una sola notifica quando la finestra non ha più lavori in corso (nemmeno nel terminale) e nessun Run di una sequenza da avviare, dopo 30 secondi di quiete delle conversazioni dei lavori rimaste aperte; subito quando nessuna è rimasta aperta (`trama.autoExit`).
- Round di domande e richieste di permesso di un lavoro: notifica dopo 30 secondi senza risposta, anche con altri lavori in corso.
- Fini anomale e omp uscito durante il lavoro: notifica subito, con priorità alta.
- Nessuna notifica alla chiusura della finestra, alla ripresa dopo una ricarica né per la pulizia o la chiusura fatta dal developer.
- Ogni finestra notifica solo per le proprie conversazioni.
- Non si verifica su omp se riprende da solo dopo la fine del turno: la quiete di 30 secondi basta, un raro falso idle è accettato.
- Testo breve in inglese, solo progetto, conversazione ed evento, con un'emoji per evento (✅ ❓ 🔐 ⚠️) e priorità 3 o 4; nessuna azione al click.
- Invio fallito: un solo nuovo tentativo dopo 10 secondi, poi silenzio.
- Due impostazioni nuove, `trama.ntfyServer` (predefinito `https://ntfy.sh`) e `trama.ntfyTopic` (vuoto = spente), solo nelle impostazioni utente; il vecchio `trama.ntfy` resta ignorato. Un solo interruttore: il topic.
- Token di accesso nel portachiavi dell'editor, con Set/Change/Remove come la chiave API di Cursor.
- Nuovo sottogruppo `Notifications` in fondo ad Advanced, solo nella scheda Settings, non nel wizard; con il pulsante `Send test notification`.

## Scelte dell'agente da verificare

- Una fine del lavoro dovuta a Stop non notifica: il developer è davanti all'editor.
- Il messaggio della notifica non è vuoto (ntfy mostrerebbe un testo suo): una frase fissa per evento, per esempio `Trama is waiting for you.`.
- Con più lavori finiti insieme il titolo dice `<progetto> - <n> jobs finished`.
- L'apertura di Ask more annulla una notifica di fine in attesa, come l'apertura di un lavoro.
- Un messaggio del developer in una conversazione di un lavoro già finito fa ripartire la quiete invece di annullare la notifica.
- L'invio usa la pubblicazione JSON di ntfy (testi UTF-8), un redirect vale come fallimento, limite di 10 secondi per richiesta.
- La richiesta di permesso e la risposta del developer diventano Eventi del Modello (`omp-acp.PERMISSION_REQUESTED`, `developer.ANSWER_PERMISSION`).
