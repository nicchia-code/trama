---
column: done
technical: false
refs:
  - team
  - requirements/rules#team
drift: null
proposal: n712hx77
agent: false
created: 2026-10-26T12:54:32.956Z
finished: 2026-10-26T13:02:28.370Z
---
# Carico degli handoff aperti

Quando la skill `trama-handoff` pianifica un handoff nuovo (o lo rielabora, lo divide con Split o lo riorganizza con Replan), il carico di ogni persona in uno sprint deve contare sia il lavoro già su GitHub sia le issue degli altri handoff ancora in attesa del Manager. Oggi la skill legge il carico solo con `gh` dagli item aperti del GitHub Project collegato, e handoff scritti uno dopo l'altro sovraccaricano le stesse persone negli stessi sprint.

Quando il lavoro è fatto:

- La skill (`skills/trama-handoff/SKILL.md` e la sua copia `.agents/skills/trama-handoff/SKILL.md`, incorporata nel binario da `src/cli/skills.ts`), oltre a team (`trama team show`), campi e iterazioni (`trama issue fields`) e issue aperte con `gh`, legge le issue degli altri handoff aperti con `trama proposal list` e `trama proposal show <id>`.
- Il carico di una persona in uno sprint è la somma delle stime degli item aperti del Project collegato assegnati a lei in quello sprint (come in `rules#issue/Published`) e delle issue degli altri handoff aperti assegnate a lei in quello sprint, ciascuna con i valori del Manager applicati (il valore in `manager` prevale su quello dell'agente). Gli handoff in Draft non contano.
- Con questo carico la skill sceglie, come già fa, l'assegnatario (competenze, livello, chi ha toccato i file con `git log`, carico), il revisore e il primo sprint, dal corrente in poi, in cui l'assegnatario ha spazio date capacità e assenze e le dipendenze sono rispettate.
- La regola «Rework with feedback, Split and Replan use the same skill» compare nella skill: Replan segue `rules#developer.REPLAN_HANDOFFS` (il suo comportamento è realizzato dal Task del pulsante Replan).
- Il testo della Feature `team` descrive questo carico e il pulsante Replan prima dell'approvazione; per le issue pubblicate Trama continua solo a segnalare, e il Manager ripianifica a mano su GitHub. `README.md`, `extension/README.md` e `docs/` dicono che il piano di un handoff tiene conto degli altri handoff aperti.
