---
status: resolved
resolution: fix-code
refs:
  - agent-terminal/Agent idle
  - requirements/quality#agent-terminal
proposal: null
task: j44q2543
origin: null
critical: false
option: 1
note: null
resolvedBy: xhf0y2fl
created: 2026-10-14T08:56:50.795Z
---
# Tasks and announcements left by an idle agent terminal are never released

## What happens

Un terminale a riposo non è più seguito da Trama. Se il developer scrive a mano un prompt in quel terminale e l'agente prende un Task, il Task resta **preso** dall'agente: nessun evento lo libera, quindi i pulsanti Run restano bloccati finché il developer non usa take-back. Anche gli annunci che l'agente fa da lì restano in attesa sulla Board: li ritira solo la fine del comando o la chiusura di un terminale ancora seguito, e chiudere il terminale a riposo non fa nulla.

## What should happen

Il Modello dice che Trama non segue più il terminale a riposo, ma non dice cosa succede al lavoro che l'agente fa da lì. I Requisiti di qualità dicono che il developer libera i Task presi dall'agente chiudendo il terminale o con take-back: chiudere un terminale a riposo dovrebbe quindi lasciarlo libero, oppure il Modello dovrebbe dire chiaramente che resta da fare a mano.

## Fix options

### Liberare il lavoro alla chiusura del terminale a riposo

Quando il developer chiude un terminale a riposo, Trama rilascia i Task che vi ha preso e ritira i suoi annunci in attesa, come per un terminale seguito. Trama deve ricordare i terminali a riposo fino alla chiusura o al riavvio dell'editor, senza riprendere a seguirli. Costo: una piccola memoria in più per ogni terminale a riposo e un Modello da aggiornare per dire che la chiusura libera il lavoro.

### Lasciare il lavoro al developer con take-back

Il terminale a riposo resta com'è: codice e Modello non cambiano. Il developer usa trama task take-back sui Task presi da lì e chiude a mano gli annunci rimasti. Costo: un lavoro fatto a mano in un terminale a riposo può bloccare i pulsanti Run finché il developer non interviene, e il Modello va chiarito su questo punto.

## Where in the code

extension/src/host/agent.ts: finishAgentTerminal, endAgentWork, the onDidCloseTerminal handler
