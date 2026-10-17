---
technical: false
refs:
  - agent-terminal
  - requirements/rules#agent-terminal
  - requirements/ui#agent-terminal
---
# Istruzioni e nomi del terminale senza richiesta rapida né realizzazione di un design

Quando il Task è finito, l'host non costruisce più due istruzioni: quella della richiesta di design rapida di una riga ("Use the trama-design skill. <request>", con la sua casella di input) e quella che realizza i Task di un design (implement a design). Le istruzioni restanti sono: written design request, scan del System, scan di Feature, implement, implement all, Resolve Drifts e import; ognuna conserva la frase "Run at most N sub-agents at once." (dove può avere sotto-agenti), la frase della lingua e, nella chat di Cursor, la seconda riga del PATH. Tolte le istruzioni, va tolto anche il codice che le serve (costruzione del testo, rifiuto di una Proposal inesistente, eventuali comandi o messaggi del protocollo), senza shim.

Resolve Drifts si avvia in due modi: con `Resolve all` nomina, in ordine di creazione, tutti i Drift aperti fuori da ogni risoluzione; con `Resolve` su un Drift nomina soltanto quel Drift, con lo stesso instradamento per modalità (`disabled`, `enabled`, `yolo`) e lo stesso testo automatico. Una richiesta `Resolve` su un Drift che non è più aperto è rifiutata, come uno scan di una Feature inesistente o un implement di un Task inesistente.

Il nome del terminale dell'agente (e il titolo della scheda con `trama.terminalLocation` = `editor`) è: il numero breve del Task per implement; `Design` per la written design request; `Setup` per la richiesta di setup; `Scan` per gli scan; `All tasks` per implement all; `Drifts` per Resolve Drifts, sia con `Resolve all` sia con `Resolve`; `Import` per l'import. Non esiste più il nome con l'identità permanente della Proposal. Il nome resta fisso finché il terminale è aperto e non segue la lingua.

La descrizione inglese di `trama.submitWhileRunning` nel `package.json` dell'estensione diventa: «Let a run start while another run started by Trama is in progress. Off (the default): Run and Run all are unavailable while a run started by Trama is in progress. On: a run can start while another one is in progress.», senza più `Run this design` né `Run Ready Tasks`.

Aggiornare i test dell'host che coprono testi delle istruzioni e nomi dei terminali (togliendo i casi del design rapido e di implement a design, aggiungendo `Resolve` su un solo Drift) e la documentazione in `docs/` che li cita.
