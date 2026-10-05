---
column: done
technical: true
refs:
  - requirements/tech#General
  - requirements/tech#question-round
drift: null
proposal: null
agent: false
created: 1970-01-01T00:00:00.107Z
---
# Smettere di registrare gli strumenti nell'API dei modelli di VS Code

L'estensione non registra più strumenti per i modelli linguistici dell'editor: Copilot, Cursor e ogni altro agente usano Trama solo dalla riga di comando.

- Il manifest dell'estensione non dichiara più `languageModelTools` e la compilazione non li genera.
- Le domande dell'agente arrivano ancora all'editor attraverso il canale locale dell'utente usato da `trama ask`: Quick Pick, coda per finestra, Indietro, Altro e salti non cambiano.
- Il pacchetto `.vsix` e il motore `^1.95.0` restano com'è.
