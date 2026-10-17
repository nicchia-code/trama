---
technical: false
refs:
  - design-request/Writing/developer.ASK_AGENT
---
# Titolo della richiesta sul ghost in Active con qualunque launcher

Quando il developer preme Send to agent su una richiesta di design non vuota e l'istruzione parte davvero, Trama salva la richiesta, manda l'istruzione che la nomina verso l'agente con il launcher scelto e chiude la scheda, come oggi. Cambia il ghost: con qualunque launcher, sia il terminale sia una chat dell'editor (Cursor, Copilot), il ghost disegnato in Active prende il titolo della richiesta, perché Trama annuncia il lavoro al momento del lancio passando quel titolo. Oggi il titolo arriva solo con il launcher del terminale: va tolto il ramo che lo limita al terminale, senza percorsi alternativi per la chat.

Se il testo è vuoto o fatto solo di spazi, o l'istruzione non parte (per esempio il developer annulla la scelta dell'agente), non si invia nulla, nessun ghost compare e la scheda resta aperta; per il testo vuoto il developer è avvisato che deve prima scrivere la richiesta.

Aggiornare i test del lancio delle richieste di design perché coprano il titolo del ghost anche con il launcher della chat.
