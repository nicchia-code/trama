---
column: done
technical: false
refs:
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - agent-terminal/No agent terminal/proposal.APPROVED
  - requirements/tech#agent-terminal
  - requirements/rules#agent-terminal
  - requirements/quality#cursor-chat
drift: null
proposal: "0033"
agent: false
---
# Considerare inviata la chat di Cursor quando composer.createNew non lancia un errore e togliere il controllo dei dieci secondi

In Cursor, il primo passo della consegna alla chat (la chat nuova che invia da sola) è riuscito ogni volta che Cursor non segnala un errore, anche se non restituisce nulla, come fa sempre dalla versione 3.23.12. Quando è finito:

- Alla fine di un turno o dopo un pulsante non compare più la conferma «Create chat with prompt» con lo stesso prompt: il deeplink e poi gli appunti si usano solo se il comando manca o fallisce.
- La scansione automatica dopo l'approvazione parte da sola e non mostra «Scan now» quando la chat nuova è stata creata senza errori; «Scan now» resta solo per il ripiego.
- Dopo una consegna riuscita Trama non aspetta più che la chat riporti il prompt e non mostra più l'avviso dopo dieci secondi.
- I test del launcher di Cursor coprono il caso in cui il comando non restituisce nulla.
