---
column: done
technical: false
refs:
  - notice/Waiting
  - notice/Waiting/question-round.ROUND_CLOSED
  - question-round/Queued/question-round.ROUND_CLOSED
  - question-round/Asking
  - question-round.ROUND_CLOSED
  - requirements/rules#notice
  - requirements/data#notice
  - requirements/ui#notice
  - requirements/tech#notice
drift: null
proposal: b3982601
agent: false
created: 1970-01-01T00:00:00.120Z
---
# Far nascere l'avviso su una domanda quando il round viene presentato e annullarlo alla chiusura

Con un argomento ntfy indicato in quel momento, quando un round chiesto da un agente di un terminale di Trama diventa quello presentato nella sua finestra (non quando è in coda: un round in coda ne fa nascere uno solo quando arriva il suo turno) nasce un solo avviso su una domanda, qualunque sia il numero di domande. I dieci secondi partono da lì e non ripartono con una risposta, un salto o un ritorno indietro. Se il round si chiude prima, perché risposto, saltato del tutto o abbandonato dall'agente, l'avviso è annullato e non parte. Quando parte mostra la domanda che il developer ha davanti in quel momento, anche se sta scrivendo una risposta libera o confermando un salto, con la sua posizione nel round; se il round è già chiuso a quel punto non parte. Un'impostazione fatta mentre un round è già aperto non genera avvisi su di esso. Una finestra persa o chiusa non manda nulla. L'avviso non cambia nulla nel round e non ne rallenta la presentazione.
