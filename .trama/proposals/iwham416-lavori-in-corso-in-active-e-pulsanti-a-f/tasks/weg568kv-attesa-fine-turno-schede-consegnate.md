---
technical: false
refs:
  - panel/Board
  - requirements/rules#panel/Board
  - requirements/tech#panel/Board
---
# Attesa della fine del turno per le schede appena consegnate

Quando il Task è finito, una scheda appena consegnata da un agente aspetta la fine del turno di quell'agente prima di potersi decidere o avviare: una Proposal quando è consegnata (anche dopo essere tornata a Draft), un Drift o un Task quando è archiviato.

- `trama proposal submit`, `trama drift new` e `trama task new`, quando riescono, mandano all'editor, sul canale locale già usato per le domande e per la delega, l'identità della scheda e la provenienza: `TRAMA_TERMINAL` quando c'è, altrimenti `chat`. Senza editor raggiungibile non mandano nulla e non falliscono. La riga di comando non aspetta mai e non consulta l'elenco delle schede in attesa.
- L'host dell'estensione tiene in memoria, per finestra, l'insieme delle schede in attesa con il loro terminale o la chat, senza timer e senza persistenza: chiudere o riaprire l'editor dimentica l'attesa. Le toglie al primo segnale di fine che già usa per gli annunci: hook a riposo, fine del comando scritto da Trama (confrontato come per gli annunci), chiusura del terminale; per la chat `AGENT_STOPPED`, `AGENT_INTERRUPTED`, `CONVERSATION_CLOSED` di una conversazione di Trama del progetto. Si toglie solo l'attesa dell'agente che ha consegnato la scheda, mai quella degli altri; i segnali ripetuti non cambiano nulla.
- Non registra l'attesa (la scheda segue soltanto le regole di prima) quando il terminale è un terminale di Trama senza hook (modulo di omp mancante o hook rifiutati da Claude Code), quando la scheda arriva con `chat` e nessuna conversazione di Trama del progetto ha un turno in corso, o quando l'editor che riceve il messaggio non è quello che segue l'agente.
- Il quadro della Board mandato al webview porta l'elenco delle identità in attesa, e si rimanda quando l'insieme cambia, così i pulsanti si abilitano da soli.
- L'host rifiuta con il motivo `The agent is still finishing` i messaggi di approvazione e rifiuto di una Proposal, `dismissDrift`, Resolve di un singolo Drift e Run di un Task che arrivano per una scheda in attesa, anche quando partono dai dettagli del Diagramma. `Run all`, `Resolve all` e `+ Add Work Item` non cambiano.

Aggiornare il protocollo in `extension/src/protocol.ts` con il nuovo campo del quadro e i test dell'host e della CLI che coprono registrazione, fine del turno, casi senza attesa e rifiuto dei messaggi.
