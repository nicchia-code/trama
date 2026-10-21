---
column: done
technical: false
refs:
  - panel
  - developer.ASK_AGENT
  - requirements/ui#panel/Get Started
  - requirements/ui#panel/Diagram
drift: null
proposal: rf3glz8b
agent: false
created: 2026-10-21T13:01:42.906Z
finished: 2026-10-21T13:23:32.633Z
---
# Ingressi del wizard nel pannello

Il pannello porta il developer al wizard di setup da ogni ingresso previsto dalla Machine `panel`.

Quando il Task è finito:
- In una cartella senza progetto la scheda Get Started è il wizard di setup in modo primo setup, con l'avviso dei file di Trama in cima a ogni passo; passare a Settings e tornare non fa perdere le scelte. La conferma riuscita porta al Diagramma del nuovo progetto; un rifiuto della sovrascrittura non mostra nulla; un fallimento mostra il motivo nel riepilogo.
- In un progetto la scheda Settings ha in cima il pulsante Guided setup, che apre il wizard in modo impostazioni al posto del modulo; Cancel o la conferma riuscita riportano al modulo.
- Con il Modello vuoto i pulsanti Import from Code e Start from Scratch del Diagramma, con i tooltip nuovi, aprono il wizard nella scheda Settings in modo Modello vuoto con quel percorso già scelto, senza inizializzare né lanciare nulla; conferma riuscita e Cancel riportano al Diagramma.
- Il comando Import from Code in un progetto con il Modello vuoto apre (o porta in primo piano) il pannello sulla scheda Settings con il wizard in modo Modello vuoto e Import from Code già scelto; con un Modello non vuoto lancia l'import come prima, senza esclusioni.
- Le altre transizioni del pannello (cambio di scheda, focus, ritorno a Get Started quando la cartella smette di essere un progetto, passaggio al Diagramma quando lo diventa da fuori) continuano a valere con il wizard aperto.
