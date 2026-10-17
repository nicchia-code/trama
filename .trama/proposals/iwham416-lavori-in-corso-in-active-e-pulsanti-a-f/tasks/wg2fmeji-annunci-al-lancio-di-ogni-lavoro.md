---
technical: false
refs:
  - announcement
  - announcement/Preparing
  - announcement/Announced/agent.SUBMIT_PROPOSAL
  - announcement/Announced/agent.FILE_TASK
  - announcement/Announced/agent.FILE_DRIFT
  - announcement/Checking/agent.FINISH_CHECK
  - requirements/data#announcement
  - requirements/rules#announcement
  - requirements/tech#announcement
---
# Trama annuncia ogni lavoro che lancia, con qualunque agente

Quando il Task è finito, l'estensione annuncia ogni lavoro che lancia, con qualunque agente (omp, Claude Code o la chat dell'editor), nel momento in cui l'istruzione parte davvero: scritta nel terminale o inviata alla chat. Un'istruzione che non parte, o che finisce solo negli appunti, non annuncia nulla. Un Run non è annunciato al lancio. L'annuncio prende `terminal` del terminale in cui Trama scrive l'istruzione oppure, con la chat, `chat` (`cursor` in Cursor, `editor` in VS Code), con `source: request`.

- Design: annuncia una Proposal con il titolo della richiesta scritta, anche quando il design va alla chat (finora solo con un agente del terminale). La prima Proposal che l'agente comincia senza nominare un annuncio prende il più vecchio ancora Preparing e il ghost prende il titolo della Draft; la creazione di un annuncio proprio già Writing resta solo quando nessun annuncio di Trama aspetta.
- Resolve Drifts (`Resolve all`, `Resolve` o la raccolta automatica): annuncia la Proposal di risoluzione con H1 `Resolve Drifts` e il nuovo campo `drifts`, la lista delle identità permanenti dei Drift raccolti in ordine di creazione. Il titolo mostrato è calcolato dal pannello e non è mai scritto nel file. Quando l'agente comincia la Draft, l'annuncio passa a Writing ma tiene il suo titolo: la sincronizzazione dell'H1 con il titolo della Draft non tocca mai un annuncio con `drifts`. Resta fino alla consegna della risoluzione.
- Scan del Sistema o di Feature chiesto a mano: annuncia il controllo (`kind: check`, `phase: scanning`, `source: request`) già in Scanning, con titolo `Scanning System`, `Scanning Feature <a>` o `Scanning Features <a>, <b>`. `trama announce check "<title>" --phase scanning`, se esiste un controllo di scan con `source: request` ancora in attesa dello stesso terminale (o con `chat` quando il comando arriva senza `TRAMA_TERMINAL`), non crea un annuncio: prende il più vecchio, ne aggiorna `touched`, tiene il suo titolo e stampa il suo ID. Solo senza di esso crea un controllo nuovo. Da lì il controllo si chiude con `trama announce done` (con o senza `--failed`) come ogni controllo, o è ritirato con l'avviso del controllo.
- Import: annuncia un lavoro (vedi il Task sull'annuncio di tipo `work`).

La consegna non cambia: una Proposal alla consegna (non quando la consegna è rifiutata), un Task o un Drift archiviato con l'ID dello stesso tipo, un controllo con `trama announce done`. I titoli dei controlli di scan annunciati dall'agente diventano anch'essi `Scanning System` / `Scanning Feature…` al posto di `Scan of …`.

Aggiornare la skill `trama-scan` (in `skills/` e nella copia installata dal progetto): all'inizio della scansione chiesta a mano annuncia il controllo con `trama announce check "<titolo>" --phase scanning`, sapendo che così prende quello di Trama se c'è, e con i nuovi titoli. Togliere dal codice ogni restrizione dell'annuncio di lancio ai soli agenti del terminale. Aggiornare i test di `src/core`/`src/cli` sugli annunci (adozione del controllo, campo `drifts`, sincronizzazione del titolo che salta gli annunci con `drifts`) e i test dell'host sul lancio.
