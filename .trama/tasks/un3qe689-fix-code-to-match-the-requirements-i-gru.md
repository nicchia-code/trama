---
column: done
technical: true
refs:
  - requirements/tech#task
  - requirements/rules#task
  - requirements/quality#task
drift: ond2ib1i
proposal: null
agent: false
created: 2026-10-10T14:15:26.935Z
finished: 2026-10-10T17:35:56.861Z
---
# Fix code to match the Requirements: I gruppi paralleli di Task restano limitati a quattro

## What happens

Le corse ricevono gruppi di **al massimo quattro Task** eseguibili che riguardano cose diverse, indipendentemente dal limite dei sotto-agenti comunicato nell’istruzione. Il comando che chiede il gruppo non accetta `--max`; anche le istruzioni della skill di implementazione prescrivono quattro sotto-agenti e chiedono i gruppi senza il limite. Un limite minore non riduce il gruppo e uno maggiore non permette un gruppo più ampio.

## What should happen

La corsa deve chiedere gruppi fino al limite comunicato con `trama.maxParallelAgents`, passando lo stesso valore a `trama task next --batch --max <N>`. Senza `--max` il comando usa **20**; un valore non intero o minore di uno è un errore d’uso. Restano invariati ordine dal più vecchio, esclusione dei Task bloccati e dei Task che riguardano la stessa cosa, attesa della fine di tutto il gruppo e lavoro sequenziale senza sotto-agenti.

## Chosen option

**Propagare il limite nella scelta dei gruppi**

Usare il limite dell’istruzione per scegliere direttamente ogni gruppo e per assegnare i suoi Task ai sotto-agenti. Il comando accetta il limite, usa venti quando manca e rifiuta i valori non validi; la corsa aspetta tutto il gruppo prima del successivo. Richiede di allineare il comando, la scelta condivisa dei Task e le istruzioni della corsa, senza cambiare ordine o blocchi.

## Where in the code

src/core/work.ts: BATCH_MAX e nextTask; src/cli/commands.ts: task next senza opzione max; src/cli/work.ts: taskNextView; skills/trama-implement/SKILL.md: passi 1 e 5, e la copia installata in .agents/skills/trama-implement/SKILL.md.
