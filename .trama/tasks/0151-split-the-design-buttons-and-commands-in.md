---
column: done
technical: false
refs:
  - design-request
  - requirements/ui#design-request
  - requirements/rules#agent-terminal
drift: null
proposal: "0031"
agent: false
---
# Split the design buttons and commands into Quick request and Design

Le richieste di design hanno due ingressi distinti ovunque oggi c'è «Design…».

- Nelle barre del Diagram, della Board e dei Requirements due pulsanti affiancati: «Quick request…» (tooltip «Ask an agent to design a change in one line») apre la casella di una riga di oggi, ora intitolata «Quick Design Request», e manda «Use the trama-design skill. <richiesta>» come prima; «Design…» (tooltip «Write a design request in Markdown and send it to an agent») apre il documento della richiesta scritta.
- Nella palette i comandi sono «Trama: Quick Design Request…» e «Trama: Design…»; «Trama: Design with Agent…» non esiste più.
- I testi che rimandano a «Design…» (per esempio il suggerimento del Model vuoto) restano coerenti con il nuovo significato.
