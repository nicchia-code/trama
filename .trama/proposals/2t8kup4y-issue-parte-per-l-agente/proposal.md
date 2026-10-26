---
status: approved
base:
  team/issue.md: 6e09647b0beb2be97b3561b4305ed7fa43ef7a20d5de5d9430193e95687ec8cd
  requirements/rules/handoff.md: 9d423313299d0a39d566fd3c140d60eead6f3d2cfb9e1c2a883e64d6a005914b
delete: []
request: 2026-10-26T13-17-36
created: 2026-10-26T12:23:11.677Z
label: issue body
---
# Issue: parte per l'agente

In Manager mode si dà per scontato che le persone del team lavorino con un agente di programmazione. Il corpo di ogni issue resta con gli stessi contenuti, ma diviso: prima la parte per la persona, poi una parte ben etichettata per l'agente, con il contesto tecnico.

## Decisioni
- Parte per la persona: tutto ciò che serve a capire il lavoro (`Context`, `Current behaviour`, `Expected behaviour`, `Acceptance criteria`, `Out of scope`, `How to verify`).
- Parte per l'agente: la parte tecnica (`Where in the code`, file, citazioni di codice, `State diagram`, `Suggested steps` per il junior, vincoli e contesto puramente per l'agente).
- La divisione la scrive l'agente seguendo la regola; nessun cambio al formato dei file delle issue né alla composizione del corpo da parte di Trama, nessun controllo nuovo alla consegna.
- La parte per l'agente inizia con una riga orizzontale `---` e un titolo `##` semplice, «Per l'agente», nella lingua del corpo; le sue sezioni sono `###`.
- I criteri di accettazione compaiono una sola volta, nella parte per la persona; la parte per l'agente dice di rispettarli.
- L'adattamento al livello resta com'è, in entrambe le parti; `Suggested steps` resta solo per il junior.
- Il blocco ripiegato dei riferimenti di Trama resta in fondo al corpo, come oggi.
- Il commento di aggiornamento quando il Modello cambia resta unico, breve e per la persona.
- L'anteprima nel pannello non cambia: riga e titolo sono Markdown semplice.
