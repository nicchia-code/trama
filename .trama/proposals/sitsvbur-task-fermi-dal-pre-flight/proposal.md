---
status: rejected
base:
  work/drift.md: f59a9740d5139de74b34703427b5f73b24b550da9305db8b96a0d73f9d4c04ea
  work/task.md: d60807294263f3902c459510ee1cdbcddacb1b07651bbd345f3a56e230a01864
  agent-launching/agent-terminal.md: 38424cdcd9ee673b47d1c2ab6a8e945e9561434cdf151783c32caee84c3abaad
  requirements/rules/drifts.md: 39e2766dca6310b4491785d4fae5d5c324cc04909ecb6b8ae8821c0ea383fd4f
  requirements/rules/tasks.md: 5caa97fb106085312a1999b7adeffb935c502f7df79452b11604345c4a9bd5c5
  requirements/quality/main.md: f4b9be5a87555cb639ed42d671215e33c7f6bdeb9f523880ea3737d2f3e9742a
  requirements/tech/drifts.md: 9efc944c0cf323cbfefa2559b75b0381a677ce41f1f800613d14b728b06e602b
  requirements/tech/agent-terminal.md: 19c0ed2975f4b4fdee9f5d58bd209822b44f86361e5f82bdae186c0ae8b3c0fe
  requirements/tech/work.md: fd11f1af86beacccede0d135b0d62a952335fc54835be2bb1596f83f27231624
  requirements/ui/settings-specs.md: e61eb3da8f8404b872f0c6b4a6c9540abb062452c1fdcf71a5898ce53694343e
  agent-launching/drift-resolution.md: eeb23fd9d900e8826fb3df5d85862bdcb4bb59f1233a4da8811565d8c4eefff6
  requirements/rules/autopilot.md: 0b7917c2fae36d85ad309e2daf0053f02848152e322dd77176954f7790463d89
  requirements/rules/models.md: 51b9f7f9d115e16eed23c4ab5ff17576f2c4b25a1c34a0a8d2976b0ee4b6e510
  requirements/tech/autopilot.md: c378833f6bd97ac8a5fc9ce2e18289642c90fae3a83fb7b979e3ed46bc0f6357
  requirements/ui/work.md: 87bf368e60f8a24b31dec9813f70881776ca182c44fd2a5ebdc9f326d1793a42
delete: []
request: 2026-10-19T20-02-42
created: 2026-10-19T18:18:20.716Z
label: Task fermi dal pre-flight
---
# Task fermi dal pre-flight

Analisi della richiesta: i Task non si perdono, ma possono restare fermi in To do senza che il developer se ne accorga. Caso reale (Axi): il Task «Scaricamento PDF delle pagine web» è rimasto in To do per tre Run all di fila. Ogni volta il pre-flight ha trovato una differenza già presente nel codice su un elemento che il Task nomina (prima `archiviazione`, poi `archiviazione/Acquisizione`, infine `documento/Nel vault` a proposito delle citazioni in chat). L'ha registrata come Drift, e il blocco strutturale l'ha fermato: una sezione di Requisiti nominata dal Task vale per tutta la sua Machine. Il blocco sperimentale dei Drift era acceso nelle impostazioni, ma non arrivava ai sotto-agenti del pre-flight, che hanno scritto di averlo spento. Il resoconto di ogni Run diceva che il Task restava in To do, ma stava solo nel terminale, che `trama.autoExit` chiude appena l'agente va a riposo. Sulla Board il Task era una riga dentro la scheda rossa del Drift.

Decisioni (il developer ha saltato tutto il round di domande: valgono le raccomandazioni, da controllare):
- Il pre-flight di un Run giudica sempre quali Task un suo Drift tocca davvero e lascia liberi gli altri, con il motivo, anche con il blocco sperimentale spento.
- Con il blocco sperimentale acceso, Trama lo comunica anche ai sotto-agenti, attraverso l'ambiente del terminale dell'agente e il testo dei comandi che preparano una registrazione di Drift, senza contare solo sulla frase che l'agente principale dovrebbe ripetere.
- Alla fine di un Run, l'editor mostra un avviso con i Task del Run rimasti bloccati e un pulsante per aprire la Board.
- Nessuna ripresa automatica: quando il Drift è risolto, il Task torna eseguibile e lo avvia il developer, come oggi.

Assunzioni prese senza chiedere (da controllare):
- Con il blocco sperimentale spento, un Drift del pre-flight che non blocca nessun Task resta un normale Drift aperto in Blocked: non entra in una risoluzione `nonBlocking`.
- L'avviso elenca solo i Task che al lancio erano eseguibili nell'ambito del Run e alla fine sono in To do e bloccati, da un Drift o in attesa di un Task di correzione. Non elenca i Task lasciati indietro da un'interruzione senza blocco.
- Una sequenza di Run per modello dà un solo avviso, alla sua fine. Il Run automatico della delega dà il suo avviso come ogni Run.
- Nelle chat dell'editor non c'è l'ambiente del terminale: lì il blocco sperimentale resta affidato alla frase dell'istruzione e al testo dei comandi.
