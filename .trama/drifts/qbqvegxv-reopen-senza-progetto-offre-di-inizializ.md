---
status: resolved
resolution: fix-code
refs:
  - question-round/Out of sight/developer.OPEN_PANEL
  - requirements/rules#question-round
proposal: null
task: 0tgef9nw
origin: null
critical: false
option: 1
note: null
resolvedBy: i7p31mdz
created: 2026-10-14T12:54:07.048Z
---
# Reopen senza progetto offre di inizializzare invece di mostrare il round

## What happens

Con un round di domande ancora aperto, se il progetto Trama non c'è più nello spazio di lavoro e il developer riapre il pannello con **Reopen** o con il comando Open Trama, il pannello non mostra il round. Offre invece di **inizializzare un progetto**. Il round resta in attesa dell'agente, e le domande compaiono solo dopo che il developer inizializza il progetto.

## What should happen

Il Modello dice che il developer apre il pannello con il comando o con Reopen, e che il pannello torna in primo piano con **l'overlay riaperto** sulla domanda o sul riepilogo che mostrava. Le domande non dipendono dal progetto: quando il round si apre, il pannello le mostra anche senza progetto. Il Requisito dice che Reopen, con un round ancora aperto, riporta il round.

## Fix options

### Mostrare il round anche senza progetto

Riaprire il pannello con un round aperto riporta l'overlay anche se `.trama/` non c'è più, come già accade quando il round si apre. Il developer risponde subito e l'agente riceve le risposte. Il Diagramma, la Board e i Requisiti restano vuoti e il pannello dice che serve un progetto. Costo: il pannello senza progetto mostra solo le domande, e va spiegato.

### Offrire di inizializzare, poi mostrare il round

Con un round aperto e senza progetto, Reopen continua a offrire di inizializzare il progetto, e solo dopo l'inizializzazione il pannello mostra il round. Il comportamento resta com'è, e il Modello lo dice esplicitamente. Costo: per rispondere a una domanda il developer può dover creare un progetto. Se rifiuta, l'agente aspetta senza che nessuno veda la domanda, senza scadenza.

## Where in the code

`extension/src/host/controller.ts`: `open()`, usato da Reopen e da Open Trama, cerca il progetto e, se manca, offre di inizializzarlo prima di aprire il pannello. `revealForQuestions()`, usato quando il round entra in Asking, invece mostra il pannello anche senza progetto.
