---
status: resolved
resolution: fix-code
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
proposal: null
task: pyh0w5m7
origin: null
unifies:
  - bncvm9y3
  - tglmmrfi
  - osfxi3oc
  - ebfa2o7y
  - gmhjdvmz
  - d8enfr4b
  - tp41lv93
  - 7uge71w4
option: null
note: |-
  Correggere nel codice solo queste quattro differenze; le altre quattro (History, Split, Issue, Copilot) sono chiuse da questa risoluzione adeguando Modello e Requisiti.

  - Menu laterale: misurare la vista intera (spostare il margine interno del menu su un elemento figlio del contenitore), così le sole icone compaiono sotto i 56 px come dice il Requisito.
  - Raffinamento: gli avvisi «did not start» e «was refined but not approved» vanno nella riga degli avvisi in cima alla Board, con il pulsante di chiusura, al posto della notifica dell'editor.
  - Diagramma: un riferimento a una sezione dei Requisiti che esiste ma non è intitolata a un elemento del Modello non è né un passo né un mancante, come General e le Aree intere.
  - General: dopo una ricarica con la sessione non riaperta, General riparte vuota senza la riga `New session: …`; la riga resta solo dopo un omp chiuso da solo.
resolvedBy: 3b2ri2b3
created: 2026-10-27T07:33:50.352Z
job: e355e590-3768-4367-92b5-e56f0adace5e
---
# Otto differenze col codice

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

## Where in the code

extension/src/webview/menu/app.tsx (MenuApp, container query del menu); extension/src/host/controller.ts (startRefinement, settleRefined, splitIssue); extension/src/webview/focus/diagram.ts (elementRef, diagramSteps); src/core/omp-chat-general.ts (stato waiting, sessionNotResumed); extension/src/host/omp-chat/general.ts (open, attach, generalStatus); extension/src/webview/omp-chat/conversation.tsx (riga di sessione nuova); extension/src/webview/board/history.tsx; extension/src/webview/ui/dialog.tsx; src/core/issues.ts (splitIssueBlock, moveIssue); src/cli/commands/issue.ts (move); src/cli/commands/project.ts (Update skills) ed extension/src/host (controllo all'apertura): nessuna pulizia di Copilot

## Prepared question

```json
{
  "question": {
    "id": "2pdnq92f",
    "question": "Le otto differenze fra codice e Modello si chiudono adeguando Modello e Requisiti a ciò che il codice fa oggi?",
    "context": "Il Drift unisce otto differenze: soglia delle sole icone del menu laterale (72 px nel codice, 56 px nel Requisito); avvisi del raffinamento come notifiche dell'editor invece che sulla Board; riferimenti a sezioni senza elemento contati come mancanti nel Diagramma; riga di sessione nuova di General anche dopo una ricarica; dettaglio di una voce di History senza dialog nativo; Split di un issue bloccato durante un Run; esito della pubblicazione di un issue registrato anche fuori da Publishing; pulizia delle tracce di Copilot chiesta dalla regola del progetto ma esclusa da quella di tecnologia.\n\nDue differenze (Split e Copilot) sono contraddizioni fra Modello e Requisiti, che nessuna correzione del codice può chiudere: per questo il Drift non ha Fix options. Chi preferisce correggere il codice per le altre differenze può chiederlo nella risposta libera.",
    "options": [
      {
        "label": "Adottare la Proposal allegata",
        "description": "Modello e Requisiti dicono ciò che il codice fa oggi, per tutte le otto differenze.",
        "details": "Soglia del menu a 72 px, avvisi del raffinamento nell'editor, mancanti del Diagramma come oggi, riga di sessione nuova dopo la ricarica, `Dialog` del pannello per History, Split bloccato durante un Run anche nel Modello, esiti di pubblicazione accettati da Not published, nessuna pulizia di Copilot nella regola del progetto. Il codice non cambia."
      },
      {
        "label": "Chiudere senza cambiare nulla",
        "description": "Il Drift si chiude; codice, Modello e Requisiti restano come sono.",
        "details": "Le contraddizioni su Split e Copilot restano, e uno scan successivo può ritrovare le stesse differenze."
      }
    ],
    "recommended": 0,
    "multi": false
  },
  "decisions": [
    {
      "decision": "proposal"
    },
    {
      "decision": "dismissed"
    }
  ],
  "fingerprint": "41b2d9dfb9cc0e37871d0d83916a7b9c36a2c408a7a168be2cfb8f0356a694b1",
  "prepared": "2026-10-27T07:34:18.213Z"
}
```
