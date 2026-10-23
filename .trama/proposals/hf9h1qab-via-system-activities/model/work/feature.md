# Work

The work that comes out of comparing the Model with the code, shown on the Board. Un Task o un Drift nuovo non prende l'identità da un contatore condiviso: ne ha una propria, così due branch che lo creano non si assegnano la stessa. A Task is a unit of work for the agent that the developer can see and ask the agent to run, but not move on the Board. A Drift is a difference between code and Model, or between code and Requirements, that only the developer can decide on. While the agent is preparing a card, an announcement lets the Board show a ghost of it in the card's column; what the agent is doing without a card to deliver shows as a ghost in the editor's status bar.

Il lavoro finito non resta sulla Board come Task: alla fine di ogni corsa l'agente lo racconta in voci di History, una per macro-funzionalità, che la colonna History mostra con la loro data.

Le decisioni sui Drift restano del developer: nessuna risoluzione si prepara, si approva o si realizza da sola.

Ogni Task e ogni Drift vivo ha, accanto all'identità permanente, un numero breve temporaneo (`T3`, `D3`) per leggerlo e citarlo a colpo d'occhio: è locale a ogni copia di lavoro e si libera quando la scheda si chiude. Un Task che fa parte di un design lo tiene finché non è finito tutto il design.

Ogni scansione, anche quella alla fine di una corsa di implementazione, confronta direttamente ogni Machine del suo ambito con il codice, senza smistamento né classificatore: quando ci sono sotto-agenti, ciascuno riceve una Machine e la confronta a fondo con il Modello e i Requisiti che la riguardano; senza sotto-agenti la scansione le confronta una alla volta. Una Machine senza differenze non produce né Task né Drift. Il resoconto della scansione dice quante Machine sono state confrontate e quante hanno prodotto Task o Drift.
