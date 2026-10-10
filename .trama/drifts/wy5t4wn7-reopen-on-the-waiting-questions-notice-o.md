---
status: resolved
resolution: proposal
refs:
  - panel/Closed
  - question-round/Out of sight/developer.RESTORE_QUESTIONS
proposal: null
task: null
origin: null
option: null
note: null
resolvedBy: 5mztm9sl
created: 2026-10-10T11:28:37.056Z
---
# Reopen on the waiting-questions notice opens the panel without a Panel Transition

## What happens

Dopo che il developer chiude il pannello con un round di domande aperto, la notifica `Trama has questions from the agent waiting.` offre **Reopen**. Cliccarlo apre il pannello Trama (o lo porta in primo piano) e riporta l'overlay delle domande, seguendo lo stesso percorso di Open Trama: senza progetto offrirebbe anche di inizializzarne uno.

Il pannello passa quindi da Closed a Open per un gesto, la riapertura delle domande, che il Diagramma del Panel non conosce.

## What should happen

Il Question round dice che con `developer.RESTORE_QUESTIONS`, dalla barra **o dal pulsante della notifica**, il pannello si apre o torna in primo piano se serve.

Il Panel però è aperto solo da `developer.OPEN_PANEL` e `question-round.ROUND_OPENED`: lo Stato **Closed** non ha nessuna Transizione su `developer.RESTORE_QUESTIONS`, e l'Evento non ha il Panel fra chi lo riceve. Il Modello è quindi incoerente tra le due Machine, e il codice segue il Question round.

## Fix options

### Add the Transition to the Panel

Il Modello aggiunge al Panel la Transizione Closed → Open su `developer.RESTORE_QUESTIONS` (il pannello si apre sulla Diagramma con l'overlay riaperto), e se serve Open → Open che lo porta in primo piano. Il codice non cambia. Costo: una modifica del Modello e la scansione del Panel.

### Make the notice's Reopen an Open panel

Il Modello lascia `developer.RESTORE_QUESTIONS` alla sola barra dentro il pannello già aperto, e dice che il pulsante della notifica è `developer.OPEN_PANEL`, che il Panel e il Question round già conoscono. Il codice non cambia, perché la riapertura usa già il percorso di Open Trama. Costo: riscrivere il testo dell'Evento e della Transizione del Question round.

## Where in the code

`extension/src/host/controller.ts`: `offerReopen`, che chiama `open()` alla scelta di **Reopen**.
