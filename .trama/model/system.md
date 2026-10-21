# Trama

A tool for programming from a visual and textual Model of every state a software system can be in, plus the Requirements that say how it must be built. A developer reviews and decides on changes to the Model; a coding agent explores the Model, proposes changes, compares it with the code and implements the work it produces. Trama non chiama mai un modello linguistico, non legge mai il codice del developer e non manda mai nulla fuori dalla macchina: lo fa l'agente, senza eccezioni.

Il Modello e i Requisiti sono file del progetto. Le modifiche vengono proposte e approvate o rifiutate dal developer. Le differenze fra codice e Modello diventano Drift e il lavoro diventa Task, tutti sulla Board. Diagramma, Board e Requisiti permettono di esaminare il progetto e avviare design, scansioni, implementazione e import.

Trama is used from two surfaces that share one behaviour: a command line, which is how the agent reaches Trama, and the editor extension.
