---
column: done
technical: false
refs:
  - agent-terminal.INSTRUCTION_SENT
  - notice/Waiting/agent-terminal.INSTRUCTION_SENT
  - agent-terminal/No agent terminal/developer.ASK_AGENT
  - requirements/rules#notice
  - requirements/rules#agent-terminal
drift: null
proposal: b3982601
agent: false
created: 1970-01-01T00:00:00.122Z
---
# Emettere INSTRUCTION_SENT e annullare gli avvisi sulla fine del comando

Ogni volta che Trama scrive davvero un'istruzione in un terminale per l'agente, da un bottone, da una scansione automatica o dal rifacimento di una Proposal obsoleta, tutti gli avvisi sulla fine del comando ancora in attesa, di tutti i terminali, sono annullati e non partono, perché il developer ha già rimesso al lavoro l'agente. Un'istruzione non inviata (richiesta vuota, comando dell'agente non scelto, richiesta rifiutata) o mandata alla chat non annulla nulla. Gli avvisi su una domanda non sono toccati.
