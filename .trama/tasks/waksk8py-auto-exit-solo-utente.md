---
column: done
technical: true
refs:
  - requirements/quality#agent-launching
  - requirements/tech#agent-launching
drift: null
proposal: ijuvpwzo
agent: false
created: 2026-10-24T18:27:29.608Z
finished: 2026-10-24T18:32:06.584Z
---
# autoExit solo dall'utente

`trama.autoExit` si legge solo dalle impostazioni utente, come dicono i Requisiti: oggi `extension/src/host/agent.ts` lo legge con `settings().get<boolean>("autoExit", true)`, che accetta anche un valore delle impostazioni del workspace o della cartella.

Quando il Task è finito, ogni lettura di `trama.autoExit` in `agent.ts` (la frase di fine breve dell'istruzione, la chiusura del terminale dopo il riposo o la fine del comando, e la richiamata `autoExit` passata a `OmpConversations`) usa una sola funzione che legge il valore utente come le altre impostazioni utente del file (`inspect("autoExit")?.globalValue`): acceso quando il valore utente manca o non è `false`, spento solo con `false` nelle impostazioni utente. Un `false` scritto nelle impostazioni del workspace è ignorato. Un test prova che un valore del workspace non spegne l'auto exit.
