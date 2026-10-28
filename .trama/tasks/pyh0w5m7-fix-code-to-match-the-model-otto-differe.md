---
column: done
technical: false
refs:
  - requirements/ui#menu-laterale
  - menu-laterale
  - raffinamento/Fermo
  - requirements/rules#raffinamento
  - requirements/ui#raffinamento
  - requirements/rules#focus
  - omp-chat-general/Waiting for the window
  - omp-chat-general/Starting
  - requirements/tech#voce-history
  - proposal/Open
  - issue/Publishing/agent.RECORD_ISSUE_PUBLISHED
  - issue/Not published/developer.PUBLISH_AGAIN
  - requirements/rules#project
  - requirements/tech#project
drift: 2pdnq92f
proposal: null
agent: false
created: 2026-10-27T07:44:42.592Z
finished: 2026-10-27T08:04:10.361Z
---
# Fix code to match the Model: Otto differenze col codice

## What happens

- **Menu laterale:** passa alle sole icone sotto i **72 px** di larghezza della vista: fra 56 e 72 px il testo sparisce.
- **Raffinamento:** gli avvisi «non è partito» e «raffinata ma non approvata» compaiono come notifiche dell'editor, non sulla Board.
- **Diagramma:** un riferimento a una sezione dei Requisiti non intitolata a un elemento del Modello conta fra i mancanti («N not found»), anche se la sezione esiste.
- **General:** dopo una ricarica con la sessione non riaperta riparte vuota, ma mostra la riga `New session: the agent does not remember the messages above.`
- **History:** il dettaglio di una voce usa la finestra di dialogo del pannello, non un dialog nativo aperto come modale.
- **Split:** la divisione di un issue lungo è rifiutata mentre un Run di questa finestra è in corso, come dice il Requisito ma non il Modello.
- **Issue:** l'agente registra l'esito della pubblicazione anche fuori da Publishing, così un issue Not published passa a Published senza Publish again.
- **Copilot:** nessuna pulizia delle tracce di Copilot, come dice la regola di tecnologia, mentre la regola del progetto la chiede ancora.

## What should happen

- **Menu laterale:** sole icone sotto i **56 px**, testo da 56 px in su.
- **Raffinamento:** gli avvisi stanno in cima alla Board, con il pulsante di chiusura degli altri avvisi, e la Board dice perché la Proposal resta da raffinare.
- **Diagramma:** quel riferimento non è né un passo né un mancante, come le sezioni General e le Aree intere.
- **General:** dopo la ricarica riparte vuota senza la riga; la riga compare solo dopo un omp chiuso da solo, con la storia di prima sopra.
- **History:** il dettaglio è un dialog nativo aperto come modale, con focus trattenuto, Esc e chiusura cliccando fuori.
- **Split:** Modello e Requisito dicono la stessa cosa; oggi il Modello permette la divisione appena l'agente ha finito il turno e nessuno scrive la Proposal, il Requisito la blocca anche durante un Run.
- **Issue:** l'esito si registra solo per un issue in Publishing; un issue Not published torna in pubblicazione solo con Publish again.
- **Copilot:** una sola regola vale per tutto il progetto; oggi la regola del progetto e quella di tecnologia si contraddicono.

Split e Copilot sono contraddizioni fra Modello e Requisiti: nessuna correzione del codice le chiude, quindi il Drift non ha Fix options.

## Note

Correggere nel codice solo queste quattro differenze; le altre quattro (History, Split, Issue, Copilot) sono chiuse da questa risoluzione adeguando Modello e Requisiti.

- Menu laterale: misurare la vista intera (spostare il margine interno del menu su un elemento figlio del contenitore), così le sole icone compaiono sotto i 56 px come dice il Requisito.
- Raffinamento: gli avvisi «did not start» e «was refined but not approved» vanno nella riga degli avvisi in cima alla Board, con il pulsante di chiusura, al posto della notifica dell'editor.
- Diagramma: un riferimento a una sezione dei Requisiti che esiste ma non è intitolata a un elemento del Modello non è né un passo né un mancante, come General e le Aree intere.
- General: dopo una ricarica con la sessione non riaperta, General riparte vuota senza la riga `New session: …`; la riga resta solo dopo un omp chiuso da solo.

## Where in the code

extension/src/webview/menu/app.tsx (MenuApp, container query del menu); extension/src/host/controller.ts (startRefinement, settleRefined, splitIssue); extension/src/webview/focus/diagram.ts (elementRef, diagramSteps); src/core/omp-chat-general.ts (stato waiting, sessionNotResumed); extension/src/host/omp-chat/general.ts (open, attach, generalStatus); extension/src/webview/omp-chat/conversation.tsx (riga di sessione nuova); extension/src/webview/board/history.tsx; extension/src/webview/ui/dialog.tsx; src/core/issues.ts (splitIssueBlock, moveIssue); src/cli/commands/issue.ts (move); src/cli/commands/project.ts (Update skills) ed extension/src/host (controllo all'apertura): nessuna pulizia di Copilot
