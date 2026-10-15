---
status: resolved
resolution: fix-code
refs:
  - requirements/rules#agent-terminal
proposal: null
task: w1ke8a2m
origin: null
critical: false
option: 1
note: null
resolvedBy: 7rgcnw9t
created: 2026-10-14T08:42:10.866Z
---
# Tracked chat instructions add a paragraph carrying the job identity

## What happens

Quando un'istruzione inviata in chat appartiene a un lavoro tracciato (Run, risoluzione, scansione), Trama aggiunge in fondo un secondo paragrafo con l'identità del lavoro, che l'agente deve passare ai comandi. Così l'istruzione nella chat di Copilot non è più su una riga. Nel terminale l'identità arriva dall'ambiente e l'istruzione resta una riga.

## What should happen

Il Requisito dice che con il terminale e con la chat di Copilot l'istruzione resta di una riga; nella chat di Cursor la seconda riga è solo quella del PATH. L'agente della chat deve comunque sapere a quale lavoro appartiene, senza spezzare la riga dell'istruzione.

## Fix options

### Put the job identity on the instruction's line

L'identità del lavoro va nella stessa riga, in una frase in fondo all'istruzione. L'istruzione resta una riga in ogni chat, e l'agente riceve lo stesso dato di prima. Costo: la riga è più lunga, e in Cursor si aggiunge alla riga del PATH, che resta su un'altra riga. Nessun comando cambia.

### Keep the paragraph and amend the Requirement

Il secondo paragrafo resta com'è. Il Requisito va riscritto per ammettere l'identità del lavoro in un secondo paragrafo nella chat di Copilot. Nessun cambio di codice né di comportamento. Costo: la regola «una riga» non vale più per i lavori tracciati, e chi verifica il Requisito deve distinguerli.

## Where in the code

extension/src/host/agent.ts (launchAgent, ramo chat)
