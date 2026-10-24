---
technical: false
refs:
  - work
  - requirements/tech#work
---
# Unioni come ordini

La skill distribuita `trama-implement`, nella parte Parallel execution, registra ogni unione del piano (due gruppi affidati a un solo sotto-agente, uno dopo l'altro) anche come ordini. Per ogni Task che nell'unione parte dopo un altro, l'agente principale lancia `trama timing new --input -` con `{"kind":"order","tasks":["<Task che parte dopo>","<Task che lo precede>"],"reason":"<motivo dell'unione>"}`, in un heredoc. Fa lo stesso per i Task di un gruppo che il piano affida a un solo sotto-agente in un ordine dato.

Lo scopo è che la catena di un sotto-agente entri nel piano che legge la stima di Run all. Oggi le unioni finiscono in scelte `release`, con l'ordine scritto solo nel motivo, e la stima le perde.

Le altre registrazioni del piano (vie libere, divisioni, ordini, conflitti) non cambiano, e la sezione "Parallel choices" del resoconto elenca le unioni come prima. Il comando `trama timing new` e il suo controllo dell'input non cambiano.

Cambia il testo della skill nella sua sorgente distribuita, cioè quella che `trama project new` e `trama project edit` installano, non la copia installata in `.agents/skills/`.
