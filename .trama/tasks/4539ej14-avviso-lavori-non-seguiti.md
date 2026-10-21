---
column: done
technical: false
refs:
  - panel/Board
  - requirements/rules#panel/Board
  - requirements/tech#panel/Board
  - requirements/ui#time
drift: null
proposal: u4osxzox
agent: false
created: 2026-10-21T15:20:49.406Z
finished: 2026-10-21T15:22:03.262Z
---
# Avviso dei lavori non seguiti

Quando il controllo di esecuzione smette di seguire un lavoro, perché il suo agente non c'è più o perché un lavoro della chat non si è mai legato alla sua conversazione, in cima alla Board compare un avviso `Trama stopped following <lavoro>: <motivo>.`, accanto agli avvisi dei ghost, nello stesso stile dell'avviso dell'Advisor e con il pulsante `Close` con l'icona `X`. `<lavoro>` è il nome del terminale (per esempio `T3`, `All tasks`, `Design`, `Scan`) o, per un lavoro della chat, il nome che avrebbe il suo terminale. `<motivo>` è `the agent's process is gone` quando il processo di omp, o senza di lui la shell del terminale, non esiste più; `the terminal is gone` quando il terminale non esiste più; `the chat never started its conversation` per un lavoro della chat mai legato alla sua conversazione. Un turno della chat interrotto soltanto da `sessionEnd` con motivo `aborted` o `error`, senza uno `stop` prima, mostra `Trama stopped following <lavoro>: Cursor ended the session (<motivo>).` con il motivo come lo dà Cursor.

Quando il controllo, o `trama task check`, libera un Task perché nessuna finestra segue chi lo teneva, compare `Trama stopped following <numero breve> <titolo>: no window follows its agent.`, con lo stesso pulsante.

C'è un avviso per lavoro o per Task, soltanto nella finestra che ha fatto il controllo; resta finché il developer non lo chiude o il pannello non si chiude, e si disegna anche mentre è aperta un'altra scheda del pannello. Gli avvisi dei ghost ritirati con lo stesso lavoro compaiono come sempre accanto. Il testo non segue `trama.language`. Il messaggio dall'host al webview segue lo schema di `finalReviewMissing`.

Le schede consegnate da un agente che aspettano la fine del suo turno (Proposal consegnate, Drift e Task archiviati) smettono di aspettare anche quando il controllo di esecuzione smette di seguire il terminale o il lavoro della chat di quell'agente: l'estensione le toglie dall'insieme delle schede in attesa e i loro pulsanti si abilitano da soli, come per ogni altra fine del turno.
