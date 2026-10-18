---
technical: false
refs:
  - question-round
  - agent-questions
  - agent
  - requirements/rules#question-round
  - requirements/rules#General
  - requirements/tech#question-round
---
# Domande senza ripieghi

Nel lavoro di Trama l'agente fa domande al developer solo con i round di domande di Trama (`trama ask`), mai con il proprio strumento di domande né scrivendo le domande nella conversazione. Quando l'editor non è disponibile non c'è più nessun ripiego: l'agente si ferma.

## Round con l'editor non disponibile

Nella Machine `question-round`, le due Transition da Not asked a Unanswered su `agent.ASK_QUESTIONS` cambiano il messaggio all'agente. In `src/core/questions.ts` (`unavailableQuestions`) il `reason` del risultato `unavailable` diventa, esattamente:
- senza `CURSOR_SANDBOX`: «Editor not available for this project. Do not ask in any other way: stop, tell the developer to open the project in the editor with Trama, and run the same trama ask again when they say to continue.»
- con `CURSOR_SANDBOX`: «Editor not reachable from Cursor's sandbox. Run the same trama ask once more outside the sandbox; if the editor is still unavailable, stop and tell the developer to open the project in the editor with Trama.»

Nessuno dei due testi nomina più lo strumento di domande dell'agente. `status` resta `unavailable` e l'uscita resta 0. I test che fissano i vecchi testi (`test/question-channel.test.ts`) si aggiornano ai nuovi.

Nello stato Unanswered l'agente non chiede in nessun altro modo: ferma il lavoro che aspettava quelle decisioni, senza aprire né consegnare Proposal, dice al developer di aprire il progetto nell'editor con Trama e, quando il developer gli dice di continuare, rilancia lo stesso `trama ask`, che è un round nuovo. Dalla sandbox di Cursor ripete prima lo stesso `trama ask` una volta fuori (chiedendo il permesso a Cursor); se anche fuori è `unavailable`, si ferma allo stesso modo.

Documentazione e commenti seguono:
- `docs/cli.md` riporta i due nuovi testi e non dice più che questo esito permette all'agente di usare il proprio strumento di domande.
- `docs/uat.md`: i passi P9, P11 e R3 che prevedono il ripiego sulle domande dell'agente diventano l'arresto con la richiesta di aprire l'editor e il nuovo `trama ask` quando il developer dice di continuare.
- In `extension/src/protocol.ts` il commento «the agent asks its own questions» descrive invece che l'agente si ferma e chiede di aprire l'editor.

## Messaggio di rifiuto condiviso

Il messaggio di rifiuto dello strumento di domande dell'agente è definito una sola volta in core, come costante, con il testo esatto di `tech#question-round`: «In Trama's work, ask the developer only with `trama ask --root <project>`, as the Trama skill says. This question tool is disabled here.». `<project>` resta scritto così. Gli hook degli agenti la riusano (gli hook stessi sono in altri Task).

## Skill

Le skill si modificano in `skills/`, la sorgente di `.agents/skills` che `trama skills update` aggiorna.

- `trama-design`, `trama-import` e `trama-resolve-drifts` perdono gli elenchi dei ripieghi per agente (`ask` di omp, `AskQuestion` di Cursor, `vscode_askQuestions`, round numerato nella conversazione). Al loro posto: con `status: "unavailable"` l'agente si ferma, chiede al developer di aprire il progetto nell'editor con Trama e rilancia lo stesso `trama ask` quando gli viene detto di continuare. Il ritentativo fuori dalla sandbox di Cursor resta. Vietano per nome `AskQuestion`, `vscode_askQuestions`, `ask` di omp, `AskUserQuestion` e i round scritti nella conversazione, e chiamano `trama ask` per nome, mai «your question tool». Solo il risultato iniziale `unavailable` è editor non disponibile: un errore d'uso o di input si corregge e si ripete; una domanda saltata di proposito non si richiede. `trama-setup` segue le stesse regole.
- `trama-scan`: fa una domanda solo quando davvero non riesce a capire se il codice esiste (per esempio perché sta in un altro repository), con `trama ask`, rimandando alla sezione «Asking» di `trama-design`, e solo quando lo scan è chiesto a mano. Dentro un Run (pre-flight e scansione di fine corsa, Run a mano o automatico) non fa domande: scrive il dubbio nel resoconto e il Run non si ferma ad aspettare.
- `trama-implement`: ogni domanda passa da `trama ask`, rimandando alla sezione «Asking» di `trama-design`.
- La regola ferma su approvare, rifiutare, scartare o risolvere, in `trama-implement`, `trama-design`, `trama-import`, `trama-resolve-drifts` e `trama-setup`, diventa: senza una richiesta esplicita del developer nella conversazione l'agente non decide e non ne fa una domanda; si ferma e dice al developer che la decisione è sua, sulla Board.

## Modello

La Feature `agent-questions` e l'Actor `agent` descrivono che l'agente chiede solo con i round di Trama, in ogni lavoro, e che le decisioni del developer non diventano domande. Le Transition da Not asked a Unanswered e lo stato Unanswered di `question-round` descrivono l'arresto invece del ripiego.
