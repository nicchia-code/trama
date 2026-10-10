---
column: done
technical: false
refs:
  - panel/Open
  - requirements/ui#panel
drift: null
proposal: o3h29jss
agent: false
created: 2026-10-10T12:54:18.621Z
finished: 2026-10-10T14:36:29.400Z
---
# Mostrare i Task finiti sui pulsanti di scansione globale

Il quadro del pannello deve includere il numero corrente di Task finiti dall’ultimo scan globale di questa copia di lavoro, ricavato dal conteggio previsto per i Task. Ogni quadro aggiorna Board e Diagramma anche quando la scheda è nascosta; un cambiamento del solo ricordo dello scan deve aggiornare ugualmente il numero. Con N maggiore di zero, il pulsante globale della Board mostra `Scan System · N` e quello del Diagramma a livello Sistema mostra `Scan · N`. Il tooltip è `N Tasks finished since the last scan of the System`, con `1 Task finished since the last scan of the System` al singolare, e il nome accessibile ripete etichetta e tooltip. Con N uguale a zero si mantengono le etichette senza numero. Il pulsante del Diagramma che scansiona una Feature non mostra il numero. Questo Task riguarda il quadro e la presentazione nel pannello, non la persistenza del ricordo né il calcolo del conteggio.
