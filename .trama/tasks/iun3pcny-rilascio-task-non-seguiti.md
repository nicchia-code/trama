---
column: done
technical: false
refs:
  - task/Taken by the agent/time.CHECK_DUE
  - task/Taken by the agent/agent.CHECK_TASK
drift: null
proposal: u4osxzox
agent: false
created: 2026-10-21T15:20:49.406Z
finished: 2026-10-21T15:24:01.130Z
---
# Rilascio dei Task non seguiti

Quando il controllo di esecuzione chiude il terminale o il lavoro della chat che aveva preso un Task, il Task torna in To do come alla fine di quel terminale o di quella conversazione; come per ogni altra fine, è rilasciato anche un Task preso senza un terminale o una conversazione riconosciuti.

A ogni controllo, un Task preso torna in To do anche quando nessuna finestra aperta del progetto segue più il terminale (un id di terminale di Trama) o la conversazione (`cursor:<conversazione>`) che lo tiene, per esempio dopo un riavvio dell'editor, e, per un terminale, il processo omp che Trama ricorda per lui (nel file locale dell'utente) non esiste più o non è mai stato indicato. Le finestre si chiedono a vicenda chi seguono sul canale locale: una finestra che non esiste più o non è raggiungibile non segue nulla, mentre una finestra aperta che non risponde in tempo conta come una che lo segue, e il Task resta preso fino al controllo successivo. In cima alla Board compare l'avviso che Trama ha smesso di seguire questo Task e perché. Un Task preso senza un terminale o una conversazione riconosciuti (`agent: true` o `cursor`), per esempio da un agente avviato a mano, non è mai rilasciato così.

Con `trama task check <id>` l'agente chiede della salute di chi tiene il Task: una finestra del progetto fa subito il controllo, con le stesse condizioni, e se chi lo tiene non è vivo il Task torna in To do con lo stesso avviso, e l'agente può poi prenderlo come ogni altro Task. Quando chi lo tiene è vivo, quando il Task è stato preso senza un terminale o una conversazione riconosciuti, o quando nessun editor del progetto risponde, nulla cambia e la risposta lo dice (per esempio che non si può verificare).

In tutti i casi il Task è rilasciato solo se, al momento della scrittura, il suo file ha ancora lo stesso detentore.
