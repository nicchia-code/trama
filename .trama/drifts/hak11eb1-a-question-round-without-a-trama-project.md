---
status: resolved
resolution: fix-code
refs:
  - panel/Closed/question-round.ROUND_OPENED
proposal: null
task: x1yq9118
origin: null
option: 1
note: null
resolvedBy: b4duwb4w
created: 2026-10-09T21:27:38.094Z
---
# A question round without a Trama project does not open the panel

## What happens

Quando l'agente chiede domande e il progetto Trama non c'è più nello spazio di lavoro, il pannello non si apre: il round resta in attesa dell'agente e nell'editor non compare nulla che lo mostri o che indichi come rispondere.

## What should happen

Il Model dice che il round di domande apre sempre il pannello, da Chiuso, in primo piano sul Diagramma, con il round sopra. Non prevede il caso in cui non ci sia un progetto da mostrare.

## Fix options

### Rispondere subito che il round non è disponibile

Il round viene chiuso senza risposta e l'agente riceve subito l'esito che Trama non è disponibile, così non aspetta all'infinito. Il developer non vede nulla nel pannello e deve ripetere la domanda quando il progetto torna. Costa una risposta negativa in più da gestire nell'agente.

### Avvisare nell'editor e offrire di inizializzare

Compare un avviso nell'editor con la domanda in attesa e il pulsante per inizializzare il progetto; scelto quello, il pannello si apre con il round sopra. L'agente aspetta, senza perdere la domanda. Costa un nuovo avviso e un percorso da coprire nel Model e nei test.

### Descrivere il caso nel Model e lasciare il codice

Il Model registra che senza progetto il pannello non si apre e il round resta in attesa, con un avviso di apertura manuale al ritorno del progetto. Il codice resta com'è e nessun comportamento cambia. Costa che la domanda può restare ferma senza che il developer lo noti, finché non riapre il pannello.

## Where in the code

extension/src/host/controller.ts (revealForQuestions); extension/src/host/question-session.ts (present, reveal)
