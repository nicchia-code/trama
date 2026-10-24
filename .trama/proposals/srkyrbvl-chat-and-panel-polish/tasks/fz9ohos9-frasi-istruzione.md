---
technical: false
refs:
  - agent-terminal
  - agent-launching
  - requirements/rules#agent-terminal
  - requirements/tech#agent-terminal
  - requirements/ui#agent-terminal
---
# Frasi dell'istruzione

Con `trama.autoExit` acceso (predefinito) Trama chiude il terminale appena l'agente ha finito, e nessuno legge più il suo resoconto finale: l'istruzione deve quindi dire all'agente di finire con al più una riga breve. Intanto l'impostazione della lingua è disabilitata: gli agenti scrivono tutto in inglese.

Quando è fatto:
- `extension/src/host/prompts.ts` ha, accanto a `ASK_DEVELOPER_SENTENCE`, una costante con la frase esatta `Trama closes this session as soon as you finish: end with one short line at most, with no summary or report.`.
- `agentPrompt` in `extension/src/host/agent.ts` (oggi `withLanguage(\`${withSharing} ${ASK_DEVELOPER_SENTENCE}\`, configuredLanguage())`) aggiunge la frase sulla stessa riga, subito dopo la frase delle domande (`ASK_DEVELOPER_SENTENCE`) e prima di quella della lingua, solo quando `trama.autoExit` è acceso al momento dell'invio, letto con la stessa lettura usata dalla chiusura del terminale (`settings().get<boolean>("autoExit", true)`). Con l'impostazione spenta l'istruzione resta esattamente com'era.
- Vale per ogni lavoro con l'hook: design, setup, scan di ogni tipo, import, implement, implement all e ogni Run di una sequenza per modello, Resolve Drifts, Unify Drifts, i rifacimenti con Rework with feedback e i raffinamenti; nel terminale e in omp Chat, che usano lo stesso prompt (`terminalRun().prompt`). Vale anche dove un'altra regola elenca le frasi di un'istruzione senza nominarla.
- Ask more (`openAskMore`, che costruisce il proprio prompt) e la conversazione General di omp Chat non la portano mai: non si chiudono a riposo.
- La frase segue `trama.autoExit` al momento dell'invio; la chiusura del terminale continua a seguire l'impostazione al momento della fine, come oggi.
- Lingua disabilitata: `configuredLanguage` in `extension/src/host/agent.ts` restituisce nessuna lingua qualunque valore abbia `trama.language`, dietro una sola costante `LANGUAGE_SETTING_ENABLED = false`, così riaccenderla è un cambio di una riga. Nessuna istruzione (comprese quelle di Ask more) porta più la frase della lingua di `withLanguage`; `trama.language` resta in `contributes.configuration` con il default `""`. `withLanguage` e le regole della lingua restano per quando l'impostazione tornerà accesa.
- La descrizione di `trama.autoExit` in `extension/package.json` (`markdownDescription`) diventa «Close the agent's terminal as soon as the agent is idle or its command ends, and ask the agent to skip its final summary (default on).».
- Le skill non cambiano.
- Un test in `test/host-prompts.test.ts` prova la posizione della frase (dopo `ASK_DEVELOPER_SENTENCE`, prima della lingua) con l'impostazione accesa, la sua assenza con l'impostazione spenta e in Ask more, e che nessuna istruzione porta la frase della lingua anche con `trama.language` valorizzata.
