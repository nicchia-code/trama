---
status: discarded
base:
  requirements/rules/focus.md: e583432914b898fc97f295b0b3f0121571e806ced3ce62d9a5c597bb8a96e6b8
delete: []
created: 2026-10-27T07:17:56.267Z
label: Focus Diagramma
---
# Sezioni senza elemento nel Diagramma

# Sezioni senza elemento nel Diagramma

Nel Diagramma un riferimento `requirements/<area>#<sezione>` la cui sezione non è intitolata a un elemento del Modello conta fra i riferimenti mancanti della scheda, con il testo «N not found» della barra del focus. Il Requisito `requirements/rules#focus` non dice oggi cosa succede a questi riferimenti. Questa Proposal lo dice, come il comportamento attuale del codice.

## Cambiamenti

- `requirements/rules/focus.md`, sezione `focus`: aggiunta una regola che dice che, nel Diagramma, un riferimento `requirements/<area>#<sezione>` la cui sezione non è intitolata a un elemento del Modello (tranne `General`) non è un passo e conta fra i mancanti, anche se la sezione esiste nei Requisiti disegnati.

Nessun elemento del Modello cambia.
