---
refs:
  - focus
  - requirements/rules#focus
---
# Passi del focus per Actor

Nel Diagramma ogni elemento del focus appartiene al livello a cui porta un link a lui:

- un Actor o un suo Evento al livello di quell'Actor, oppure alla radice (il livello del Sistema) se i suoi Eventi non arrivano a nessuna Machine;
- una Feature al livello della Feature stessa, dove tutte le sue Machine contano come elementi del focus e la vista si adatta a loro;
- una Machine o un suo Evento al livello della sua Feature; uno Stato o una Transizione al livello della sua Machine, come oggi.

Nessun elemento appartiene al livello Whole System. I passi seguono l'ordine del Modello: prima la radice, poi i livelli degli Actor nell'ordine del Modello, poi le Feature nel loro ordine, ciascuna seguita dalle sue Machine. Il pulsante View on diagram, i chip e i passi aprono questi livelli; un pulsante View compare solo quando ne risulta almeno un passo.
