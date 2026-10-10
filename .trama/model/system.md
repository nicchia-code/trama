# Trama

A tool for programming from a visual and textual Model of every state a software system can be in, plus the Requirements that say how it must be built. A developer reviews and decides on changes to the Model; a coding agent explores the Model, proposes changes, compares it with the code and implements the work it produces. Trama non chiama mai un modello linguistico, non legge mai il codice del developer e non manda mai nulla fuori dalla macchina: lo fa l'agente, senza eccezioni.

The Model and the Requirements are plain files kept with the project. Changes to them are Proposals that the developer approves or rejects as a whole. Differences between code and Model become Drifts, and work for the agent becomes Tasks, all shown on a Board. The developer sees the Model as a Diagram and the Requirements as a list in an editor panel, and can start the agent's work (design, scan, implement, import) from there.

Trama is used from two surfaces that share one behaviour: a command line, which is how the agent reaches Trama, and the editor extension.
