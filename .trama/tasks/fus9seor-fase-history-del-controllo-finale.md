---
column: done
technical: false
refs:
  - announcement
  - announcement/Verifying/agent.CHANGE_CHECK_PHASE
  - announcement/Scanning/agent.CHANGE_CHECK_PHASE
  - announcement/Aggiornamento della History
  - agent.CHANGE_CHECK_PHASE
  - requirements/data#announcement
  - requirements/rules#announcement
drift: null
proposal: uvn8ulmq
agent: false
created: 2026-10-17T10:26:31.354Z
finished: 2026-10-17T11:18:12.565Z
---
# Fase History nel controllo finale di una corsa

Un controllo (annuncio di tipo `check`) ha una terza fase, History: il campo `phase` del front matter accetta `verifying`, `scanning` o `history`, e la lettura degli annunci non scarta più un controllo in `history`. Il comando `trama announce phase <id> history` porta un controllo in History partendo da Verifying o da Scanning; resta valido il passaggio da Verifying a Scanning; su un controllo già in History non cambia nulla e lo dice; un passaggio all'indietro (da History o da Scanning a Verifying) è rifiutato senza cambiare nulla. I dati di un controllo non dicono se è il controllo finale di una corsa, quindi il comando non lo controlla: è la skill `trama-implement` a usare History solo nel suo controllo finale. Come ogni dichiarazione dell'agente sul controllo, il passaggio a History aggiorna `touched`. Un controllo in History si chiude con `FINISH_CHECK` come dopo la verifica o lo scan: consegnato, il ghost sparisce senza avviso; ritirato per gli altri motivi, dà l'avviso del controllo come oggi.

La skill `trama-implement` (sorgente in `skills/` e copia installata dalle skill di progetto) cambia la fase finale della corsa: dopo la verifica (e, se parte, dopo la scansione mirata) se la corsa ha realizzato almeno un Task — Task chiusi con `--unchanged` esclusi — passa il controllo a History con `trama announce phase <id> history`, scrive o aggiorna le voci di History, e solo dopo chiude il controllo, prima del resoconto. Vale anche quando la verifica è fallita e non si riesce a correggere: le voci si scrivono comunque e il controllo si chiude con esito fallito dopo di esse. Se nessun Task è stato realizzato, il controllo si chiude come prima senza passare da History.

Aggiornare l'help del comando `trama announce phase`, i test delle transizioni di fase (Verifying→History, Scanning→History accettate; transizioni non ammesse rifiutate) e la documentazione in `docs/` che descrive le fasi del controllo.
