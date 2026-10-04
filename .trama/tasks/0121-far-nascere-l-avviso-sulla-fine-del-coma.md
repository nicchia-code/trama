---
column: done
technical: false
refs:
  - agent-terminal/Agent running/terminal.COMMAND_ENDED
  - notice/Waiting
  - notice/Sending
  - requirements/rules#notice
  - requirements/data#notice
  - requirements/ui#notice
  - requirements/tech#agent-terminal
drift: null
proposal: "0027"
agent: false
---
# Far nascere l'avviso sulla fine del comando dell'agente con l'esito e il riepilogo della Board

Con un argomento ntfy indicato in quel momento, quando finisce il comando che Trama ha scritto in un terminale dell'agente nasce un avviso sulla fine, con l'esito che il terminale riporta: finito bene, finito con errore e relativo codice, oppure non riportato. La fine di un altro comando, una fine senza la riga di comando di Trama e la chiusura del terminale non generano nulla; due comandi che finiscono in due terminali diversi generano due avvisi. Con la chat come launcher, o con un agente avviato a mano, non nasce nulla. I dieci secondi partono dalla fine del comando. Quando l'avviso parte il testo riassume la Board di quel momento: da decidere (Proposal aperte, mai quelle in scrittura, più Drift aperti), Task in To do e Task in In progress. Un'impostazione fatta dopo che il comando è finito non genera avvisi su di esso.
