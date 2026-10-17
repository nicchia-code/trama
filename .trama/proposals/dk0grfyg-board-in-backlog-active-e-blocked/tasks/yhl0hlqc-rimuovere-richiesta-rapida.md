---
technical: false
refs:
  - design-request
  - design-request/Writing/developer.ASK_AGENT
  - agent-launching
  - developer.ASK_AGENT
  - requirements/data#design-request
  - requirements/tech#design-request
  - requirements/ui#design-request
---
# Richiesta di design solo con + Add Work Item, senza richiesta rapida

Quando il Task è finito, l'unico modo di chiedere un design è la richiesta scritta: il pulsante «+ Add Work Item», in fondo alla colonna Backlog della Board, con tooltip «Write a work item in Markdown and send it to an agent», crea il file vuoto `.trama/requests/<id>.md` (con cartella e `.gitignore` se mancano) e lo apre con `showTextDocument` in una scheda non in anteprima, come oggi facevano Add Work Item… e + Work Item. Il testo fantasma della richiesta di design resta quello attuale; Start from Scratch non cambia.

La richiesta rapida sparisce del tutto, con cutover pulito e nessuno shim: il pulsante «Quick request…» e il pulsante «Add Work Item…» della barra della Board, la casella `showInputBox` con titolo «Quick Design Request», il tipo di prompt e il messaggio fra webview e host (`extension/src/protocol.ts`) che la portavano, il comando relativo se esiste, e ogni menzione nella documentazione (`docs/`, README, testi delle skill) e nei test. Il Diagramma e la scheda Requirements continuano a non avere pulsanti per progettare una modifica. L'istruzione all'agente e la skill di design non parlano più di una richiesta rapida.

Nell'evento ASK_AGENT del developer, la risoluzione dei Drift si chiede con `Resolve all` su tutti i Drift aperti o con `Resolve` su un solo Drift; non esiste più l'avvio dei Task in To do di un solo design (il pulsante «Run this design» è tolto dalla Board in un altro Task di questa Proposal). Aggiornare i test dell'host e della webview che coprono la creazione della richiesta e i pulsanti rimossi.
