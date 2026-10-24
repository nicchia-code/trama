---
status: approved
base:
  agent-launching/omp-chat-conversation.md: 309d21064336b7b2cc282cccb88860d6cccd97c84bec52becaf39e044b359eda
  requirements/ui/omp-chat-conversation.md: ef919ac9da7235ea9d83bbc935de458d8a6f98380a0616b42cddea915bac1730
  requirements/tech/omp-chat-conversation.md: 7c14d4367be6baedc0d84dd5b1e6885b30a237702f17673e9456e303e7788a91
delete: []
created: 2026-10-24T13:17:52.907Z
label: Chiamate fisse
---
# Chiamate non cliccabili

In omp Chat (General e conversazioni dei lavori) ogni chiamata a uno strumento, per esempio «Writing tasks», si apre con un clic per mostrarne l'esito, e il percorso sotto una modifica apre il file nell'editor. Il developer trova queste funzioni inutili: le righe delle chiamate devono essere solo da leggere.

## Decisioni

- Le righe delle chiamate non si cliccano più: icona, titolo e stato, nessun esito da espandere.
- Una chiamata fallita mostra sotto la riga, nel colore di errore, la prima riga dell'errore di omp, così il fallimento resta leggibile senza clic.
- Una modifica mostra ancora il percorso del file sotto la riga, come testo semplice che non apre nulla.
- Restano come oggi: il blocco `Thinking`, l'allegato dell'istruzione, il riquadro `Plan`, i moduli e le richieste di permesso.

## Assunzioni da verificare

- Il messaggio della vista che apriva un file modificato sparisce, perché non lo usa più nessuno.
- Il percorso, la riga di errore e il titolo si possono ancora selezionare e copiare come testo.
