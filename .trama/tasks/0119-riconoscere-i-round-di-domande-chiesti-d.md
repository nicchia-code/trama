---
column: done
technical: false
refs:
  - question-round
  - notice/Waiting
  - requirements/rules#notice
  - requirements/tech#question-round
drift: null
proposal: "0027"
agent: false
---
# Riconoscere i round di domande chiesti da un agente di un terminale di Trama

Quando un round di domande arriva alla finestra dell'editor, la finestra sa se l'ha chiesto un agente che gira in un terminale avviato da Trama (quello a cui Trama ha dato l'indirizzo della finestra) oppure un altro agente, che la finestra raggiunge solo perché è quella aperta sullo stesso progetto più recente. Solo il primo caso può dare un avviso; un round chiesto da qualunque altro agente, dalla chat o da un agente avviato a mano non ne genera mai. Il riconoscimento non cambia come il round viene instradato, accodato, presentato o chiuso, e non porta nelle domande né nelle risposte nulla di più di quanto già portano.
